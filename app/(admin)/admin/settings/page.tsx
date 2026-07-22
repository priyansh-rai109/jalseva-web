'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Bell, Globe, Shield, Database, Mail, Save, Loader2, Droplets, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    platformName: 'JalSeva',
    platformEmail: 'support@jalseva.in',
    platformPhone: '+91 98765 43210',
    city: 'Jodhpur, Rajasthan',
    allowNewSuppliers: true,
    allowNewCustomers: true,
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: false,
    autoApproveSuppliers: false,
  })

  const saveSettings = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800)) // Simulate save
    toast.success('Settings saved!')
    setSaving(false)
  }

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure JalSeva platform settings</p>
      </div>

      {/* Platform Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Globe className="w-5 h-5 text-sky-400" /> Platform Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input value={settings.platformName}
              onChange={e => setSettings(p => ({ ...p, platformName: e.target.value }))}
              className="bg-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input value={settings.platformEmail}
                onChange={e => setSettings(p => ({ ...p, platformEmail: e.target.value }))}
                className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Support Phone</Label>
              <Input value={settings.platformPhone}
                onChange={e => setSettings(p => ({ ...p, platformPhone: e.target.value }))}
                className="bg-secondary" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Service City</Label>
            <Input value={settings.city}
              onChange={e => setSettings(p => ({ ...p, city: e.target.value }))}
              className="bg-secondary" />
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Shield className="w-5 h-5 text-amber-400" /> Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'allowNewSuppliers', label: 'Allow New Supplier Registrations', desc: 'New water suppliers can sign up' },
            { key: 'allowNewCustomers', label: 'Allow New Customer Registrations', desc: 'New customers can create accounts' },
            { key: 'autoApproveSuppliers', label: 'Auto-Approve Suppliers', desc: 'Skip manual approval — suppliers are active immediately' },
            { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Temporarily disable the platform for maintenance' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key as keyof typeof settings] as boolean}
                onCheckedChange={() => toggle(item.key as keyof typeof settings)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Bell className="w-5 h-5 text-purple-400" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send order updates via email' },
            { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send order updates via SMS (requires SMS provider)' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key as keyof typeof settings] as boolean}
                onCheckedChange={() => toggle(item.key as keyof typeof settings)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Database info */}
      <Card className="glass-card border-sky-500/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Supabase Database</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connected to Supabase Postgres. Realtime is enabled for orders and notifications tables.
                Use the Supabase dashboard to manage backups, extensions, and advanced settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="water-shimmer text-white">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
      </Button>
    </div>
  )
}
