'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  Star,
  ShoppingCart,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupplierStatusColor, formatDate } from '@/lib/utils'
import type { Supplier } from '@/types'

export default function AdminSuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchSuppliers = async () => {
    setLoading(true)
    let query = supabase.from('suppliers').select('*, zones(name)').order('created_at', { ascending: false })
    if (status !== 'all') query = query.eq('status', status)
    const { data } = await query
    setSuppliers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchSuppliers() }, [status])

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('suppliers').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    toast.success(`Supplier ${newStatus}`)
    fetchSuppliers()
  }

  const filtered = suppliers.filter((s) =>
    s.business_name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  )

  const statusCounts = {
    all: suppliers.length,
    pending: suppliers.filter((s) => s.status === 'pending').length,
    approved: suppliers.filter((s) => s.status === 'approved').length,
    suspended: suppliers.filter((s) => s.status === 'suspended').length,
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Suppliers
        </h1>
        <p className="text-muted-foreground mt-1">Manage all water supplier accounts</p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'suspended'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              status === s
                ? 'bg-sky-500 text-white'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">({statusCounts[s]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary"
        />
      </div>

      {/* Supplier Cards */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No suppliers found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((supplier) => (
            <Card key={supplier.id} className="glass-card hover:border-sky-500/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{supplier.business_name}</h3>
                      <p className="text-xs text-muted-foreground">{supplier.owner_name}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs border ${getSupplierStatusColor(supplier.status)}`}>
                    {supplier.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {supplier.phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" /> {supplier.rating?.toFixed(1) || '0.0'} rating
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {(supplier.zone as any)?.name || 'No zone'}
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> {supplier.total_orders} orders
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Joined {formatDate(supplier.created_at)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  {supplier.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(supplier.id, 'approved')}
                        className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(supplier.id, 'rejected')}
                        className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {supplier.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(supplier.id, 'suspended')}
                      className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mr-1" /> Suspend
                    </Button>
                  )}
                  {supplier.status === 'suspended' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(supplier.id, 'approved')}
                      className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reinstate
                    </Button>
                  )}
                  {supplier.status === 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(supplier.id, 'approved')}
                      className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
