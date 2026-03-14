import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Plus, X, Printer, Save, CheckCircle2, XCircle, ArrowRight,
  AlertTriangle, PackageOpen, Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { cn } from '@/utils/utils'

const STATUS_COLORS = { Draft: 'gray', Ready: 'blue', Done: 'green', Canceled: 'red' }
const STATUS_STEPS = ['Draft', 'Ready', 'Done']

export default function ReceiptDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isNew = id === 'new'

  // ── Form state ──
  const [receipt, setReceipt] = useState({
    from_contact: '',
    to_location_id: '',
    schedule_date: '',
    responsible_id: '',
    status: 'Draft',
    reference: '',
  })
  const [lines, setLines] = useState([]) // { id?, product_id, quantity, _product, _stock }
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const userName = user?.user_metadata?.full_name || user?.email || ''

  // ── Fetch helpers ──
  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('id, name').order('name')
    setLocations(data || [])
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  const fetchReceipt = useCallback(async () => {
    if (isNew) return
    setLoading(true)
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) { toast.error('Receipt not found'); navigate('/operations/receipts'); return }
    setReceipt({
      from_contact: data.from_contact || '',
      to_location_id: data.to_location_id || '',
      schedule_date: data.schedule_date || '',
      responsible_id: data.responsible_id || '',
      status: data.status,
      reference: data.reference,
      id: data.id,
    })

    // fetch lines
    const { data: lineData } = await supabase
      .from('receipt_lines')
      .select('*, products(name, sku)')
      .eq('receipt_id', data.id)
    setLines((lineData || []).map((l) => ({
      id: l.id,
      product_id: l.product_id,
      quantity: l.quantity,
      _product: l.products,
      _stock: null,
    })))

    // fetch activity log
    const { data: logData } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_id', data.id)
      .eq('entity_type', 'receipt')
      .order('created_at', { ascending: false })
    setActivityLog(logData || [])

    setLoading(false)
  }, [id, isNew, navigate])

  useEffect(() => {
    fetchLocations()
    fetchProducts()
    fetchReceipt()
  }, [fetchReceipt])

  // Fetch stock for lines when location changes
  useEffect(() => {
    if (!receipt.to_location_id || lines.length === 0) return
    const fetchStockForLines = async () => {
      const productIds = lines.map((l) => l.product_id).filter(Boolean)
      if (productIds.length === 0) return
      const { data } = await supabase
        .from('stock')
        .select('product_id, on_hand')
        .eq('location_id', receipt.to_location_id)
        .in('product_id', productIds)
      const stockMap = {}
      ;(data || []).forEach((s) => { stockMap[s.product_id] = s.on_hand })
      setLines((prev) => prev.map((l) => ({
        ...l,
        _stock: l.product_id ? (stockMap[l.product_id] ?? 0) : null,
      })))
    }
    fetchStockForLines()
  }, [receipt.to_location_id])

  // ── Line helpers ──
  const addLine = () => {
    setLines((prev) => [...prev, { product_id: '', quantity: 1, _product: null, _stock: null }])
  }

  const removeLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateLine = (idx, field, value) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      if (field === 'product_id') {
        const prod = products.find((p) => p.id === value)
        updated._product = prod || null
        updated._stock = null // will be fetched
      }
      return updated
    }))

    // If product changed, fetch its stock
    if (field === 'product_id' && receipt.to_location_id && value) {
      supabase
        .from('stock')
        .select('on_hand')
        .eq('location_id', receipt.to_location_id)
        .eq('product_id', value)
        .maybeSingle()
        .then(({ data }) => {
          setLines((prev) => prev.map((l, i) =>
            i === idx ? { ...l, _stock: data?.on_hand ?? 0 } : l
          ))
        })
    }
  }

  // ── Save ──
  const handleSave = async (newStatus) => {
    if (!receipt.to_location_id) { toast.error('Select a location'); return }
    setSaving(true)

    const payload = {
      from_contact: receipt.from_contact || null,
      to_location_id: receipt.to_location_id,
      schedule_date: receipt.schedule_date || null,
      responsible_id: user?.id || null,
      status: newStatus || receipt.status,
    }

    let receiptId = receipt.id

    if (isNew || !receiptId) {
      const { data, error } = await supabase.from('receipts').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      receiptId = data.id

      // log creation
      await supabase.from('activity_log').insert({
        entity_type: 'receipt',
        entity_id: receiptId,
        action: `Created by ${userName}`,
        performed_by: user?.id,
      })
    } else {
      const { error } = await supabase.from('receipts').update(payload).eq('id', receiptId)
      if (error) { toast.error(error.message); setSaving(false); return }

      if (newStatus && newStatus !== receipt.status) {
        await supabase.from('activity_log').insert({
          entity_type: 'receipt',
          entity_id: receiptId,
          action: `Status changed to ${newStatus} by ${userName}`,
          performed_by: user?.id,
        })
      }
    }

    // Save lines: delete old, insert new
    await supabase.from('receipt_lines').delete().eq('receipt_id', receiptId)
    const linePayloads = lines
      .filter((l) => l.product_id)
      .map((l) => ({
        receipt_id: receiptId,
        product_id: l.product_id,
        quantity: Number(l.quantity) || 1,
      }))
    if (linePayloads.length > 0) {
      const { error } = await supabase.from('receipt_lines').insert(linePayloads)
      if (error) toast.error(error.message)
    }

    toast.success('Saved')
    setSaving(false)

    if (isNew) {
      navigate(`/operations/receipts/${receiptId}`, { replace: true })
    } else {
      fetchReceipt()
    }
  }

  // ── Validate ──
  const handleValidate = async () => {
    if (lines.length === 0) { toast.error('Add at least one product line'); return }
    setSaving(true)

    try {
      // a) Upsert stock for each line
      for (const line of lines) {
        if (!line.product_id) continue
        const qty = Number(line.quantity) || 0

        // Check if stock row exists
        const { data: existing } = await supabase
          .from('stock')
          .select('id, on_hand, free_to_use')
          .eq('product_id', line.product_id)
          .eq('location_id', receipt.to_location_id)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('stock')
            .update({
              on_hand: existing.on_hand + qty,
              free_to_use: existing.free_to_use + qty,
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('stock').insert({
            product_id: line.product_id,
            location_id: receipt.to_location_id,
            on_hand: qty,
            free_to_use: qty,
          })
        }

        // b) Insert move
        await supabase.from('moves').insert({
          type: 'IN',
          product_id: line.product_id,
          to_location_id: receipt.to_location_id,
          quantity: qty,
          reference_id: receipt.id,
          reference_no: receipt.reference,
          performed_by: user?.id,
        })
      }

      // c) Update status to Done
      await supabase.from('receipts').update({ status: 'Done' }).eq('id', receipt.id)

      // d) Activity log
      await supabase.from('activity_log').insert({
        entity_type: 'receipt',
        entity_id: receipt.id,
        action: `Validated by ${userName}`,
        performed_by: user?.id,
      })

      toast.success('Receipt validated — stock updated!')
      fetchReceipt()

      // e) Print dialog
      handlePrint()
    } catch (err) {
      toast.error('Validation failed: ' + err.message)
    }
    setSaving(false)
  }

  // ── Cancel ──
  const handleCancel = async () => {
    await supabase.from('receipts').update({ status: 'Canceled' }).eq('id', receipt.id)
    await supabase.from('activity_log').insert({
      entity_type: 'receipt',
      entity_id: receipt.id,
      action: `Canceled by ${userName}`,
      performed_by: user?.id,
    })
    toast.success('Receipt canceled')
    setCancelConfirm(false)
    fetchReceipt()
  }

  // ── Print (jsPDF) ──
  const handlePrint = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const w = doc.internal.pageSize.getWidth()

      doc.setFontSize(20)
      doc.text('CoreInventory — Receipt', w / 2, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.text(`Reference: ${receipt.reference || 'N/A'}`, 20, 40)
      doc.text(`From: ${receipt.from_contact || 'N/A'}`, 20, 48)
      const locName = locations.find((l) => l.id === receipt.to_location_id)?.name || 'N/A'
      doc.text(`To Location: ${locName}`, 20, 56)
      doc.text(`Date: ${receipt.schedule_date ? format(new Date(receipt.schedule_date), 'dd MMM yyyy') : 'N/A'}`, 20, 64)
      doc.text(`Responsible: ${userName}`, 20, 72)

      // Products table header
      let y = 88
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text('Product', 20, y)
      doc.text('SKU', 100, y)
      doc.text('Qty', 160, y)
      doc.line(20, y + 2, 190, y + 2)
      y += 8
      doc.setFont(undefined, 'normal')

      lines.forEach((l) => {
        if (!l._product) return
        doc.text(l._product.name || '', 20, y)
        doc.text(l._product.sku || '', 100, y)
        doc.text(String(l.quantity), 160, y)
        y += 7
      })

      if (receipt.status === 'Done') {
        doc.setFontSize(24)
        doc.setTextColor(34, 139, 34)
        doc.text('VALIDATED', w / 2, y + 20, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      doc.save(`receipt-${receipt.reference || 'draft'}.pdf`)
    } catch {
      toast.error('PDF generation failed. Install jspdf: npm install jspdf')
    }
  }

  const isDone = receipt.status === 'Done'
  const isCanceled = receipt.status === 'Canceled'
  const isReadOnly = isDone || isCanceled
  const getLocationName = (locId) => locations.find((l) => l.id === locId)?.name

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Status progress bar ── */}
      <div className="flex items-center gap-2">
        {STATUS_STEPS.map((step, i) => {
          const currentIdx = STATUS_STEPS.indexOf(receipt.status)
          const isActive = i <= currentIdx && !isCanceled
          return (
            <React.Fragment key={step}>
              {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              <Badge variant={isActive ? STATUS_COLORS[step] : 'outline'} className="text-xs">
                {step}
              </Badge>
            </React.Fragment>
          )
        })}
        {isCanceled && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="red">Canceled</Badge>
          </>
        )}
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isNew ? 'New Receipt' : receipt.reference}
        </h1>
        <Badge variant={STATUS_COLORS[receipt.status]}>{receipt.status}</Badge>
      </div>

      {/* ── Form fields ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Reference</Label>
          <Input value={isNew ? '' : receipt.reference} disabled placeholder="Auto-generated" />
        </div>
        <div className="space-y-2">
          <Label>Receive From</Label>
          <Input
            value={receipt.from_contact}
            onChange={(e) => setReceipt((r) => ({ ...r, from_contact: e.target.value }))}
            placeholder="Supplier / contact name"
            disabled={isReadOnly}
          />
        </div>
        <div className="space-y-2">
          <Label>To Location</Label>
          <Select
            value={receipt.to_location_id}
            onValueChange={(v) => setReceipt((r) => ({ ...r, to_location_id: v }))}
          >
            <SelectTrigger>{getLocationName(receipt.to_location_id) || 'Select location'}</SelectTrigger>
            <SelectContent>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Schedule Date</Label>
          <Input
            type="date"
            value={receipt.schedule_date}
            onChange={(e) => setReceipt((r) => ({ ...r, schedule_date: e.target.value }))}
            disabled={isReadOnly}
          />
        </div>
        <div className="space-y-2">
          <Label>Responsible</Label>
          <Input value={userName} disabled />
        </div>
      </div>

      {/* ── Product Lines ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Products</h2>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 border rounded-md">No products added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Product</TableHead>
                <TableHead className="w-24">Quantity</TableHead>
                <TableHead className="w-32">Current Stock</TableHead>
                {!isReadOnly && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => {
                const outOfStock = line._stock !== null && line._stock === 0
                return (
                  <TableRow key={idx} className={cn(outOfStock && 'bg-red-50')}>
                    <TableCell>
                      {isReadOnly ? (
                        <span>{line._product?.name || '—'} ({line._product?.sku})</span>
                      ) : (
                        <Select
                          value={line.product_id}
                          onValueChange={(v) => updateLine(idx, 'product_id', v)}
                        >
                          <SelectTrigger>
                            {line._product ? `${line._product.name} (${line._product.sku})` : 'Select product'}
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span>{line.quantity}</span>
                      ) : (
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className="w-20 h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {line._stock !== null ? (
                        <div className="flex items-center gap-1">
                          {outOfStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span className={cn(outOfStock && 'text-destructive font-medium')}>
                            {line._stock} {outOfStock && '(Out of stock)'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {!isReadOnly && (
          <>
            <Button onClick={() => handleSave('Draft')} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            {receipt.status === 'Draft' && (
              <Button variant="secondary" onClick={() => handleSave('Ready')} disabled={saving}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Ready
              </Button>
            )}
            {receipt.status === 'Ready' && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleValidate} disabled={saving}>
                <PackageOpen className="h-4 w-4 mr-2" /> Validate
              </Button>
            )}
            <Button variant="outline" onClick={() => setCancelConfirm(true)} disabled={saving}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel Receipt
            </Button>
          </>
        )}
        {!isNew && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        )}
      </div>

      {/* ── Activity Timeline ── */}
      {activityLog.length > 0 && (
        <div className="border-t pt-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Activity
          </h2>
          <div className="space-y-2">
            {activityLog.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div>
                  <span className="font-medium">{a.action}</span>
                  <span className="text-muted-foreground ml-2">
                    · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cancel confirmation ── */}
      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this receipt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction onClick={handleCancel}>Yes, Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
