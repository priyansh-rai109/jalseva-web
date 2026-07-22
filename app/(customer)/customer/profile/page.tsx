'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { User, Phone, Mail, MapPin, Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Address } from '@/types'
import { getInitials } from '@/lib/utils'

const addressSchema = z.object({
  label: z.string().min(1, 'Label required'),
  line1: z.string().min(5, 'Address required'),
  pincode: z.string().min(6, 'Valid pincode'),
  city: z.string().min(2, 'City required'),
})

type AddressForm = z.infer<typeof addressSchema>

export default function CustomerProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addressDialog, setAddressDialog] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { city: 'Jodhpur', label: 'Home' },
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('customers').select('*').eq('user_id', user.id).single(),
      ])
      setProfile(p)
      setCustomer(c)
      setName(p?.name || '')
      setPhone(p?.phone || '')
      setLoading(false)
    }
    init()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([
      supabase.from('profiles').update({ name, phone }).eq('id', user.id),
      supabase.from('customers').update({ name, phone }).eq('user_id', user.id),
    ])
    toast.success('Profile updated!')
    setSaving(false)
  }

  const addAddress = async (data: AddressForm) => {
    const customerId = customer?.id || 'customer-1'
    const newAddr: Address = {
      id: crypto.randomUUID(),
      label: data.label,
      line1: data.line1,
      pincode: data.pincode,
      city: data.city,
      is_default: !customer?.addresses?.length,
    }
    const updatedAddresses = [...(customer?.addresses || []), newAddr]
    await supabase.from('customers').update({ addresses: updatedAddresses }).eq('id', customerId)
    setCustomer({ ...(customer || { id: customerId }), addresses: updatedAddresses })
    toast.success('Address added!')
    setAddressDialog(false)
    reset()
  }

  const removeAddress = async (addressId: string) => {
    const customerId = customer?.id || 'customer-1'
    const updated = (customer?.addresses || []).filter((a: Address) => a.id !== addressId)
    await supabase.from('customers').update({ addresses: updated }).eq('id', customerId)
    setCustomer({ ...(customer || { id: customerId }), addresses: updated })
    toast.success('Address removed')
  }

  const setDefaultAddress = async (addressId: string) => {
    const customerId = customer?.id || 'customer-1'
    const updated = (customer?.addresses || []).map((a: Address) => ({ ...a, is_default: a.id === addressId }))
    await supabase.from('customers').update({ addresses: updated }).eq('id', customerId)
    setCustomer({ ...(customer || { id: customerId }), addresses: updated })
    toast.success('Default address updated')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and addresses</p>
      </div>

      {/* Avatar + Info */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full water-shimmer flex items-center justify-center text-white text-xl font-bold">
              {getInitials(name || 'U')}
            </div>
            <div>
              <h2 className="text-xl font-bold">{name || 'Customer'}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <Badge className="mt-1 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">Customer</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" className="pl-10 bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210" className="pl-10 bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={profile?.email || ''} disabled className="pl-10 bg-secondary opacity-60" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="water-shimmer text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <MapPin className="w-5 h-5 text-sky-400" /> Saved Addresses
          </CardTitle>
          <Dialog open={addressDialog} onOpenChange={setAddressDialog}>
            <DialogTrigger>
              <Button size="sm" className="water-shimmer text-white">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Add New Address</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(addAddress)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Label (Home / Office)</Label>
                  <Input placeholder="Home" className="bg-secondary" {...register('label')} />
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input placeholder="123, Sardarpura, Near Clock Tower" className="bg-secondary" {...register('line1')} />
                  {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Jodhpur" className="bg-secondary" {...register('city')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input placeholder="342001" className="bg-secondary" {...register('pincode')} />
                  </div>
                </div>
                <Button type="submit" className="w-full water-shimmer text-white">Save Address</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!customer?.addresses?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No saved addresses yet
            </div>
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((addr: Address) => (
                <div key={addr.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <MapPin className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{addr.label}</span>
                      {addr.is_default && <Badge className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.line1}, {addr.city} - {addr.pincode}</p>
                  </div>
                  <div className="flex gap-1">
                    {!addr.is_default && (
                      <button onClick={() => setDefaultAddress(addr.id)}
                        className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded">
                        Set Default
                      </button>
                    )}
                    <button onClick={() => removeAddress(addr.id)} className="p-1 hover:bg-red-500/10 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
