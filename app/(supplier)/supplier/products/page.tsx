'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Droplets,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils'
import type { WaterProduct } from '@/types'

const productSchema = z.object({
  name: z.string().min(2, 'Name required'),
  type: z.enum(['tanker', 'can', 'pouch']),
  capacity_liters: z.string().optional(),
  price: z.string().min(1, 'Price required'),
  unit: z.string().min(1, 'Unit required'),
  stock: z.string().min(1, 'Stock required'),
  description: z.string().optional(),
})

type ProductForm = z.infer<typeof productSchema>

const productTypeIcons = { tanker: '🚛', can: '🫙', pouch: '💧' }
const productTypeColors = {
  tanker: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  can: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  pouch: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

export default function SupplierProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<WaterProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<WaterProduct | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { type: 'can', unit: 'piece', stock: '100' },
  })

  const selectedType = watch('type')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: supplier } = await supabase.from('suppliers').select('id').eq('user_id', user.id).single()
      if (supplier) {
        setSupplierId(supplier.id)
        fetchProducts(supplier.id)
      }
    }
    init()
  }, [])

  const fetchProducts = async (sid: string) => {
    setLoading(true)
    const { data } = await supabase.from('water_products').select('*').eq('supplier_id', sid).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const openEdit = (product: WaterProduct) => {
    setEditProduct(product)
    reset({
      name: product.name,
      type: product.type,
      capacity_liters: product.capacity_liters?.toString() || '',
      price: product.price.toString(),
      unit: product.unit,
      stock: product.stock.toString(),
      description: product.description || '',
    })
    setSheetOpen(true)
  }

  const openNew = () => {
    setEditProduct(null)
    reset({ type: 'can', unit: 'piece', stock: '100' })
    setSheetOpen(true)
  }

  const onSubmit = async (data: ProductForm) => {
    if (!supplierId) return
    setSaving(true)

    const payload = {
      supplier_id: supplierId,
      name: data.name,
      type: data.type,
      capacity_liters: data.capacity_liters ? parseFloat(data.capacity_liters) : null,
      price: parseFloat(data.price),
      unit: data.unit,
      stock: parseInt(data.stock),
      description: data.description || null,
      is_active: true,
    }

    if (editProduct) {
      const { error } = await supabase.from('water_products').update(payload).eq('id', editProduct.id)
      if (error) { toast.error('Failed to update product'); setSaving(false); return }
      toast.success('Product updated!')
    } else {
      const { error } = await supabase.from('water_products').insert(payload)
      if (error) { toast.error('Failed to create product'); setSaving(false); return }
      toast.success('Product added!')
    }

    setSaving(false)
    setSheetOpen(false)
    fetchProducts(supplierId)
  }

  const toggleActive = async (product: WaterProduct) => {
    await supabase.from('water_products').update({ is_active: !product.is_active }).eq('id', product.id)
    fetchProducts(supplierId!)
    toast.success(product.is_active ? 'Product hidden' : 'Product visible')
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('water_products').delete().eq('id', id)
    toast.success('Product deleted')
    fetchProducts(supplierId!)
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Products
          </h1>
          <p className="text-muted-foreground mt-1">Manage your water product listings</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger>
            <Button onClick={openNew} className="water-shimmer text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </SheetTrigger>

          <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>Product Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['tanker', 'can', 'pouch'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('type', t)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedType === t
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-border bg-secondary hover:border-sky-500/50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{productTypeIcons[t]}</div>
                      <div className="text-xs font-medium capitalize">{t}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input placeholder="e.g. 20L RO Water Can" className="bg-secondary" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" placeholder="30" className="bg-secondary" {...register('price')} />
                  {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input placeholder="piece / liter / dozen" className="bg-secondary" {...register('unit')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity (Liters)</Label>
                  <Input type="number" placeholder="20" className="bg-secondary" {...register('capacity_liters')} />
                </div>
                <div className="space-y-2">
                  <Label>Stock Available</Label>
                  <Input type="number" placeholder="100" className="bg-secondary" {...register('stock')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea placeholder="Describe your product..." className="bg-secondary resize-none" rows={3} {...register('description')} />
              </div>

              <Button type="submit" disabled={saving} className="w-full water-shimmer text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : editProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No products yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first water product to start receiving orders</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className={`glass-card transition-all ${!product.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{productTypeIcons[product.type]}</div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(product)} className="p-1.5 rounded-lg hover:bg-secondary">
                      {product.is_active ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-secondary">
                      <Pencil className="w-4 h-4 text-sky-400" />
                    </button>
                    <button onClick={() => deleteProduct(product.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{product.name}</h3>
                {product.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs border ${productTypeColors[product.type]}`}>{product.type}</Badge>
                  {product.capacity_liters && (
                    <Badge className="text-xs bg-secondary text-muted-foreground border-border">{product.capacity_liters}L</Badge>
                  )}
                  <Badge className="text-xs bg-secondary text-muted-foreground border-border">Stock: {product.stock}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-xs text-muted-foreground">per {product.unit}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
