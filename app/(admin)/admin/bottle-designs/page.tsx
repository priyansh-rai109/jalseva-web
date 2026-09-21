'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  UploadCloud,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Tag,
  FileText,
  Lock,
  Layers,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  BottleDesign,
  OCCASION_CATEGORIES,
  OccasionCategory,
} from '@/types/bottle-printing'

export default function AdminBottleDesignsPage() {
  const [designs, setDesigns] = useState<BottleDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDesign, setEditingDesign] = useState<BottleDesign | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form fields
  const [formCode, setFormCode] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState<string>('Wedding')
  const [formDescription, setFormDescription] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formImages, setFormImages] = useState<string[]>([])
  const [formStatus, setFormStatus] = useState<boolean>(true)
  const [formInternalNotes, setFormInternalNotes] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Fetch Designs ───────────────────────────────────────────────────────
  const fetchDesigns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/admin/bottle-designs?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.designs) {
        setDesigns(data.designs)
      } else {
        toast.error(data.error || 'Failed to fetch bottle designs')
      }
    } catch (err) {
      console.error('Error loading bottle designs:', err)
      toast.error('Network error loading bottle designs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesigns()
  }, [selectedCategory, selectedStatus])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDesigns()
  }

  // ─── Open Add / Edit Form ────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingDesign(null)
    const randomCode = `WD-${Math.floor(100 + Math.random() * 900)}`
    setFormCode(randomCode)
    setFormTitle('')
    setFormCategory('Wedding')
    setFormDescription('')
    setFormTags('')
    setFormImages([])
    setFormStatus(true)
    setFormInternalNotes('')
    setIsFormOpen(true)
  }

  const handleOpenEdit = (design: BottleDesign) => {
    setEditingDesign(design)
    setFormCode(design.design_code)
    setFormTitle(design.title)
    setFormCategory(design.occasion_category)
    setFormDescription(design.description || '')
    setFormTags(Array.isArray(design.tags) ? design.tags.join(', ') : '')
    setFormImages(design.images || [])
    setFormStatus(design.status === 'active')
    setFormInternalNotes(design.internal_notes || '')
    setIsFormOpen(true)
  }

  // ─── Handle Image Upload ─────────────────────────────────────────────────
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const res = await fetch('/api/admin/bottle-designs/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.urls && data.urls.length > 0) {
        setFormImages((prev) => [...prev, ...data.urls])
        toast.success(`${data.urls.length} image(s) uploaded successfully! 📸`)
      } else {
        toast.error(data.error || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('Network error while uploading image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // ─── Save Design (Create or Update) ──────────────────────────────────────
  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formCode.trim()) {
      toast.error('Design code is required (e.g. WD-101)')
      return
    }

    if (!formTitle.trim()) {
      toast.error('Design title is required')
      return
    }

    if (formImages.length === 0) {
      toast.error('Please upload at least one image of the bottle design')
      return
    }

    setSaving(true)

    const payload = {
      design_code: formCode.trim().toUpperCase(),
      title: formTitle.trim(),
      occasion_category: formCategory,
      description: formDescription.trim() || null,
      tags: formTags
        ? formTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      images: formImages,
      status: formStatus ? 'active' : 'inactive',
      internal_notes: formInternalNotes.trim() || null,
    }

    try {
      if (editingDesign) {
        // Update existing
        const res = await fetch('/api/admin/bottle-designs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDesign.id, ...payload }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          toast.success(`Design "${payload.title}" updated successfully! ✨`)
          setIsFormOpen(false)
          fetchDesigns()
        } else {
          toast.error(data.error || 'Failed to update design')
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/bottle-designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          toast.success(`Design "${payload.title}" added to catalog! 🎉`)
          setIsFormOpen(false)
          fetchDesigns()
        } else {
          toast.error(data.error || 'Failed to add design')
        }
      }
    } catch (err) {
      console.error('Error saving design:', err)
      toast.error('Network error saving bottle design')
    } finally {
      setSaving(false)
    }
  }

  // ─── Quick Toggle Status ─────────────────────────────────────────────────
  const handleToggleStatus = async (design: BottleDesign) => {
    const newStatus = design.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/admin/bottle-designs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: design.id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDesigns((prev) =>
          prev.map((d) => (d.id === design.id ? { ...d, status: newStatus } : d))
        )
        toast.success(`Design "${design.design_code}" is now ${newStatus}`)
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Error changing status')
    }
  }

  // ─── Delete Design ───────────────────────────────────────────────────────
  const handleDeleteDesign = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/bottle-designs?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Design deleted successfully')
        setDesigns((prev) => prev.filter((d) => d.id !== id))
        setDeletingId(null)
      } else {
        toast.error(data.error || 'Failed to delete design')
      }
    } catch (err) {
      toast.error('Error deleting design')
    } finally {
      setDeleting(false)
    }
  }

  // Category Color Map for badges
  const categoryColorMap: Record<string, string> = {
    Wedding: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    Birthday: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    Anniversary: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    Corporate: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
    'Baby Shower': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    Festival: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    Other: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }

  const activeCount = designs.filter((d) => d.status === 'active').length
  const inactiveCount = designs.length - activeCount

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header with Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                Customized Bottle Printing
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage personalized label designs, sample catalogs, occasion categories & internal inquiries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDesigns}
            disabled={loading}
            className="h-9 px-3 rounded-xl border-border hover:bg-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="water-shimmer text-white font-semibold h-9 px-3.5 rounded-xl text-xs shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Design
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Badges ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Catalog</p>
              <p className="text-lg sm:text-xl font-bold font-mono">{designs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active (Live)</p>
              <p className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inactive / Draft</p>
              <p className="text-lg sm:text-xl font-bold font-mono">{inactiveCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Occasions</p>
              <p className="text-lg sm:text-xl font-bold font-mono">
                {new Set(designs.map((d) => d.occasion_category)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by design code (e.g. WD-102) or title..."
            className="pl-9 bg-secondary/70 h-10 text-xs sm:text-sm rounded-xl border-border"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Occasion Category Select */}
          <Select
            value={selectedCategory}
            items={[
              { value: 'all', label: 'All Occasions' },
              ...OCCASION_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            onValueChange={(val) => setSelectedCategory(val ?? 'all')}
          >
            <SelectTrigger className="w-[160px] sm:w-[180px] bg-secondary/70 h-10 text-xs rounded-xl border-border">
              <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Occasions">
                {selectedCategory === 'all' ? 'All Occasions' : selectedCategory}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Occasions">
                All Occasions
              </SelectItem>
              {OCCASION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} label={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select
            value={selectedStatus}
            items={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
            onValueChange={(val) => setSelectedStatus(val ?? 'all')}
          >
            <SelectTrigger className="w-[130px] bg-secondary/70 h-10 text-xs rounded-xl border-border">
              <SelectValue placeholder="All Status">
                {selectedStatus === 'all'
                  ? 'All Status'
                  : selectedStatus === 'active'
                  ? 'Active Only'
                  : 'Inactive Only'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Status">
                All Status
              </SelectItem>
              <SelectItem value="active" label="Active Only">
                Active Only
              </SelectItem>
              <SelectItem value="inactive" label="Inactive Only">
                Inactive Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table Listing ────────────────────────────────────────────────────── */}
      <Card className="border border-border shadow-xs overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-secondary/60 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">Thumbnail</th>
                <th className="py-3 px-4">Design Code</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Occasion</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading custom bottle designs...
                  </td>
                </tr>
              ) : designs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">No designs found</p>
                      <p className="text-xs">
                        {search || selectedCategory !== 'all' || selectedStatus !== 'all'
                          ? 'Try clearing search or filter criteria'
                          : 'Get started by adding your first customized bottle print sample!'}
                      </p>
                      <Button
                        size="sm"
                        onClick={handleOpenAdd}
                        className="mt-2 water-shimmer text-white text-xs rounded-xl"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add New Design
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                designs.map((design) => {
                  const badgeClass =
                    categoryColorMap[design.occasion_category] || categoryColorMap.Other
                  const primaryImg = design.images?.[0]

                  return (
                    <tr
                      key={design.id}
                      className="hover:bg-secondary/30 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <td className="py-3 px-4 align-middle">
                        <div className="w-14 h-14 rounded-xl border border-border bg-secondary/50 overflow-hidden relative flex items-center justify-center shrink-0">
                          {primaryImg ? (
                            <Image
                              src={primaryImg}
                              alt={design.title}
                              fill
                              sizes="56px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                          )}
                          {design.images?.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded-sm font-mono">
                              +{design.images.length - 1}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 align-middle">
                        <span className="font-mono font-bold text-xs px-2 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          {design.design_code}
                        </span>
                      </td>

                      {/* Title & Details */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1 max-w-md">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">
                            {design.title}
                          </p>
                          {design.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {design.description}
                            </p>
                          )}
                          {design.tags && design.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {design.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {design.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{design.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {design.internal_notes && (
                            <p className="text-[10px] text-amber-500/90 flex items-center gap-1 font-medium pt-0.5">
                              <Lock className="w-2.5 h-2.5" /> Note: {design.internal_notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Occasion */}
                      <td className="py-3 px-4 align-middle">
                        <Badge className={`text-[11px] font-medium border ${badgeClass}`}>
                          {design.occasion_category}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(design)}
                          className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                          title="Click to toggle status"
                        >
                          {design.status === 'active' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] py-0.5 px-2">
                              ● Active
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-500/15 text-slate-500 border-slate-500/30 text-[11px] py-0.5 px-2">
                              ○ Inactive
                            </Badge>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(design)}
                            className="h-8 w-8 p-0 rounded-lg border-border hover:bg-secondary text-foreground"
                            title="Edit Design"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingId(design.id)}
                            className="h-8 w-8 p-0 rounded-lg border-rose-500/30 hover:bg-rose-500/10 text-rose-500"
                            title="Delete Design"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add / Edit Modal Dialog ─────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold flex items-center gap-2"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <Sparkles className="w-5 h-5 text-sky-400" />
              {editingDesign ? 'Edit Bottle Design' : 'Add New Bottle Design'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add sample design photos, occasion tags, and inquiry details for customer catalogs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDesign} className="space-y-4 pt-2">
            {/* Design Code & Occasion Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="design-code" className="text-xs font-semibold">
                    Design Code <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormCode(`WD-${Math.floor(100 + Math.random() * 900)}`)
                    }
                    className="text-[10px] text-sky-500 hover:underline"
                  >
                    Auto Generate
                  </button>
                </div>
                <Input
                  id="design-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WD-102"
                  className="font-mono uppercase h-10 text-sm bg-secondary/50 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="design-occasion" className="text-xs font-semibold">
                  Occasion Category <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formCategory}
                  items={OCCASION_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  onValueChange={(val) => setFormCategory(val || 'Wedding')}
                >
                  <SelectTrigger id="design-occasion" className="h-10 text-sm bg-secondary/50 rounded-xl">
                    <SelectValue placeholder="Select Occasion">{formCategory}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} label={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="design-title" className="text-xs font-semibold">
                Design Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="design-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Royal Rajasthani Floral Theme (500ml)"
                className="h-10 text-sm bg-secondary/50 rounded-xl"
                required
              />
            </div>

            {/* Image Uploader & Thumbnails */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  Design Photos <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {formImages.length} image(s) added
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-500/30 hover:border-sky-500/60 bg-sky-500/5 hover:bg-sky-500/10 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-xs text-sky-500 py-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading photo to storage...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-sky-500" />
                    <p className="text-xs font-semibold text-foreground">
                      Click to upload design photos
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG, or WEBP up to 10MB each
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded Images Preview Strip */}
              {formImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded-xl border border-border bg-secondary overflow-hidden relative group"
                    >
                      <Image
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-0.5 shadow-md transition-all opacity-90 group-hover:opacity-100"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="design-desc" className="text-xs font-semibold">
                Customer Description (Optional)
              </Label>
              <Textarea
                id="design-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Details on paper type, gloss/matte finish, bottle size suitability (e.g. Suitable for 250ml and 500ml bottles with customized couple names)..."
                rows={2}
                className="text-xs bg-secondary/50 rounded-xl resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="design-tags" className="text-xs font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-sky-400" /> Tags (Comma separated)
              </Label>
              <Input
                id="design-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="Wedding, Golden Foil, Matte, 500ml, Royal"
                className="h-10 text-xs bg-secondary/50 rounded-xl"
              />
            </div>

            {/* Internal Notes (Admin Only) */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Label
                htmlFor="design-notes"
                className="text-xs font-semibold text-amber-500 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Internal Notes (Admin Only — Hidden from Customers)
              </Label>
              <Textarea
                id="design-notes"
                value={formInternalNotes}
                onChange={(e) => setFormInternalNotes(e.target.value)}
                placeholder="Supplier printer contact, raw cost per 1000 pcs, printing plates info, minimum batch notes..."
                rows={2}
                className="text-xs bg-background/60 rounded-xl resize-none border-amber-500/30 text-foreground"
              />
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border">
              <div>
                <Label className="text-xs font-semibold">Catalog Visibility</Label>
                <p className="text-[11px] text-muted-foreground">
                  {formStatus
                    ? 'Active — Visible to customers in catalog'
                    : 'Inactive — Hidden from public catalog'}
                </p>
              </div>
              <Switch checked={formStatus} onCheckedChange={setFormStatus} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={saving}
                className="rounded-xl text-xs h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || uploadingImage}
                className="water-shimmer text-white font-semibold rounded-xl text-xs h-10 px-5 shadow-md shadow-sky-500/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : editingDesign ? (
                  'Update Design'
                ) : (
                  'Create Design'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Bottle Design?"
        message="Are you sure you want to delete this custom bottle design from the catalog? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={deleting}
        onConfirm={() => deletingId && handleDeleteDesign(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
