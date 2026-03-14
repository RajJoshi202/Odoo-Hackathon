import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import { checkAIHealth, predictDemand, getReorderRecommendation } from '@/utils/aiService'
import toast from 'react-hot-toast'
import {
  Brain, TrendingUp, AlertTriangle, Package, RefreshCw,
  CheckCircle, XCircle, Zap, ShieldAlert, ArrowUpRight,
  Loader2, BarChart3, Boxes,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

// ── Default parameters for AI calculations ──
const DEFAULT_LEAD_TIME = 5    // days
const DEFAULT_SAFETY_STOCK = 10 // units

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [aiOnline, setAiOnline] = useState(null) // null = checking, true/false
  const [insights, setInsights] = useState([])    // per-product AI results
  const [processing, setProcessing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Summary stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    needsReorder: 0,
    avgDemand: 0,
    highDemand: 0,
  })

  // ── Check AI service health ──
  useEffect(() => {
    checkAIHealth().then(setAiOnline)
  }, [])

  // ── Fetch data and run AI analysis ──
  const runAnalysis = useCallback(async () => {
    setProcessing(true)

    try {
      // 1. Fetch all products with their current stock
      const { data: stockData, error: stockErr } = await supabase
        .from('stock')
        .select('on_hand, product_id, products(id, name, sku, min_stock_threshold)')

      if (stockErr) throw stockErr

      // 2. Fetch move history to build sales data per product
      const { data: movesData, error: movesErr } = await supabase
        .from('moves')
        .select('product_id, quantity, type, created_at')
        .order('created_at', { ascending: true })

      if (movesErr) throw movesErr

      // 3. Build per-product sales history from delivery/outbound moves
      const salesByProduct = {}
      for (const move of (movesData || [])) {
        // Outgoing moves represent demand/sales
        const type = move.type?.toUpperCase()
        if (type === 'OUTBOUND' || type === 'DELIVERY' || type === 'OUT') {
          if (!salesByProduct[move.product_id]) {
            salesByProduct[move.product_id] = []
          }
          salesByProduct[move.product_id].push({ sales: Math.abs(move.quantity) })
        }
      }

      // 4. Run AI predictions for each product
      const results = []

      for (const stockItem of (stockData || [])) {
        const product = stockItem.products
        if (!product) continue

        const productSales = salesByProduct[product.id] || []
        let predicted = 0
        let reorderResult = { reorder: false, reorder_point: 0, recommended_order: 0 }
        let hasData = false

        try {
          // 1. Full AI Regression (needs >= 2 data points)
          if (productSales.length >= 2 && aiOnline) {
            const demandRes = await predictDemand(productSales)
            predicted = demandRes.predicted_daily_demand

            reorderResult = await getReorderRecommendation({
              stock: stockItem.on_hand,
              demand: predicted,
              lead_time: DEFAULT_LEAD_TIME,
              safety_stock: DEFAULT_SAFETY_STOCK,
            })
            hasData = true

          // 2. Simple Average Fallback (needs 1 data point)
          } else if (productSales.length >= 1) {
            predicted = Math.round(
              productSales.reduce((sum, s) => sum + s.sales, 0) / productSales.length
            )
            const reorderPoint = (predicted * DEFAULT_LEAD_TIME) + DEFAULT_SAFETY_STOCK
            reorderResult = {
              reorder: stockItem.on_hand <= reorderPoint,
              reorder_point: reorderPoint,
              recommended_order: stockItem.on_hand <= reorderPoint ? predicted * 30 : 0,
            }
            hasData = true

          // 3. ZERO Data: Fallback to manual threshold check
          } else {
            const threshold = product.min_stock_threshold ?? 5
            if (stockItem.on_hand <= threshold) {
              reorderResult = {
                reorder: true,
                reorder_point: threshold,
                recommended_order: threshold * 2 || 10, // basic default restock amount
              }
            }
          }
        } catch (err) {
          console.warn(`AI prediction failed for ${product.name}:`, err)
        }

        results.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: stockItem.on_hand,
          threshold: product.min_stock_threshold ?? 5,
          predictedDemand: predicted,
          reorder: reorderResult.reorder,
          reorderPoint: reorderResult.reorder_point,
          recommendedOrder: reorderResult.recommended_order,
          salesDataPoints: productSales.length,
          hasData,
        })
      }

      // Sort: items needing reorder first, then by predicted demand (descending)
      results.sort((a, b) => {
        if (a.reorder !== b.reorder) return a.reorder ? -1 : 1
        return b.predictedDemand - a.predictedDemand
      })

      setInsights(results)
      setLastUpdated(new Date())

      // Compute summary stats
      const needsReorder = results.filter(r => r.reorder).length
      const withDemand = results.filter(r => r.predictedDemand > 0)
      const avgDemand = withDemand.length
        ? Math.round(withDemand.reduce((s, r) => s + r.predictedDemand, 0) / withDemand.length)
        : 0
      const highDemand = results.filter(r => r.predictedDemand >= 10).length

      setStats({
        totalProducts: results.length,
        needsReorder,
        avgDemand,
        highDemand,
      })

    } catch (err) {
      console.error('AI analysis failed:', err)
      toast.error('Failed to run AI analysis')
    } finally {
      setProcessing(false)
      setLoading(false)
    }
  }, [aiOnline])

  useEffect(() => {
    if (aiOnline !== null) {
      runAnalysis()
    }
  }, [aiOnline, runAnalysis])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-200">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Inventory Insights</h1>
            <p className="text-sm text-muted-foreground">
              Demand forecasting & smart reorder recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Service Status Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
            aiOnline
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}>
            {aiOnline
              ? <><CheckCircle className="h-3.5 w-3.5" /> AI Service Online</>
              : <><XCircle className="h-3.5 w-3.5" /> AI Service Offline</>
            }
          </div>

          <Button
            onClick={runAnalysis}
            disabled={processing}
            className="gap-2"
          >
            {processing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              : <><RefreshCw className="h-4 w-4" /> Refresh Analysis</>
            }
          </Button>
        </div>
      </div>

      {/* ── AI Offline Warning ── */}
      {!aiOnline && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              AI Service is not reachable
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Start the AI server with: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono">
                cd inventory-ai && uvicorn main:app --reload
              </code>
              <br />
              Showing fallback calculations based on average sales data.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 space-y-1 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-2 text-blue-600">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Products Analyzed</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{stats.totalProducts}</p>
        </div>

        <div className="rounded-xl border p-4 space-y-1 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Needs Reorder</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{stats.needsReorder}</p>
        </div>

        <div className="rounded-xl border p-4 space-y-1 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Avg Daily Demand</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{stats.avgDemand}<span className="text-sm font-normal text-emerald-500"> units</span></p>
        </div>

        <div className="rounded-xl border p-4 space-y-1 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-2 text-amber-600">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">High Demand</span>
          </div>
          <p className="text-3xl font-bold text-amber-700">{stats.highDemand}<span className="text-sm font-normal text-amber-500"> products</span></p>
        </div>
      </div>

      {/* ── Reorder Alerts ── */}
      {insights.filter(i => i.reorder).length > 0 && (
        <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-red-50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="font-semibold text-red-800">Low Stock Alerts — Reorder Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.filter(i => i.reorder).map(item => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-white p-3 hover:shadow-md transition-shadow"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock: <span className="text-red-600 font-semibold">{item.currentStock}</span>
                    {' '}/ Reorder at: {item.reorderPoint}
                  </p>
                </div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 gap-1 shrink-0">
                  <ArrowUpRight className="h-3 w-3" />
                  Order {item.recommendedOrder}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Demand Forecast Table ── */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="p-5 border-b bg-gradient-to-r from-violet-50 via-white to-purple-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-100">
              <BarChart3 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold">Demand Forecast & Reorder Recommendations</h2>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {insights.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No product data available for analysis.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add products and record some stock movements to see AI insights.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-center py-3 px-4 font-medium">Current Stock</th>
                  <th className="text-center py-3 px-4 font-medium">Predicted Demand</th>
                  <th className="text-center py-3 px-4 font-medium">Reorder Point</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-center py-3 px-4 font-medium">Recommended Order</th>
                  <th className="text-center py-3 px-4 font-medium">Data Points</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((item, idx) => (
                  <tr
                    key={item.productId}
                    className={cn(
                      "border-b hover:bg-muted/20 transition-colors",
                      item.reorder && "bg-red-50/50"
                    )}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{item.name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={cn(
                        "font-semibold",
                        item.currentStock <= item.threshold ? "text-red-600" : "text-emerald-600"
                      )}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {item.hasData ? (
                        <span className="font-semibold">
                          {item.predictedDemand}
                          <span className="text-xs font-normal text-muted-foreground"> /day</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No data</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {item.hasData ? item.reorderPoint : '—'}
                    </td>
                    <td className="text-center py-3 px-4">
                      {item.reorder ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                          Reorder Now
                        </Badge>
                      ) : item.hasData ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Insufficient Data
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-4 font-semibold">
                      {item.reorder ? (
                        <span className="text-red-600">{item.recommendedOrder} units</span>
                      ) : '—'}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-xs text-muted-foreground">{item.salesDataPoints} days</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── How it Works Info Box ── */}
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-white p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-violet-500" /> How AI Forecasting Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">📊 Data Collection</p>
            <p>Sales/delivery history is analyzed per product to identify daily demand trends.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">🤖 AI Prediction</p>
            <p>Linear Regression model predicts next-day demand. Min 2 data points required.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">📦 Reorder Logic</p>
            <p>Reorder Point = (Daily Demand × {DEFAULT_LEAD_TIME} days lead) + {DEFAULT_SAFETY_STOCK} safety stock. Orders target 30-day coverage.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
