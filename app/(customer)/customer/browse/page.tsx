'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Building2, MapPin, Star, ChevronRight, Filter, Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import Link from 'next/link'
import type { Supplier, Zone } from '@/types'

const productTypeIcons = { tanker: '🚛', can: '🫙', pouch: '💧' }

export default function CustomerBrowsePage() {
  const supabase = createClient()
  const { t, language } = useLanguage()
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
          .select('*, zones(name), water_products(type, price, is_active), reviews(rating)')
          .eq('status', 'approved')
          .order('rating', { ascending: false }),
        supabase.from('zones').select('*').eq('is_active', true),
      ])
      setSuppliers(supplierData || [])
      setZones(zoneData || [])
      setLoading(false)
    }
    fetchData()
  }, [supabase])

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
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {t('browseSuppliers')}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">{t('browseSubtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary h-11 text-sm"
          />
        </div>
        <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-[220px] bg-secondary h-11 text-xs sm:text-sm">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('allZones')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allZones')}</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs sm:text-sm text-muted-foreground">
        {filtered.length} {t('suppliersFound')}
      </p>

      {/* Suppliers */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard type="supplier" count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl p-6">
          <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-semibold">{t('noSuppliersFound')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'hi' ? 'अन्य इलाका या सर्च कीवर्ड आज़माएं' : 'Try a different search or zone'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((supplier) => {
            const products = (supplier as any).water_products || []
            const activeProducts = products.filter((p: any) => p.is_active)
            const types = Array.from(new Set(activeProducts.map((p: any) => p.type))) as string[]
            const reviews = (supplier as any).reviews || []
            const reviewsCount = reviews.length

            const minPrice = activeProducts.length > 0 ? Math.min(...activeProducts.map((p: any) => p.price)) : null

            return (
              <Link key={supplier.id} href={`/customer/supplier/${supplier.id}`}>
                <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl water-shimmer flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base truncate">{supplier.business_name}</h3>
                        <p className="text-xs text-muted-foreground">{supplier.owner_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-0.5 text-amber-400 font-semibold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{supplier.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                          {reviewsCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({reviewsCount} {t('customerReviewsCount')})
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{supplier.total_orders} {t('ordersCount')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
                      <span className="truncate">{supplier.address}</span>
                    </div>

                    {/* Zone + product types */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {((supplier as any).zones?.name || (supplier as any).zone?.name) && (
                        <Badge className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
                          📍 {(supplier as any).zones?.name || (supplier as any).zone?.name}
                        </Badge>
                      )}
                      {types.map((tItem) => (
                        <Badge key={tItem} className="text-xs bg-secondary text-muted-foreground border-border">
                          {productTypeIcons[tItem as keyof typeof productTypeIcons]}{' '}
                          {tItem === 'tanker' ? t('tanker') : tItem === 'can' ? t('can') : t('pouch')}
                        </Badge>
                      ))}
                    </div>

                    {/* Price */}
                    {minPrice !== null && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">{t('startingFrom')} </span>
                          <span className="text-sm sm:text-base font-bold text-sky-400">₹{minPrice}</span>
                        </div>
                        <span className="text-xs text-sky-400 font-semibold flex items-center gap-1 hover:underline">
                          {t('buyNow')} →
                        </span>
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
