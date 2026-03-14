import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  short_code: z
    .string()
    .min(1, 'Short code is required')
    .max(10, 'Max 10 characters')
    .transform((v) => v.toUpperCase()),
  address: z.string().optional(),
})

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null) // warehouse object or null
  const [deleteTarget, setDeleteTarget] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(warehouseSchema) })

  // ── Fetch ──
  const fetchWarehouses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) toast.error(error.message)
    else setWarehouses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchWarehouses() }, [])

  // ── Open dialog ──
  const openCreate = () => {
    setEditing(null)
    reset({ name: '', short_code: '', address: '' })
    setDialogOpen(true)
  }

  const openEdit = (wh) => {
    setEditing(wh)
    reset({ name: wh.name, short_code: wh.short_code, address: wh.address || '' })
    setDialogOpen(true)
  }

  // ── Save ──
  const onSave = async (values) => {
    if (editing) {
      const { error } = await supabase
        .from('warehouses')
        .update(values)
        .eq('id', editing.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('warehouses').insert(values)
      if (error) { toast.error(error.message); return }
    }

    toast.success('Saved')
    setDialogOpen(false)
    fetchWarehouses()
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('warehouses').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchWarehouses() }
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warehouses</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Warehouse
        </Button>
      </div>

      {/* Table / skeleton / empty */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : warehouses.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No warehouses yet. Create your first one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((wh) => (
              <TableRow key={wh.id}>
                <TableCell className="font-medium">{wh.name}</TableCell>
                <TableCell>{wh.short_code}</TableCell>
                <TableCell className="text-muted-foreground">{wh.address || '—'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(wh)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(wh)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Name</Label>
              <Input id="wh-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-code">Short Code</Label>
              <Input
                id="wh-code"
                maxLength={10}
                {...register('short_code')}
                onChange={(e) => setValue('short_code', e.target.value.toUpperCase(), { shouldValidate: true })}
              />
              {errors.short_code && <p className="text-sm text-destructive">{errors.short_code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-address">Address</Label>
              <Textarea id="wh-address" {...register('address')} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete all locations inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
