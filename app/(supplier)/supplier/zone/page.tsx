'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, Info, Save, Loader2, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Zone } from '@/types'

export default function SupplierZonePage() {
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')

  const fetchSupplierAndZones = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: s }, { data: z }] = await Promise.all([
      supabase.from('suppliers').select('*, zones(name, pincodes, city)').eq('user_id', user.id).single(),
      supabase.from('zones').select('*').eq('is_active', true).order('name'),
    ])

    if (s) {
      setSupplier(s)
      setSelectedZoneId(s.zone_id || '')
    }
    setZones(z || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSupplierAndZones()
  }, [])

  const saveZone = async () => {
    if (!supplier) return
    setSaving(true)
    const { error } = await supabase
      .from('suppliers')
      .update({ zone_id: selectedZoneId || null })
      .eq('id', supplier.id)

    if (error) {
      toast.error('Failed to update delivery zone')
      setSaving(false)
      return
    }

    toast.success('Delivery zone updated successfully!')
    await fetchSupplierAndZones()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  const currentZone = supplier?.zones

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Delivery Zone
        </h1>
        <p className="text-muted-foreground mt-1">Select and manage your primary operational zone in Jodhpur</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: Zone editor */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <Compass className="w-5 h-5 text-sky-400" /> Set Operational Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Select Zone</label>
                <Select value={selectedZoneId} onValueChange={(v) => setSelectedZoneId(v ?? '')}>

                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select operational zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name} ({z.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 text-xs text-sky-400/90 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  By selecting a zone, your water products will be listed for all customers located in that zone or ordering to those pincodes.
                </span>
              </div>

              <Button onClick={saveZone} disabled={saving} className="w-full water-shimmer text-white">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Active Zone
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current zone details */}
          {currentZone && (
            <Card className="glass-card border-sky-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-sky-400" /> Current Operational Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1 text-foreground">Zone Name</h4>
                  <p className="text-lg font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {currentZone.name}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Serviceable Pincodes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {currentZone.pincodes && currentZone.pincodes.length > 0 ? (
                      currentZone.pincodes.map((pincode: string) => (
                        <Badge key={pincode} className="bg-secondary text-muted-foreground border-border">
                          {pincode}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No pincodes listed for this zone.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Zone availability overview */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                All Available Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    z.id === selectedZoneId
                      ? 'border-sky-500/30 bg-sky-500/5'
                      : 'border-border bg-secondary/30'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">{z.name}</p>
                  <p className="text-muted-foreground">{z.city}</p>
                  <p className="text-muted-foreground/60 mt-1">{(z.pincodes || []).length} pincodes covered</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
