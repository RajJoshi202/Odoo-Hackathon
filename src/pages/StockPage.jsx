import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { Search, AlertTriangle, Check, X, Download } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

export default function StockPage() {
  const [stock, setStock] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [editingRow, setEditingRow] = useState(null) // stock id being edited
  const [editValue, setEditValue] = useState('')

  // ── Fetch ──
  const fetchStock = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('stock')
      .select('*, products(name, sku, cost_per_unit, min_stock_threshold), locations(name)')
      .order('id')

    if (error) toast.error(error.message)
    else setStock(data || [])
    setLoading(false)
  }

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('id, name').order('name')
    setLocations(data || [])
  }

  useEffect(() => { fetchStock(); fetchLocations() }, [])

  // ── Filter ──
  const filtered = stock.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.products?.name?.toLowerCase().includes(q) ||
      s.products?.sku?.toLowerCase().includes(q) ||
      s.locations?.name?.toLowerCase().includes(q)
    const matchesLocation = locationFilter === 'all' || s.location_id === locationFilter
    return matchesSearch && matchesLocation
  })

  // ── Low stock ──
  const lowStockItems = stock.filter(
    (s) => s.on_hand <= (s.products?.min_stock_threshold ?? 5),
  )
  const lowStockCount = lowStockItems.length

  const isLowStock = (s) => s.on_hand <= (s.products?.min_stock_threshold ?? 5)

  // ── Inline edit ──
  const startEdit = (row) => {
    setEditingRow(row.id)
    setEditValue(String(row.on_hand))
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditValue('')
  }

  const saveEdit = async (row) => {
    const newQty = parseInt(editValue, 10)
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Enter a valid quantity')
      return
    }

    const { error } = await supabase
      .from('stock')
      .update({ on_hand: newQty, free_to_use: newQty })
      .eq('id', row.id)

    if (error) { toast.error(error.message); return }
    toast.success('Updated')
    setEditingRow(null)
    fetchStock()
  }

  const filterLowStock = () => {
    setSearch('')
    setLocationFilter('all')
    // client-side: we just scroll; the user sees highlighted rows
  }

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const rows = filtered.map((s) => ({
        Product: s.products?.name || '', SKU: s.products?.sku || '',
        Location: s.locations?.name || '', 'On Hand': s.on_hand,
        'Free to Use': s.free_to_use, 'Cost/Unit': Number(s.products?.cost_per_unit ?? 0),
        'Total Value': (s.on_hand * Number(s.products?.cost_per_unit ?? 0)).toFixed(2),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Stock')
      XLSX.writeFile(wb, `stock-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      toast.success('Exported!')
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      {/* Low stock banner */}
      {!loading && lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span>
            <strong>⚠ {lowStockCount} product{lowStockCount > 1 ? 's are' : ' is'} low on stock.</strong>{' '}
            <button type="button" onClick={filterLowStock} className="underline text-destructive hover:no-underline">
              View all
            </button>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48">
            {locationFilter === 'all' ? 'All Locations' : locations.find((l) => l.id === locationFilter)?.name}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {search || locationFilter !== 'all' ? 'No stock records match your filter.' : 'No stock records yet.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Free to Use</TableHead>
              <TableHead className="text-right">Cost/Unit</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const low = isLowStock(s)
              const cost = Number(s.products?.cost_per_unit ?? 0)
              const totalValue = (s.on_hand * cost).toFixed(2)

              return (
                <TableRow key={s.id} className={cn(low && 'bg-destructive/10')}>
                  <TableCell className="font-medium">{s.products?.name}</TableCell>
                  <TableCell>{s.products?.sku}</TableCell>
                  <TableCell>{s.locations?.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {low && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      {editingRow === s.id ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(s)}
                          className="w-20 h-8 text-right"
                          autoFocus
                        />
                      ) : (
                        <span>{s.on_hand}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{s.free_to_use}</TableCell>
                  <TableCell className="text-right">{cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totalValue}</TableCell>
                  <TableCell className="text-right">
                    {editingRow === s.id ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => saveEdit(s)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                        Update
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
