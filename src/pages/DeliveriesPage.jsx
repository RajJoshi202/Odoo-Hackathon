import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Plus, Search, List, LayoutGrid, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

const STATUS_COLORS = { Draft: 'gray', Waiting: 'yellow', Ready: 'blue', Done: 'green', Canceled: 'red' }
const STATUSES = ['All', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled']

export default function DeliveriesPage() {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewMode, setViewMode] = useState('list')

  const fetchDeliveries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, locations:from_location_id(name)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    else setDeliveries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDeliveries() }, [])

  const filtered = deliveries.filter((d) => {
    const q = search.toLowerCase()
    const matchSearch =
      d.reference?.toLowerCase().includes(q) ||
      d.to_contact?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const kanbanCols = ['Draft', 'Waiting', 'Ready', 'Done']
  const kanbanData = kanbanCols.map((status) => ({
    status,
    items: filtered.filter((d) => d.status === status),
  }))

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const rows = filtered.map((d) => ({
        Reference: d.reference || '', To: d.to_contact || '',
        'From Location': d.locations?.name || '',
        'Schedule Date': d.schedule_date ? format(new Date(d.schedule_date), 'yyyy-MM-dd') : '',
        Status: d.status,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Deliveries')
      XLSX.writeFile(wb, `deliveries-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      toast.success('Exported!')
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => navigate('/operations/deliveries/new')}>
            <Plus className="h-4 w-4 mr-2" /> New
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">{statusFilter}</SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-2 text-sm', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn('px-3 py-2 text-sm', viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : viewMode === 'list' ? (
        filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No deliveries found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>To (Contact)</TableHead>
                <TableHead>From (Location)</TableHead>
                <TableHead>Schedule Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/operations/deliveries/${d.id}`)}
                >
                  <TableCell className="font-medium">{d.reference}</TableCell>
                  <TableCell>{d.to_contact || '—'}</TableCell>
                  <TableCell>{d.locations?.name || '—'}</TableCell>
                  <TableCell>{d.schedule_date ? format(new Date(d.schedule_date), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[d.status]}>{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kanbanData.map((col) => (
            <div key={col.status} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{col.status}</h3>
                <Badge variant={STATUS_COLORS[col.status]}>{col.items.length}</Badge>
              </div>
              {col.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No deliveries</p>
              ) : (
                col.items.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/operations/deliveries/${d.id}`)}
                    className="rounded-md border bg-background p-3 cursor-pointer hover:shadow-md transition-shadow space-y-1"
                  >
                    <p className="font-medium text-sm">{d.reference}</p>
                    <p className="text-xs text-muted-foreground">{d.to_contact || 'No contact'}</p>
                    {d.schedule_date && (
                      <p className="text-xs text-muted-foreground">{format(new Date(d.schedule_date), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
