import { BottleDesign } from '@/types/bottle-printing'

const BUCKET_NAME = 'bottle-design-images'
const FALLBACK_STORAGE_PATH = 'catalog-data/designs.json'

/**
 * Check if a Supabase PostgREST error is caused by missing bottle_designs table
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.message?.includes('bottle_designs') ||
    error.message?.includes('schema cache') ||
    error.details?.includes('bottle_designs')
  )
}

/**
 * Fetch designs from Supabase Storage JSON fallback
 */
async function getFallbackDesigns(adminClient: any): Promise<BottleDesign[]> {
  try {
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .download(FALLBACK_STORAGE_PATH)

    if (error || !data) {
      return []
    }

    const text = await data.text()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('[BottleDesigns Fallback] Could not read fallback storage:', err)
    return []
  }
}

/**
 * Save designs array to Supabase Storage JSON fallback
 */
async function saveFallbackDesigns(adminClient: any, designs: BottleDesign[]): Promise<boolean> {
  try {
    const buffer = Buffer.from(JSON.stringify(designs, null, 2), 'utf-8')
    const { error } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(FALLBACK_STORAGE_PATH, buffer, {
        contentType: 'application/json',
        upsert: true,
      })

    if (error) {
      console.error('[BottleDesigns Fallback] Error saving fallback storage:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[BottleDesigns Fallback] Failed saving fallback storage:', err)
    return false
  }
}

/**
 * Sync helper: If database table bottle_designs exists, and has 0 rows, but fallback has designs,
 * auto-migrate fallback designs into the database table.
 */
async function trySyncFallbackToTable(adminClient: any, fallbackDesigns: BottleDesign[]) {
  if (fallbackDesigns.length === 0) return
  try {
    const { count } = await adminClient
      .from('bottle_designs')
      .select('*', { count: 'exact', head: true })

    if (count === 0) {
      console.log(`[BottleDesigns] Migrating ${fallbackDesigns.length} fallback designs to database table...`)
      for (const d of fallbackDesigns) {
        await adminClient.from('bottle_designs').insert({
          id: d.id,
          design_code: d.design_code,
          title: d.title,
          occasion_category: d.occasion_category,
          description: d.description || null,
          tags: d.tags || [],
          images: d.images || [],
          status: d.status || 'active',
          internal_notes: d.internal_notes || null,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        })
      }
    }
  } catch {
    // Ignore migration error if table still missing
  }
}

/**
 * ─── List Bottle Designs ────────────────────────────────────────────────────
 */
export async function listBottleDesigns(
  adminClient: any,
  options: {
    category?: string | null
    status?: string | null
    search?: string | null
    activeOnly?: boolean
  } = {}
): Promise<{ designs: BottleDesign[]; isFallback: boolean }> {
  const { category, status, search, activeOnly } = options

  // 1. Try querying PostgreSQL table
  try {
    let query = adminClient
      .from('bottle_designs')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('status', 'active')
    } else if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category && category !== 'all') {
      query = query.eq('occasion_category', category)
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,design_code.ilike.%${search.trim()}%`)
    }

    const { data: dbDesigns, error } = await query

    if (!error && Array.isArray(dbDesigns)) {
      // Check if fallback has items that can be synced
      const fallback = await getFallbackDesigns(adminClient)
      if (dbDesigns.length === 0 && fallback.length > 0) {
        await trySyncFallbackToTable(adminClient, fallback)
        // re-query after migration
        const { data: migrated } = await query
        if (migrated && migrated.length > 0) {
          return { designs: migrated, isFallback: false }
        }
      }
      return { designs: dbDesigns, isFallback: false }
    }

    if (error && !isTableMissingError(error)) {
      throw error
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      console.error('[BottleDesigns listBottleDesigns DB Error]', err)
    }
  }

  // 2. Table missing fallback: read from storage
  let list = await getFallbackDesigns(adminClient)

  if (activeOnly) {
    list = list.filter((d) => d.status === 'active')
  } else if (status && status !== 'all') {
    list = list.filter((d) => d.status === status)
  }

  if (category && category !== 'all') {
    list = list.filter(
      (d) => d.occasion_category?.toLowerCase() === category.toLowerCase()
    )
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      (d) =>
        d.title?.toLowerCase().includes(q) ||
        d.design_code?.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }

  // Sort descending by created_at
  list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

  return { designs: list, isFallback: true }
}

/**
 * ─── Get Single Design by Design Code ───────────────────────────────────────
 */
export async function getBottleDesignByCode(
  adminClient: any,
  designCode: string,
  activeOnly = true
): Promise<BottleDesign | null> {
  const code = designCode.trim().toUpperCase()

  // 1. Try DB
  try {
    let query = adminClient
      .from('bottle_designs')
      .select('*')
      .eq('design_code', code)

    if (activeOnly) {
      query = query.eq('status', 'active')
    }

    const { data, error } = await query.maybeSingle()

    if (!error && data) {
      return data as BottleDesign
    }

    if (error && !isTableMissingError(error)) {
      throw error
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      console.error('[BottleDesigns getByCode DB Error]', err)
    }
  }

  // 2. Fallback storage
  const list = await getFallbackDesigns(adminClient)
  const item = list.find((d) => d.design_code?.toUpperCase() === code)

  if (!item) return null
  if (activeOnly && item.status !== 'active') return null

  return item
}

/**
 * ─── Create Bottle Design ──────────────────────────────────────────────────
 */
export async function createBottleDesign(
  adminClient: any,
  payload: {
    design_code: string
    title: string
    occasion_category: string
    description?: string | null
    tags?: string[]
    images: string[]
    status?: 'active' | 'inactive'
    internal_notes?: string | null
  }
): Promise<{ design: BottleDesign; isFallback: boolean }> {
  const cleanCode = payload.design_code.trim().toUpperCase()

  // 1. Try DB
  try {
    // Check duplicate code
    const { data: existing } = await adminClient
      .from('bottle_designs')
      .select('id')
      .eq('design_code', cleanCode)
      .maybeSingle()

    if (existing) {
      throw new Error(`Design code "${cleanCode}" already exists. Please choose a unique code.`)
    }

    const { data: newDbDesign, error } = await adminClient
      .from('bottle_designs')
      .insert({
        design_code: cleanCode,
        title: payload.title.trim(),
        occasion_category: payload.occasion_category.trim(),
        description: payload.description?.trim() || null,
        tags: payload.tags || [],
        images: payload.images,
        status: payload.status || 'active',
        internal_notes: payload.internal_notes?.trim() || null,
      })
      .select()
      .single()

    if (!error && newDbDesign) {
      return { design: newDbDesign, isFallback: false }
    }

    if (error && !isTableMissingError(error)) {
      throw error
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      throw err
    }
  }

  // 2. Fallback Storage
  const list = await getFallbackDesigns(adminClient)

  if (list.some((d) => d.design_code?.toUpperCase() === cleanCode)) {
    throw new Error(`Design code "${cleanCode}" already exists. Please choose a unique code.`)
  }

  const now = new Date().toISOString()
  const fallbackDesign: BottleDesign = {
    id: crypto.randomUUID(),
    design_code: cleanCode,
    title: payload.title.trim(),
    occasion_category: payload.occasion_category.trim(),
    description: payload.description?.trim() || null,
    tags: payload.tags || [],
    images: payload.images,
    status: payload.status || 'active',
    internal_notes: payload.internal_notes?.trim() || null,
    created_at: now,
    updated_at: now,
  }

  const updatedList = [fallbackDesign, ...list]
  await saveFallbackDesigns(adminClient, updatedList)

  return { design: fallbackDesign, isFallback: true }
}

/**
 * ─── Update Bottle Design ──────────────────────────────────────────────────
 */
export async function updateBottleDesign(
  adminClient: any,
  id: string,
  updates: Partial<BottleDesign>
): Promise<{ design: BottleDesign; isFallback: boolean }> {
  const cleanUpdates: Record<string, any> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (updates.design_code) {
    cleanUpdates.design_code = updates.design_code.trim().toUpperCase()
  }

  // 1. Try DB
  try {
    if (cleanUpdates.design_code) {
      const { data: duplicate } = await adminClient
        .from('bottle_designs')
        .select('id')
        .eq('design_code', cleanUpdates.design_code)
        .neq('id', id)
        .maybeSingle()

      if (duplicate) {
        throw new Error(`Design code "${cleanUpdates.design_code}" is already in use by another design.`)
      }
    }

    const { data: updatedDbDesign, error } = await adminClient
      .from('bottle_designs')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (!error && updatedDbDesign) {
      return { design: updatedDbDesign, isFallback: false }
    }

    if (error && !isTableMissingError(error)) {
      throw error
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      throw err
    }
  }

  // 2. Fallback storage
  const list = await getFallbackDesigns(adminClient)

  if (cleanUpdates.design_code) {
    const duplicate = list.find(
      (d) => d.id !== id && d.design_code?.toUpperCase() === cleanUpdates.design_code
    )
    if (duplicate) {
      throw new Error(`Design code "${cleanUpdates.design_code}" is already in use by another design.`)
    }
  }

  let updatedDesign: BottleDesign | null = null
  const updatedList = list.map((d) => {
    if (d.id === id) {
      updatedDesign = { ...d, ...cleanUpdates }
      return updatedDesign
    }
    return d
  })

  if (!updatedDesign) {
    throw new Error('Design not found')
  }

  await saveFallbackDesigns(adminClient, updatedList)
  return { design: updatedDesign, isFallback: true }
}

/**
 * ─── Delete Bottle Design ──────────────────────────────────────────────────
 */
export async function deleteBottleDesign(
  adminClient: any,
  id: string
): Promise<{ success: boolean; isFallback: boolean }> {
  let isFallback = false

  // 1. Try DB
  try {
    const { error } = await adminClient.from('bottle_designs').delete().eq('id', id)
    if (error && !isTableMissingError(error)) {
      throw error
    }
    if (error && isTableMissingError(error)) {
      isFallback = true
    }
  } catch (err: any) {
    if (!isTableMissingError(err)) {
      throw err
    }
    isFallback = true
  }

  // Also remove from fallback storage if present
  const list = await getFallbackDesigns(adminClient)
  const filtered = list.filter((d) => d.id !== id)
  if (filtered.length !== list.length) {
    await saveFallbackDesigns(adminClient, filtered)
    isFallback = true
  }

  return { success: true, isFallback }
}
