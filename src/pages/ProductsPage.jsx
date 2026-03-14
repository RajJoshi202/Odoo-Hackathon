import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, X as XIcon } from 'lucide-react'

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

const UNITS = ['pcs', 'kg', 'litre', 'box', 'metre']

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category_id: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit is required'),
  cost_per_unit: z.coerce.number().min(0, 'Must be ≥ 0'),
  min_stock_threshold: z.coerce.number().int().min(0).default(5),
})

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Category panel
  const [catOpen, setCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catDelTarget, setCatDelTarget] = useState(null)

  // Inline "+ New Category" in the product form
  const [inlineNewCat, setInlineNewCat] = useState('')
  const [showInlineCat, setShowInlineCat] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(productSchema), defaultValues: { unit_of_measure: 'pcs', cost_per_unit: 0, min_stock_threshold: 5 } })

  // ── Fetch ──
  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setProducts(data || [])
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  useEffect(() => { fetchProducts(); fetchCategories() }, [])

  // ── Filtered list ──
  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  // ── Dialog open ──
  const openCreate = () => {
    setEditing(null)
    reset({ name: '', sku: '', category_id: '', unit_of_measure: 'pcs', cost_per_unit: 0, min_stock_threshold: 5 })
    setShowInlineCat(false)
    setDialogOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    reset({
      name: p.name,
      sku: p.sku,
      category_id: p.category_id || '',
      unit_of_measure: p.unit_of_measure,
      cost_per_unit: p.cost_per_unit,
      min_stock_threshold: p.min_stock_threshold,
    })
    setShowInlineCat(false)
    setDialogOpen(true)
  }

  // ── Save product ──
  const onSave = async (values) => {
    // SKU uniqueness
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('sku', values.sku)
      .maybeSingle()

    if (existing && existing.id !== editing?.id) {
      toast.error('SKU already exists')
      return
    }

    const payload = { ...values }
    if (!payload.category_id) delete payload.category_id

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error(error.message); return }
    }

    toast.success('Saved')
    setDialogOpen(false)
    fetchProducts()
  }

  // ── Delete product ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchProducts() }
    setDeleteTarget(null)
  }

  // ── Inline category add ──
  const handleInlineCatAdd = async () => {
    if (!inlineNewCat.trim()) return
    const { data, error } = await supabase.from('categories').insert({ name: inlineNewCat.trim() }).select().single()
    if (error) { toast.error(error.message); return }
    await fetchCategories()
    setValue('category_id', data.id)
    setInlineNewCat('')
    setShowInlineCat(false)
    toast.success('Category added')
  }

  // ── Category panel ──
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCatName.trim() })
    if (error) toast.error(error.message)
    else { toast.success('Category added'); setNewCatName(''); fetchCategories() }
  }

  const handleDeleteCategory = async () => {
    if (!catDelTarget) return
    const { error } = await supabase.from('categories').delete().eq('id', catDelTarget.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchCategories() }
    setCatDelTarget(null)
  }

  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Product
          </Button>
        </div>
      </div>

      {/* Products table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {search ? 'No products match your search.' : 'No products yet. Create your first one.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Cost/Unit</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell className="text-muted-foreground">{p.categories?.name || '—'}</TableCell>
                <TableCell>{p.unit_of_measure}</TableCell>
                <TableCell className="text-right">{Number(p.cost_per_unit).toFixed(2)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* ── Categories collapsible panel ── */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setCatOpen((o) => !o)}
          className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          <span>Manage Categories ({categories.length})</span>
          {catOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {catOpen && (
          <div className="px-4 pb-4 space-y-3">
            {/* Add category */}
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="max-w-xs"
              />
              <Button size="sm" onClick={handleAddCategory}>Add</Button>
            </div>
            {/* List */}
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                    {c.name}
                    <button type="button" onClick={() => setCatDelTarget(c)} className="ml-1 text-muted-foreground hover:text-destructive">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sku">SKU</Label>
                <Input id="p-sku" {...register('sku')} />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2 items-start">
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger placeholder="Select category" className="flex-1">
                        {field.value ? getCategoryName(field.value) : 'Select category'}
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setShowInlineCat((o) => !o)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {showInlineCat && (
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="New category"
                    value={inlineNewCat}
                    onChange={(e) => setInlineNewCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInlineCatAdd())}
                    className="max-w-xs"
                  />
                  <Button type="button" size="sm" onClick={handleInlineCatAdd}>Add</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Unit */}
              <div className="space-y-2">
                <Label>Unit of Measure</Label>
                <Controller
                  control={control}
                  name="unit_of_measure"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>{field.value || 'Select unit'}</SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {/* Cost */}
              <div className="space-y-2">
                <Label htmlFor="p-cost">Cost Per Unit</Label>
                <Input id="p-cost" type="number" step="0.01" {...register('cost_per_unit')} />
                {errors.cost_per_unit && <p className="text-sm text-destructive">{errors.cost_per_unit.message}</p>}
              </div>
              {/* Threshold */}
              <div className="space-y-2">
                <Label htmlFor="p-thresh">Min Stock Threshold</Label>
                <Input id="p-thresh" type="number" {...register('min_stock_threshold')} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Product Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.sku})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Category Delete Confirm ── */}
      <AlertDialog open={!!catDelTarget} onOpenChange={(o) => !o && setCatDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete category <strong>{catDelTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
