import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Search, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

const TYPES = ['All', 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']
const TYPE_BORDER = {
  IN: 'border-l-4 border-l-green-500',
  OUT: 'border-l-4 border-l-red-500',
  TRANSFER: 'border-l-4 border-l-blue-500',
  ADJUSTMENT: 'border-l-4 border-l-amber-500',
}

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [locationFilter, setLocationFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchMoves = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('moves')
      .select(`
        *,
        products(name, sku),
        from_loc:from_location_id(name),
        to_loc:to_location_id(name),
        profiles:performed_by(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) toast.error(error.message)
    else setMoves(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMoves()
    supabase.from('locations').select('id, name').order('name').then(({ data }) => setLocations(data || []))
  }, [])

  // ── Filter ──
  const filtered = moves.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch =
      m.products?.name?.toLowerCase().includes(q) ||
      m.products?.sku?.toLowerCase().includes(q) ||
      m.reference_no?.toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || m.type === typeFilter
    const matchLocation =
      locationFilter === 'all' ||
      m.from_location_id === locationFilter ||
      m.to_location_id === locationFilter

    let matchDate = true
    if (dateFrom) matchDate = matchDate && m.created_at >= dateFrom
    if (dateTo) matchDate = matchDate && m.created_at <= dateTo + 'T23:59:59'

    return matchSearch && matchType && matchLocation && matchDate
  })

  // ── Qty display ──
  const formatQty = (m) => {
    const qty = m.quantity
    if (m.type === 'IN') return { text: `+${qty}`, color: 'text-green-600' }
    if (m.type === 'OUT') return { text: `-${qty}`, color: 'text-red-600' }
    if (m.type === 'ADJUSTMENT') {
      return qty >= 0
        ? { text: `+${qty}`, color: 'text-green-600' }
        : { text: `${qty}`, color: 'text-red-600' }
    }
    return { text: String(qty), color: '' }
  }

  // ── Export to Excel ──
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const rows = filtered.map((m) => ({
        Type: m.type,
        Reference: m.reference_no || '',
        Product: m.products?.name || '',
        SKU: m.products?.sku || '',
        From: m.from_loc?.name || '',
        To: m.to_loc?.name || '',
        Qty: m.quantity,
        Date: m.created_at ? format(new Date(m.created_at), 'yyyy-MM-dd HH:mm') : '',
        By: m.profiles?.full_name || '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Move History')
      const today = format(new Date(), 'yyyy-MM-dd')
      XLSX.writeFile(wb, `move-history-${today}.xlsx`)
      toast.success('Exported!')
    } catch {
      toast.error('Export failed. Install xlsx: npm install xlsx')
    }
  }

  const getLocationName = (id) => locations.find((l) => l.id === id)?.name

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Move History</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">{typeFilter}</SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-44">
            {locationFilter === 'all' ? 'All Locations' : getLocationName(locationFilter)}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No moves found.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const { text, color } = formatQty(m)
                return (
                  <TableRow key={m.id} className={TYPE_BORDER[m.type] || ''}>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        m.type === 'IN' && 'bg-green-100 text-green-700',
                        m.type === 'OUT' && 'bg-red-100 text-red-700',
                        m.type === 'TRANSFER' && 'bg-blue-100 text-blue-700',
                        m.type === 'ADJUSTMENT' && 'bg-amber-100 text-amber-700',
                      )}>
                        {m.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.reference_no || '—'}</TableCell>
                    <TableCell className="font-medium">{m.products?.name || '—'}</TableCell>
                    <TableCell>{m.from_loc?.name || '—'}</TableCell>
                    <TableCell>{m.to_loc?.name || '—'}</TableCell>
                    <TableCell className={cn('text-right font-medium', color)}>{text}</TableCell>
                    <TableCell>{m.created_at ? format(new Date(m.created_at), 'dd MMM yyyy HH:mm') : '—'}</TableCell>
                    <TableCell>{m.profiles?.full_name || '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {moves.length} moves</p>
    </div>
  )
}
