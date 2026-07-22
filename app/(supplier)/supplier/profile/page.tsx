'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Building2, Phone, Mail, MapPin, Save, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupplierStatusColor } from '@/lib/utils'
import type { Zone } from '@/types'

export default function SupplierProfilePage() {
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [licenseNo, setLicenseNo] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: s }, { data: z }] = await Promise.all([
        supabase.from('suppliers').select('*, zones(name)').eq('user_id', user.id).single(),
        supabase.from('zones').select('*').eq('is_active', true),
      ])
      if (s) {
        setSupplier(s)
        setBusinessName(s.business_name || '')
        setOwnerName(s.owner_name || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setDescription(s.description || '')
        setZoneId(s.zone_id || '')
        setLicenseNo(s.license_no || '')
      }
      setZones(z || [])
      setLoading(false)
    }
    init()
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('suppliers').update({
      business_name: businessName,
      owner_name: ownerName,
      phone,
      address,
      description,
      zone_id: zoneId || null,
      license_no: licenseNo || null,
    }).eq('id', supplier.id)

    if (error) { toast.error('Failed to update profile'); setSaving(false); return }
    toast.success('Profile updated!')
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Business Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your supplier information</p>
      </div>

      {/* Status + Rating Banner */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl water-shimmer flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{businessName}</h2>
              <p className="text-sm text-muted-foreground">{ownerName}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`text-xs border ${getSupplierStatusColor(supplier?.status)}`}>
                  {supplier?.status}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {supplier?.rating?.toFixed(1) || '0.0'} rating
                </span>
                <span className="text-xs text-muted-foreground">{supplier?.total_orders} orders</span>
              </div>
            </div>
          </div>
          {supplier?.status === 'pending' && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              ⏳ Your account is pending approval. All details are editable while you wait.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="Shiv Water Co." className="pl-10 bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                placeholder="Ramesh Kumar" className="bg-secondary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210" className="pl-10 bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>License No. (optional)</Label>
              <Input value={licenseNo} onChange={e => setLicenseNo(e.target.value)}
                placeholder="LIC-2024-XXX" className="bg-secondary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea value={address} onChange={e => setAddress(e.target.value)}
                placeholder="123, Sardarpura, Jodhpur" className="pl-10 bg-secondary resize-none" rows={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Zone</Label>
            <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? '')}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Select your delivery zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.name} — {z.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Business Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell customers about your water delivery service, quality standards, delivery timings..."
              className="bg-secondary resize-none" rows={3} />
          </div>

          <Button onClick={save} disabled={saving} className="water-shimmer text-white">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
