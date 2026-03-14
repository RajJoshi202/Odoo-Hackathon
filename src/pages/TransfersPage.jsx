import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { ArrowRightLeft, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/utils/utils'

export default function TransfersPage() {
  const { user } = useAuthStore()
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [productId, setProductId] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [freeToUse, setFreeToUse] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('products').select('id, name, sku, unit_of_measure').order('name').then(({ data }) => setProducts(data || []))
    supabase.from('locations').select('id, name').order('name').then(({ data }) => setLocations(data || []))
  }, [])

  // Fetch free_to_use when product + from location change
  useEffect(() => {
    if (!productId || !fromLocationId) { setFreeToUse(null); return }
    supabase
      .from('stock')
      .select('free_to_use')
      .eq('product_id', productId)
      .eq('location_id', fromLocationId)
      .maybeSingle()
      .then(({ data }) => setFreeToUse(data?.free_to_use ?? 0))
  }, [productId, fromLocationId])

  const selectedProduct = products.find((p) => p.id === productId)
  const qty = parseInt(quantity, 10) || 0
  const insufficient = freeToUse !== null && qty > freeToUse

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId) { toast.error('Select a product'); return }
    if (!fromLocationId) { toast.error('Select source location'); return }
    if (!toLocationId) { toast.error('Select destination location'); return }
    if (fromLocationId === toLocationId) { toast.error('Source and destination must differ'); return }
    if (qty < 1) { toast.error('Enter a valid quantity'); return }
    if (insufficient) { toast.error('Insufficient stock'); return }

    setSubmitting(true)

    try {
      // a) Decrement from
      const { data: fromStock } = await supabase
        .from('stock')
        .select('id, on_hand, free_to_use')
        .eq('product_id', productId)
        .eq('location_id', fromLocationId)
        .maybeSingle()

      if (fromStock) {
        await supabase.from('stock').update({
          on_hand: Math.max(0, fromStock.on_hand - qty),
          free_to_use: Math.max(0, fromStock.free_to_use - qty),
        }).eq('id', fromStock.id)
      }

      // b) Upsert to
      const { data: toStock } = await supabase
        .from('stock')
        .select('id, on_hand, free_to_use')
        .eq('product_id', productId)
        .eq('location_id', toLocationId)
        .maybeSingle()

      if (toStock) {
        await supabase.from('stock').update({
          on_hand: toStock.on_hand + qty,
          free_to_use: toStock.free_to_use + qty,
        }).eq('id', toStock.id)
      } else {
        await supabase.from('stock').insert({
          product_id: productId,
          location_id: toLocationId,
          on_hand: qty,
          free_to_use: qty,
        })
      }

      // c) Insert move
      await supabase.from('moves').insert({
        type: 'TRANSFER',
        product_id: productId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: qty,
        reference_no: `Transfer by ${user?.user_metadata?.full_name || user?.email}`,
        performed_by: user?.id,
      })

      toast.success('Transfer complete')

      // Reset
      setQuantity('')
      setFreeToUse((prev) => (prev !== null ? prev - qty : null))
    } catch (err) {
      toast.error('Transfer failed: ' + err.message)
    }
    setSubmitting(false)
  }

  const getLocationName = (id) => locations.find((l) => l.id === id)?.name

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Internal Transfers</h1>

      <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4 bg-muted/20">
        {/* Product */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* From */}
          <div className="space-y-2">
            <Label>From Location</Label>
            <Select value={fromLocationId} onValueChange={setFromLocationId}>
              <SelectTrigger>{getLocationName(fromLocationId) || 'Select source'}</SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label>To Location</Label>
            <Select value={toLocationId} onValueChange={setToLocationId}>
              <SelectTrigger>{getLocationName(toLocationId) || 'Select destination'}</SelectTrigger>
              <SelectContent>
                {locations.filter((l) => l.id !== fromLocationId).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Available stock */}
        {freeToUse !== null && (
          <div className="rounded-md border bg-background px-4 py-3 text-sm">
            Available: <strong>{freeToUse}</strong> {selectedProduct?.unit_of_measure || 'pcs'}
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="tr-qty">Quantity</Label>
          <Input
            id="tr-qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
          {insufficient && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Insufficient stock — only {freeToUse} available
            </p>
          )}
        </div>

        <Button type="submit" disabled={submitting || insufficient}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          {submitting ? 'Transferring…' : 'Transfer Stock'}
        </Button>
      </form>
    </div>
  )
}
