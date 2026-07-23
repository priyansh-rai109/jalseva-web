'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Building2, MapPin, Star, ChevronRight, Filter, Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import type { Supplier, Zone } from '@/types'

const productTypeIcons = { tanker: '🚛', can: '🫙', pouch: '💧' }

export default function CustomerBrowsePage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [{ data: supplierData }, { data: zoneData }] = await Promise.all([
        supabase
          .from('suppliers')
          .select('*, zones(name), water_products(type, price, is_active)')
          .eq('status', 'approved')
          .order('rating', { ascending: false }),
        supabase.from('zones').select('*').eq('is_active', true),
      ])
      setSuppliers(supplierData || [])
      setZones(zoneData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = suppliers.filter((s) => {
    const matchSearch =
      s.business_name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
    const matchZone = selectedZone === 'all' || s.zone_id === selectedZone
    return matchSearch && matchZone
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Browse Suppliers
        </h1>
        <p className="text-muted-foreground mt-1">Find water suppliers near you in Jodhpur</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary"
          />
        </div>
        <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v ?? 'all')}>

          <SelectTrigger className="w-full sm:w-[200px] bg-secondary">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} supplier{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Suppliers */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No suppliers found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or zone</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((supplier) => {
            const products = (supplier as any).water_products || []
            const activeProducts = products.filter((p: any) => p.is_active)
            const types = Array.from(new Set(activeProducts.map((p: any) => p.type))) as string[]

            const minPrice = activeProducts.length > 0 ? Math.min(...activeProducts.map((p: any) => p.price)) : null

            return (
              <Link key={supplier.id} href={`/customer/supplier/${supplier.id}`}>
                <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl water-shimmer flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate">{supplier.business_name}</h3>
                        <p className="text-xs text-muted-foreground">{supplier.owner_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span className="text-xs font-medium">{supplier.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{supplier.total_orders} orders</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>

                    {/* Zone + product types */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(supplier.zone as any)?.name && (
                        <Badge className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
                          📍 {(supplier.zone as any).name}
                        </Badge>
                      )}
                      {types.map((t) => (
                        <Badge key={t} className="text-xs bg-secondary text-muted-foreground border-border">
                          {productTypeIcons[t as keyof typeof productTypeIcons]} {t}
                        </Badge>
                      ))}
                    </div>

                    {/* Price */}
                    {minPrice !== null && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">Starting from </span>
                        <span className="text-base font-bold text-sky-400">₹{minPrice}</span>
                        <span className="text-xs text-muted-foreground"> · {activeProducts.length} products</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
