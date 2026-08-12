'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { MapPin, Plus, Trash2, Edit2, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const zoneSchema = z.object({
  name: z.string().min(2, 'Zone name required'),
  city: z.string().min(2, 'City required'),
  pincodes: z.string().min(6, 'At least one 6-digit pincode required'),
})

type ZoneForm = z.infer<typeof zoneSchema>

export default function AdminZonesPage() {
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { city: 'Jodhpur' },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors }
  } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
  })

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/admin/zones')
      const json = await res.json()
      if (res.ok && json.zones) {
        setZones(json.zones)
      } else {
        toast.error(json.error || 'Failed to load zones')
      }
    } catch (err) {
      console.error('Error fetching zones:', err)
      toast.error('Network error loading zones')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const addZone = async (data: ZoneForm) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          pincodes: data.pincodes,
          is_active: true,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(`Zone "${data.name}" added successfully! 📍`)
        setDialog(false)
        reset({ name: '', city: 'Jodhpur', pincodes: '' })
        fetchZones()
      } else {
        toast.error(json.error || 'Failed to add zone')
      }
    } catch (err) {
      toast.error('Error adding zone')
    }
    setSaving(false)
  }

  const handleOpenEdit = (zone: any) => {
    setEditingZone(zone)
    setEditValue('name', zone.name)
    setEditValue('city', zone.city || 'Jodhpur')
    setEditValue('pincodes', Array.isArray(zone.pincodes) ? zone.pincodes.join(', ') : zone.pincodes || '')
    setEditDialog(true)
  }

  const updateZone = async (data: ZoneForm) => {
    if (!editingZone) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingZone.id,
          name: data.name,
          city: data.city,
          pincodes: data.pincodes,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Zone updated successfully!')
        setEditDialog(false)
        setEditingZone(null)
        fetchZones()
      } else {
        toast.error(json.error || 'Failed to update zone')
      }
    } catch (err) {
      toast.error('Error updating zone')
    }
    setSaving(false)
  }

  const toggleZone = async (id: string, current: boolean) => {
    // Optimistic UI update
    setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !current } : z))
    try {
      const res = await fetch('/api/admin/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(`Zone ${!current ? 'activated' : 'deactivated'}`)
      } else {
        // revert on failure
        setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: current } : z))
        toast.error(json.error || 'Failed to toggle zone status')
      }
    } catch (err) {
      setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: current } : z))
      toast.error('Error toggling zone')
    }
  }

  const deleteZone = async (id: string, name: string) => {
    if (!confirm(`Delete zone "${name}"? Suppliers in this zone will have their zone unassigned.`)) return
    try {
      const res = await fetch(`/api/admin/zones?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(`Zone "${name}" deleted`)
        fetchZones()
      } else {
        toast.error(json.error || 'Failed to delete zone')
      }
    } catch (err) {
      toast.error('Error deleting zone')
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Delivery Zones</h1>
          <p className="text-muted-foreground mt-1">Manage operational delivery zones and serviceable pincodes</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchZones()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button className="water-shimmer text-white" onClick={() => setDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Zone
          </Button>

          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Add New Delivery Zone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(addZone)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Zone Name <span className="text-red-400">*</span></Label>
                  <Input placeholder="e.g. Sardarpura, Mandore, Pal Road" className="bg-secondary" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>City <span className="text-red-400">*</span></Label>
                  <Input placeholder="Jodhpur" className="bg-secondary" {...register('city')} />
                  {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Serviceable Pincodes <span className="text-red-400">*</span></Label>
                  <Input placeholder="342001, 342003, 342008" className="bg-secondary" {...register('pincodes')} />
                  <p className="text-xs text-muted-foreground">Comma-separated 6-digit pincodes</p>
                  {errors.pincodes && <p className="text-xs text-destructive">{errors.pincodes.message}</p>}
                </div>
                <Button type="submit" disabled={saving} className="w-full water-shimmer text-white mt-2">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {saving ? 'Creating Zone...' : 'Create Zone'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Zone Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Edit Delivery Zone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(updateZone)} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Zone Name <span className="text-red-400">*</span></Label>
              <Input placeholder="Zone name" className="bg-secondary" {...registerEdit('name')} />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>City <span className="text-red-400">*</span></Label>
              <Input placeholder="City" className="bg-secondary" {...registerEdit('city')} />
              {editErrors.city && <p className="text-xs text-destructive">{editErrors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Pincodes <span className="text-red-400">*</span></Label>
              <Input placeholder="Pincodes" className="bg-secondary" {...registerEdit('pincodes')} />
              {editErrors.pincodes && <p className="text-xs text-destructive">{editErrors.pincodes.message}</p>}
            </div>
            <Button type="submit" disabled={saving} className="w-full water-shimmer text-white mt-2">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {saving ? 'Updating Zone...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="glass-card h-36 rounded-xl animate-pulse" />)}
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-lg font-semibold">No Delivery Zones Yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click &quot;Add Zone&quot; above to create your first operational zone.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <Card key={zone.id} className={`glass-card transition-all ${!zone.is_active ? 'opacity-60 border-dashed' : 'hover:border-sky-500/30 shadow-md'}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-tight">{zone.name}</h3>
                        <p className="text-xs text-muted-foreground">{zone.city}</p>
                      </div>
                    </div>
                    <Switch
                      checked={zone.is_active}
                      onCheckedChange={() => toggleZone(zone.id, zone.is_active)}
                    />
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Serviceable Pincodes ({zone.pincodes?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {zone.pincodes && zone.pincodes.length > 0 ? (
                        zone.pincodes.map((p: string) => (
                          <Badge key={p} className="text-xs bg-secondary/80 text-foreground border-border font-mono">
                            {p}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No pincodes listed</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Badge className={zone.is_active
                    ? 'bg-green-500/10 text-green-400 border-green-500/20 text-xs'
                    : 'bg-secondary text-muted-foreground border-border text-xs'
                  }>
                    {zone.is_active ? '● Active' : '○ Inactive'}
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-sky-500/10 text-sky-400"
                      onClick={() => handleOpenEdit(zone)}
                      title="Edit Zone"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400"
                      onClick={() => deleteZone(zone.id, zone.name)}
                      title="Delete Zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
