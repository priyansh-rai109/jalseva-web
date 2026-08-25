'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Truck, Plus, Search, Phone, MessageSquare, Edit2, Trash2,
  RefreshCw, UserCheck, ShieldAlert,
  Car, User, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface Driver {
  id: string
  supplier_id: string
  name: string
  phone: string
  vehicle_type: string
  vehicle_number: string
  license_no?: string | null
  status: 'active' | 'inactive' | 'on_duty'
  notes?: string | null
  created_at: string
}

const VEHICLE_TYPES = [
  { id: 'Tanker', labelEn: 'Water Tanker (🚛)', labelHi: 'वाटर टैंकर (🚛)' },
  { id: 'Can Auto', labelEn: '20L Can Auto / Van (🛺)', labelHi: '20L कैन ऑटो / वैन (🛺)' },
  { id: 'Pickup', labelEn: 'Pickup Truck (🛻)', labelHi: 'पिकअप ट्रक् (🛻)' },
  { id: 'Bike', labelEn: 'Bike / Delivery Scooter (🛵)', labelHi: 'डिलीवरी बाइक (🛵)' },
]

export default function SupplierDriversPage() {
  const supabase = createClient()
  const { language } = useLanguage()

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState<Driver | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState('Tanker')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [notes, setNotes] = useState('')

  const fetchDrivers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/supplier/drivers')
      const json = await res.json()
      if (res.ok) {
        setDrivers(json.drivers || [])
        setTableMissing(!!json.tableMissing)
      } else {
        toast.error(json.error || 'Failed to load drivers')
      }
    } catch (err) {
      console.error('Error loading drivers:', err)
      toast.error('Network error loading drivers')
    }
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    fetchDrivers(true)

    // Realtime changes listener
    const channel = supabase
      .channel('supplier-drivers-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_drivers' }, () => {
        fetchDrivers(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDrivers, supabase])

  const openAddModal = () => {
    setEditingDriver(null)
    setName('')
    setPhone('')
    setVehicleType('Tanker')
    setVehicleNumber('')
    setLicenseNo('')
    setStatus('active')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (drv: Driver) => {
    setEditingDriver(drv)
    setName(drv.name || '')
    setPhone(drv.phone || '')
    setVehicleType(drv.vehicle_type || 'Tanker')
    setVehicleNumber(drv.vehicle_number || '')
    setLicenseNo(drv.license_no || '')
    setStatus(drv.status === 'inactive' ? 'inactive' : 'active')
    setNotes(drv.notes || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !vehicleNumber.trim()) {
      toast.error(language === 'hi' ? 'कृपया ड्राइवर का नाम, मोबाइल और गाड़ी का नंबर भरें' : 'Please fill Name, Phone, and Vehicle Number')
      return
    }

    setSubmitting(true)
    try {
      const method = editingDriver ? 'PATCH' : 'POST'
      const bodyPayload = {
        id: editingDriver?.id,
        name: name.trim(),
        phone: phone.trim(),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.trim(),
        license_no: licenseNo.trim(),
        status,
        notes: notes.trim(),
      }

      const res = await fetch('/api/supplier/drivers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })
      const json = await res.json()

      if (res.ok && (json.success || json.driver)) {
        toast.success(
          editingDriver
            ? (language === 'hi' ? 'ड्राइवर प्रोफाइल अपडेट हो गई! ✅' : 'Driver updated successfully! ✅')
            : (language === 'hi' ? 'नया ड्राइवर सफलतापूर्वक जोड़ा गया! 🚚' : 'New driver added successfully! 🚚')
        )
        setIsModalOpen(false)
        await fetchDrivers(false)
      } else {
        toast.error(json.error || 'Failed to save driver profile')
      }
    } catch (err) {
      console.error('Error saving driver:', err)
      toast.error('Network error saving driver')
    }
    setSubmitting(false)
  }

  const toggleDriverStatus = async (drv: Driver) => {
    const newStatus = drv.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/supplier/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: drv.id, status: newStatus }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(
          language === 'hi'
            ? `ड्राइवर ${drv.name} का स्टेटस ${newStatus === 'active' ? 'एक्टिव' : 'इनएक्टिव'} किया गया`
            : `Driver ${drv.name} status updated to ${newStatus}`
        )
        await fetchDrivers(false)
      } else {
        toast.error(json.error || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Network error updating driver status')
    }
  }

  const handleDeleteDriver = async (drv: Driver) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/supplier/drivers?id=${drv.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(language === 'hi' ? `ड्राइवर ${drv.name} की प्रोफाइल हटा दी गई` : `Driver ${drv.name} deleted successfully`)
        await fetchDrivers(false)
        setDeleteConfirmDriver(null)
      } else {
        toast.error(json.error || 'Failed to delete driver')
      }
    } catch (err) {
      toast.error('Network error deleting driver')
    }
    setDeleting(false)
  }

  // Filtered list
  const filteredDrivers = drivers.filter(drv => {
    const matchesSearch =
      drv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.phone.includes(searchQuery) ||
      drv.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drv.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || drv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = drivers.filter(d => d.status === 'active' || d.status === 'on_duty').length
  const totalCount = drivers.length

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {language === 'hi' ? 'मेरे डिलीवरी ड्राइवर (Supplier Drivers)' : 'Supplier Drivers'}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {language === 'hi'
                  ? 'पानी डिलीवरी के लिए अपने ड्राइवर्स और गाड़ियों का रिकॉर्ड रखें'
                  : 'Manage delivery personnel profiles, vehicles, and status for order dispatches'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDrivers(true)}
            disabled={loading}
            className="text-xs h-10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {language === 'hi' ? 'रिफ्रेश' : 'Refresh'}
          </Button>

          <Button
            onClick={openAddModal}
            className="water-shimmer text-white font-bold text-xs h-10 shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {language === 'hi' ? 'नया ड्राइवर जोड़ें (+)' : 'Add Driver (+)'}
          </Button>
        </div>
      </div>

      {/* Database missing notification alert */}
      {tableMissing && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{language === 'hi' ? 'डेटाबेस सेटअप आवश्यक (Supabase Database Table Missing)' : 'Database Migration Notice'}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {language === 'hi'
              ? 'सप्लायर ड्राइवर्स के लिए Supabase में table "supplier_drivers" बनी नहीं है। कृपया अपने Supabase SQL Editor में `supabase/drivers_schema.sql` फाइल का SQL कोड चलाएं।'
              : 'The "supplier_drivers" database table needs to be initialized. Run the SQL script from `supabase/drivers_schema.sql` in your Supabase SQL Editor.'}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{language === 'hi' ? 'कुल ड्राइवर' : 'Total Drivers'}</p>
              <p className="text-2xl font-bold mt-1 text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {totalCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{language === 'hi' ? 'सक्रिय (Active)' : 'Active Drivers'}</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {activeCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{language === 'hi' ? 'डिलीवरी वाहन' : 'Vehicles Registered'}</p>
              <p className="text-2xl font-bold mt-1 text-purple-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {drivers.filter(d => !!d.vehicle_number).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'नाम, मोबाइल या गाड़ी नंबर से खोजें...' : 'Search by name, phone or vehicle number...'}
            className="pl-9 bg-secondary text-xs sm:text-sm h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === 'hi' ? 'सभी' : 'All'}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === 'hi' ? 'एक्टिव' : 'Active'}
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'inactive' ? 'bg-slate-700 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === 'hi' ? 'इनएक्टिव' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Drivers List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-44 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <Card className="glass-card text-center p-8 sm:p-12 rounded-2xl">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <h3 className="text-lg font-bold">{language === 'hi' ? 'कोई ड्राइवर नहीं मिला' : 'No Drivers Found'}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            {searchQuery
              ? (language === 'hi' ? 'आपकी खोज के अनुसार कोई ड्राइवर उपलब्ध नहीं है।' : 'No drivers match your search query.')
              : (language === 'hi' ? 'अभी तक कोई ड्राइवर प्रोफाइल नहीं बनाई गई है। "नया ड्राइवर जोड़ें" बटन पर क्लिक करके जोड़ें।' : 'No driver profiles created yet. Click "Add Driver" to create your first profile.')}
          </p>
          {!searchQuery && (
            <Button onClick={openAddModal} className="mt-4 water-shimmer text-white text-xs h-10 font-bold">
              <Plus className="w-4 h-4 mr-1.5" />
              {language === 'hi' ? 'पहला ड्राइवर जोड़ें' : 'Add First Driver'}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDrivers.map((drv) => {
            const isActive = drv.status === 'active' || drv.status === 'on_duty'
            const cleanPhone = drv.phone.replace(/\D/g, '')

            return (
              <Card
                key={drv.id}
                className={`glass-card transition-all rounded-2xl border ${
                  isActive ? 'hover:border-sky-500/40' : 'opacity-75 border-border/40'
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-base flex items-center justify-center">
                        {drv.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground">{drv.name}</h3>
                          <button onClick={() => toggleDriverStatus(drv)}>
                            <Badge
                              className={`text-[10px] px-2 py-0.5 cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20'
                              }`}
                            >
                              {isActive ? (language === 'hi' ? '● एक्टिव' : '● Active') : (language === 'hi' ? '○ इनएक्टिव' : '○ Inactive')}
                            </Badge>
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          <strong className="text-foreground">{drv.vehicle_number}</strong>
                          <span className="text-muted-foreground/70">({drv.vehicle_type || 'Tanker'})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditModal(drv)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirmDriver(drv)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Details & License */}
                  <div className="p-3 rounded-xl bg-secondary/50 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-sky-400" />
                        {drv.phone}
                      </span>
                      {drv.license_no && (
                        <span className="font-mono text-[11px] text-muted-foreground/80">
                          🪪 {drv.license_no}
                        </span>
                      )}
                    </div>
                    {drv.notes && (
                      <p className="text-[11px] italic text-foreground/80 pt-0.5 border-t border-border/40">
                        "{drv.notes}"
                      </p>
                    )}
                  </div>

                  {/* Quick Contact & Dispatch Link */}
                  <div className="flex items-center gap-2 pt-1">
                    <a href={`tel:${drv.phone}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-9 text-sky-400 border-sky-500/30 hover:bg-sky-500/10">
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        {language === 'hi' ? 'कॉल करें' : 'Call'}
                      </Button>
                    </a>
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          language === 'hi'
                            ? `नमस्ते ${drv.name}, जलसेवा सप्लायर पोर्टल से आपका स्वागत है।`
                            : `Hello ${drv.name}, greeting from your JalSeva Supplier.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full text-xs h-9 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          {language === 'hi' ? 'व्हाट्सएप' : 'WhatsApp'}
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-card max-w-lg p-0 overflow-hidden border-sky-500/30">
          <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-slate-900 p-5 border-b border-border/80">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Truck className="w-5 h-5 text-sky-400" />
              <span>{editingDriver ? (language === 'hi' ? 'ड्राइवर प्रोफाइल अपडेट करें' : 'Edit Driver Profile') : (language === 'hi' ? 'नया ड्राइवर जोड़ें' : 'Add New Driver')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
              {language === 'hi' ? 'ऑर्डर डिस्पैच करते समय यह ड्राइवर चयन सूची में दिखाई देगा' : 'This driver will be selectable when dispatching orders'}
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Driver Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'ड्राइवर का नाम *' : 'Driver Name *'}
                </Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Gurjar"
                  className="bg-secondary h-10 text-sm"
                />
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                </Label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9829012345"
                  className="bg-secondary h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'गाड़ी का प्रकार (Vehicle Type)' : 'Vehicle Type'}
                </Label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-secondary text-foreground rounded-xl border border-border h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {VEHICLE_TYPES.map(vt => (
                    <option key={vt.id} value={vt.id}>
                      {language === 'hi' ? vt.labelHi : vt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Registration Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'वाहन रजिस्ट्रेशन नंबर *' : 'Vehicle Number *'}
                </Label>
                <Input
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. RJ-19-GA-5420"
                  className="bg-secondary h-10 text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Driving License Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'ड्राइविंग लाइसेंस नंबर (वैकल्पिक)' : 'License Number (Optional)'}
                </Label>
                <Input
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="e.g. RJ1920210012345"
                  className="bg-secondary h-10 text-sm uppercase font-mono"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {language === 'hi' ? 'स्थिति (Status)' : 'Status'}
                </Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-secondary text-foreground rounded-xl border border-border h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="active">{language === 'hi' ? '🟢 एक्टिव (उपलब्ध)' : '🟢 Active (Available)'}</option>
                  <option value="inactive">{language === 'hi' ? '🔴 इनएक्टिव (छुट्टी पर)' : '🔴 Inactive (Off-duty)'}</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {language === 'hi' ? 'टिप्पणी / नोट्स (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'hi' ? 'उदा. पाोटा-रातानाडा एरिया में डिलीवरी करता है' : 'e.g. Handles Sardarpura and Ratanada routes'}
                className="bg-secondary h-10 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs h-10">
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting} className="water-shimmer text-white font-bold text-xs h-10 px-6">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> {language === 'hi' ? 'सेव हो रहा है...' : 'Saving...'}</>
                ) : (
                  editingDriver ? (language === 'hi' ? 'अपडेट करें' : 'Update Driver') : (language === 'hi' ? 'ड्राइवर जोड़ें' : 'Save Driver')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Driver Confirmation */}
      {deleteConfirmDriver && (
        <ConfirmDialog
          isOpen={!!deleteConfirmDriver}
          title={language === 'hi' ? 'ड्राइवर हटाएं?' : 'Delete Driver Profile?'}
          message={language === 'hi' ? `क्या आप वाकई ड्राइवर ${deleteConfirmDriver.name} (${deleteConfirmDriver.vehicle_number}) को हटाना चाहते हैं?` : `Are you sure you want to delete driver profile ${deleteConfirmDriver.name}?`}
          confirmText={language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Delete'}
          cancelText={language === 'hi' ? 'कैंसिल' : 'Cancel'}
          variant="destructive"
          loading={deleting}
          onConfirm={() => handleDeleteDriver(deleteConfirmDriver)}
          onCancel={() => setDeleteConfirmDriver(null)}
        />
      )}
    </div>
  )
}
