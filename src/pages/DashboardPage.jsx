import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow, subHours } from 'date-fns'
import {
  Package, AlertTriangle, Truck, ArrowRightLeft, Activity,
  ClipboardList, Clock, ArrowRight, ShoppingCart,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // KPIs
  const [totalProducts, setTotalProducts] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [pendingReceipts, setPendingReceipts] = useState(0)
  const [pendingDeliveries, setPendingDeliveries] = useState(0)
  const [recentMovesCount, setRecentMovesCount] = useState(0)

  // Operations widgets
  const [receiptsBreakdown, setReceiptsBreakdown] = useState({ late: 0, waiting: 0, ready: 0, total: 0 })
  const [deliveriesBreakdown, setDeliveriesBreakdown] = useState({ late: 0, waiting: 0, ready: 0, total: 0 })

  // Chart
  const [stockChart, setStockChart] = useState([])

  // Activity
  const [activityLog, setActivityLog] = useState([])

  // Low stock products for banner
  const [lowStockProducts, setLowStockProducts] = useState([])

  // Filters
  const [statusFilter, setStatusFilter] = useState('All')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [warehouses, setWarehouses] = useState([])

  // Chart component (lazy loaded)
  const [RechartsReady, setRechartsReady] = useState(false)
  const [RechartsModules, setRechartsModules] = useState(null)

  useEffect(() => {
    import('recharts').then((mod) => {
      setRechartsModules(mod)
      setRechartsReady(true)
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)

    // KPIs
    const [
      { count: prodCount },
      { data: stockData },
      { data: receiptData },
      { data: deliveryData },
      { count: movesCount },
      { data: chartData },
      { data: logData },
      { data: whData },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('stock').select('on_hand, product_id, products(name, sku, min_stock_threshold)'),
      supabase.from('receipts').select('id, status, schedule_date'),
      supabase.from('deliveries').select('id, status, schedule_date'),
      supabase.from('moves').select('*', { count: 'exact', head: true })
        .gte('created_at', subHours(new Date(), 24).toISOString()),
      supabase.from('stock').select('on_hand, products(name, min_stock_threshold)').order('on_hand', { ascending: false }).limit(10),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('warehouses').select('id, name').order('name'),
    ])

    setTotalProducts(prodCount || 0)
    setRecentMovesCount(movesCount || 0)
    setWarehouses(whData || [])
    setActivityLog(logData || [])

    // Low stock
    const lowItems = (stockData || []).filter((s) =>
      s.on_hand <= (s.products?.min_stock_threshold ?? 5)
    )
    setLowStockCount(lowItems.length)
    setLowStockProducts(lowItems.map((s) => ({
      product_id: s.product_id,
      name: s.products?.name,
      sku: s.products?.sku,
      on_hand: s.on_hand,
      threshold: s.products?.min_stock_threshold ?? 5,
    })))

    // Pending receipts/deliveries
    const today = format(new Date(), 'yyyy-MM-dd')
    const pendR = (receiptData || []).filter((r) => ['Draft', 'Ready'].includes(r.status))
    setPendingReceipts(pendR.length)
    setReceiptsBreakdown({
      late: (receiptData || []).filter((r) => r.schedule_date < today && r.status !== 'Done' && r.status !== 'Canceled').length,
      waiting: (receiptData || []).filter((r) => r.status === 'Draft').length,
      ready: (receiptData || []).filter((r) => r.status === 'Ready').length,
      total: pendR.length,
    })

    const pendD = (deliveryData || []).filter((d) => ['Draft', 'Waiting', 'Ready'].includes(d.status))
    setPendingDeliveries(pendD.length)
    setDeliveriesBreakdown({
      late: (deliveryData || []).filter((d) => d.schedule_date < today && d.status !== 'Done' && d.status !== 'Canceled').length,
      waiting: (deliveryData || []).filter((d) => d.status === 'Draft' || d.status === 'Waiting').length,
      ready: (deliveryData || []).filter((d) => d.status === 'Ready').length,
      total: pendD.length,
    })

    // Chart
    setStockChart((chartData || []).map((s) => ({
      name: s.products?.name || '?',
      on_hand: s.on_hand,
      low: s.on_hand <= (s.products?.min_stock_threshold ?? 5),
    })))

    setLoading(false)
  }

  const kpiCards = [
    { icon: ShoppingCart, label: 'Total Products', value: totalProducts, color: 'text-blue-600 bg-blue-50', onClick: () => navigate('/products') },
    { icon: AlertTriangle, label: 'Low / Out of Stock', value: lowStockCount, color: 'text-red-600 bg-red-50', onClick: () => navigate('/stock') },
    { icon: Truck, label: 'Pending Receipts', value: pendingReceipts, color: 'text-indigo-600 bg-indigo-50', onClick: () => navigate('/operations/receipts') },
    { icon: ArrowRightLeft, label: 'Pending Deliveries', value: pendingDeliveries, color: 'text-amber-600 bg-amber-50', onClick: () => navigate('/operations/deliveries') },
    { icon: Activity, label: 'Moves (24h)', value: recentMovesCount, color: 'text-green-600 bg-green-50', onClick: () => navigate('/move-history') },
  ]

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Smart Reorder Alert Banner ── */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            ⚠ {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's are' : ' is'} low on stock
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.product_id} className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">({p.on_hand}/{p.threshold})</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => navigate('/operations/receipts/new', { state: { prefillProduct: p.product_id } })}
                >
                  Create Receipt
                </Button>
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <Button size="sm" variant="ghost" onClick={() => navigate('/stock')}>
                +{lowStockProducts.length - 5} more
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            onClick={card.onClick}
            className="cursor-pointer rounded-lg border p-4 hover:shadow-md transition-shadow space-y-2"
          >
            <div className={cn('inline-flex rounded-lg p-2', card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">{statusFilter}</SelectTrigger>
          <SelectContent>
            {['All', 'Draft', 'Waiting', 'Ready', 'Done'].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-44">
            {warehouseFilter === 'all' ? 'All Warehouses' : warehouses.find((w) => w.id === warehouseFilter)?.name}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Operations Widgets ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receipts */}
        <div className="rounded-lg border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Truck className="h-5 w-5 text-indigo-600" /> Receipts</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/operations/receipts')}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-red-600">{receiptsBreakdown.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-600">{receiptsBreakdown.waiting}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{receiptsBreakdown.ready}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{receiptsBreakdown.total} to receive</p>
        </div>

        {/* Deliveries */}
        <div className="rounded-lg border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-amber-600" /> Deliveries</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/operations/deliveries')}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-red-600">{deliveriesBreakdown.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-600">{deliveriesBreakdown.waiting}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{deliveriesBreakdown.ready}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{deliveriesBreakdown.total} to deliver</p>
        </div>
      </div>

      {/* ── Stock Chart ── */}
      <div className="rounded-lg border p-5 space-y-3">
        <h3 className="font-semibold">Top 10 Products by Stock</h3>
        {RechartsReady && RechartsModules && stockChart.length > 0 ? (
          <RechartsModules.ResponsiveContainer width="100%" height={300}>
            <RechartsModules.BarChart data={stockChart}>
              <RechartsModules.CartesianGrid strokeDasharray="3 3" />
              <RechartsModules.XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <RechartsModules.YAxis />
              <RechartsModules.Tooltip />
              <RechartsModules.Bar dataKey="on_hand" name="On Hand">
                {stockChart.map((entry, idx) => (
                  <RechartsModules.Cell
                    key={idx}
                    fill={entry.low ? '#ef4444' : '#22c55e'}
                  />
                ))}
              </RechartsModules.Bar>
            </RechartsModules.BarChart>
          </RechartsModules.ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {stockChart.length === 0 ? 'No stock data yet.' : 'Loading chart…'}
          </p>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-lg border p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" /> Recent Activity
        </h3>
        {activityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {activityLog.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div>
                  <span className="font-medium">{a.action}</span>
                  {a.entity_type && (
                    <span className="text-muted-foreground ml-1">({a.entity_type})</span>
                  )}
                  <span className="text-muted-foreground ml-2">
                    · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
