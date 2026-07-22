'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const zoneSchema = z.object({
  name: z.string().min(2, 'Zone name required'),
  city: z.string().min(2, 'City required'),
  pincodes: z.string().min(6, 'At least one pincode required'),
})

type ZoneForm = z.infer<typeof zoneSchema>

export default function AdminZonesPage() {
  const supabase = createClient()
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { city: 'Jodhpur' },
  })

  const fetchZones = async () => {
    const { data } = await supabase.from('zones').select('*').order('name')
    setZones(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchZones() }, [])

  const addZone = async (data: ZoneForm) => {
    setSaving(true)
    const pincodes = data.pincodes.split(',').map(p => p.trim()).filter(Boolean)
    const { error } = await supabase.from('zones').insert({
      name: data.name,
      city: data.city,
      pincodes,
      is_active: true,
    })
    if (error) { toast.error('Failed to add zone'); setSaving(false); return }
    toast.success('Zone added!')
    setSaving(false)
    setDialog(false)
    reset()
    fetchZones()
  }

  const toggleZone = async (id: string, current: boolean) => {
    await supabase.from('zones').update({ is_active: !current }).eq('id', id)
    setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !current } : z))
    toast.success(`Zone ${!current ? 'activated' : 'deactivated'}`)
  }

  const deleteZone = async (id: string) => {
    if (!confirm('Delete this zone? Suppliers using it will lose their zone assignment.')) return
    await supabase.from('zones').delete().eq('id', id)
    toast.success('Zone deleted')
    fetchZones()
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Delivery Zones</h1>
          <p className="text-muted-foreground mt-1">Manage Jodhpur delivery zones</p>
        </div>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger>
            <Button className="water-shimmer text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Zone
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Add Delivery Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(addZone)} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Zone Name</Label>
                <Input placeholder="Sardarpura" className="bg-secondary" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Jodhpur" className="bg-secondary" {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label>Pincodes (comma-separated)</Label>
                <Input placeholder="342001, 342002" className="bg-secondary" {...register('pincodes')} />
                <p className="text-xs text-muted-foreground">Enter multiple pincodes separated by commas</p>
                {errors.pincodes && <p className="text-xs text-destructive">{errors.pincodes.message}</p>}
              </div>
              <Button type="submit" disabled={saving} className="w-full water-shimmer text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Zone
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <Card key={zone.id} className={`glass-card transition-all ${!zone.is_active ? 'opacity-50' : 'hover:border-sky-500/20'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{zone.name}</h3>
                      <p className="text-xs text-muted-foreground">{zone.city}</p>
                    </div>
                  </div>
                  <Switch
                    checked={zone.is_active}
                    onCheckedChange={() => toggleZone(zone.id, zone.is_active)}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {zone.pincodes?.map((p: string) => (
                    <Badge key={p} className="text-xs bg-secondary text-muted-foreground border-border">{p}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={zone.is_active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20 text-xs'
                    : 'bg-secondary text-muted-foreground border-border text-xs'
                  }>
                    {zone.is_active ? '● Active' : '○ Inactive'}
                  </Badge>
                  <button onClick={() => deleteZone(zone.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
