import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  short_code: z
    .string()
    .min(1, 'Short code is required')
    .transform((v) => v.toUpperCase()),
  warehouse_id: z.string().uuid('Select a warehouse'),
})

export default function LocationsPage() {
  const [locations, setLocations] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(locationSchema) })

  // ── Fetch ──
  const fetchLocations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('locations')
      .select('*, warehouses(name)')
      .order('created_at', { ascending: false })

    if (error) toast.error(error.message)
    else setLocations(data || [])
    setLoading(false)
  }

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').order('name')
    setWarehouses(data || [])
  }

  useEffect(() => {
    fetchLocations()
    fetchWarehouses()
  }, [])

  // ── Open dialog ──
  const openCreate = () => {
    setEditing(null)
    reset({ name: '', short_code: '', warehouse_id: '' })
    setDialogOpen(true)
  }

  const openEdit = (loc) => {
    setEditing(loc)
    reset({ name: loc.name, short_code: loc.short_code, warehouse_id: loc.warehouse_id })
    setDialogOpen(true)
  }

  // ── Save ──
  const onSave = async (values) => {
    if (editing) {
      const { error } = await supabase
        .from('locations')
        .update(values)
        .eq('id', editing.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('locations').insert(values)
      if (error) { toast.error(error.message); return }
    }

    toast.success('Saved')
    setDialogOpen(false)
    fetchLocations()
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('locations').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchLocations() }
    setDeleteTarget(null)
  }

  // Helper: find warehouse name for display in the Select trigger
  const getWarehouseName = (id) => warehouses.find((w) => w.id === id)?.name

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Location
        </Button>
      </div>

      {/* Table / skeleton / empty */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : locations.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No locations yet. Create your first one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short Code</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell>{loc.short_code}</TableCell>
                <TableCell className="text-muted-foreground">{loc.warehouses?.name || '—'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(loc)}>
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
            <DialogTitle>{editing ? 'Edit Location' : 'New Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loc-name">Name</Label>
              <Input id="loc-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-code">Short Code</Label>
              <Input
                id="loc-code"
                {...register('short_code')}
                onChange={(e) => setValue('short_code', e.target.value.toUpperCase(), { shouldValidate: true })}
              />
              {errors.short_code && <p className="text-sm text-destructive">{errors.short_code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Controller
                control={control}
                name="warehouse_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger placeholder="Select warehouse">
                      {field.value ? getWarehouseName(field.value) : 'Select warehouse'}
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouse_id && <p className="text-sm text-destructive">{errors.warehouse_id.message}</p>}
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
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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
