import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ClipboardCheck, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

export default function AdjustmentsPage() {
  const { user } = useAuthStore()
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [recentMoves, setRecentMoves] = useState([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [currentStock, setCurrentStock] = useState(null)
  const [newQty, setNewQty] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const userName = user?.user_metadata?.full_name || user?.email || ''

  // ── Fetch ──
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, sku, unit_of_measure').order('name')
    setProducts(data || [])
  }

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('id, name').order('name')
    setLocations(data || [])
  }

  const fetchRecentAdjustments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('moves')
      .select('*, products(name), locations:to_location_id(name), profiles:performed_by(full_name)')
      .eq('type', 'ADJUSTMENT')
      .order('created_at', { ascending: false })
      .limit(20)
    setRecentMoves(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    fetchLocations()
    fetchRecentAdjustments()
  }, [])

  // Fetch current stock when product + location selected
  useEffect(() => {
    if (!productId || !locationId) { setCurrentStock(null); return }
    const fetch = async () => {
      const { data } = await supabase
        .from('stock')
        .select('on_hand')
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .maybeSingle()
      setCurrentStock(data?.on_hand ?? 0)
    }
    fetch()
  }, [productId, locationId])

  const selectedProduct = products.find((p) => p.id === productId)

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId || !locationId) { toast.error('Select product and location'); return }
    const counted = parseInt(newQty, 10)
    if (isNaN(counted) || counted < 0) { toast.error('Enter a valid quantity'); return }

    setSubmitting(true)
    const diff = counted - (currentStock ?? 0)

    // Update stock
    const { data: existing } = await supabase
      .from('stock')
      .select('id')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .maybeSingle()

    if (existing) {
      await supabase.from('stock').update({ on_hand: counted, free_to_use: counted }).eq('id', existing.id)
    } else {
      await supabase.from('stock').insert({ product_id: productId, location_id: locationId, on_hand: counted, free_to_use: counted })
    }

    // Insert move
    await supabase.from('moves').insert({
      type: 'ADJUSTMENT',
      product_id: productId,
      to_location_id: locationId,
      quantity: diff,
      reference_no: reason || 'Stock adjustment',
      performed_by: user?.id,
    })

    const sign = diff >= 0 ? '+' : ''
    toast.success(`Stock adjusted. Difference: ${sign}${diff}`)

    // Reset
    setNewQty('')
    setReason('')
    setCurrentStock(counted)
    fetchRecentAdjustments()
    setSubmitting(false)
  }

  const getProductName = (id) => products.find((p) => p.id === id)?.name
  const getLocationName = (id) => locations.find((l) => l.id === id)?.name

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Stock Adjustments</h1>

      {/* ── Adjustment Form ── */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4 bg-muted/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                {selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : 'Select product'}
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>{getLocationName(locationId) || 'Select location'}</SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentStock !== null && (
          <div className="rounded-md border bg-background px-4 py-3 text-sm">
            Current stock: <strong>{currentStock}</strong> {selectedProduct?.unit_of_measure || 'pcs'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-qty">New Counted Quantity</Label>
            <Input
              id="new-qty"
              type="number"
              min="0"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Enter actual count"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-reason">Reason (optional)</Label>
            <Input
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical count correction"
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting}>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          {submitting ? 'Applying…' : 'Apply Adjustment'}
        </Button>
      </form>

      {/* ── Recent Adjustments ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Adjustments</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : recentMoves.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No adjustments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMoves.map((m) => {
                const qty = m.quantity
                const isPositive = qty >= 0
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.products?.name || '—'}</TableCell>
                    <TableCell>{m.locations?.name || '—'}</TableCell>
                    <TableCell className={cn('text-right font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                      {isPositive ? '+' : ''}{qty}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.reference_no || '—'}</TableCell>
                    <TableCell>{m.created_at ? format(new Date(m.created_at), 'dd MMM yyyy HH:mm') : '—'}</TableCell>
                    <TableCell>{m.profiles?.full_name || '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
