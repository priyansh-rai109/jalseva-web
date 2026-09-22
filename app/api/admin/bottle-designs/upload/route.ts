import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'bottle-design-images'
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif', 'heic', 'heif']

/**
 * Verify that the requesting user is a Super Admin
 */
async function verifySuperAdmin(): Promise<boolean> {
  try {
    const serverSupabase = await createClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    if (!user) return false

    // 1. Direct metadata / known admin email check
    if (user.user_metadata?.role === 'super_admin' || user.email === 'raipriyansh45@gmail.com') {
      return true
    }

    // 2. Query profiles with service role client to bypass RLS restrictions
    const adminSupabase = createAdminClient()
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    return profile?.role === 'super_admin'
  } catch (err) {
    console.warn('[Bottle Design Upload verifySuperAdmin Warning]', err)
    return false
  }
}

/**
 * Normalize MIME content-type for Supabase storage
 */
function getNormalizedContentType(ext: string, detectedType?: string): string {
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'avif') return 'image/avif'
  return detectedType || 'image/jpeg'
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Super Admin access required to upload designs.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File | null

    const uploadQueue: File[] = []
    if (singleFile && singleFile.size > 0) uploadQueue.push(singleFile)
    for (const f of files) {
      if (f && f.size > 0 && !uploadQueue.includes(f)) {
        uploadQueue.push(f)
      }
    }

    if (uploadQueue.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)
      if (!bucketExists) {
        await supabase.storage.createBucket(BUCKET_NAME, { public: true })
      }
    } catch (bucketErr) {
      console.warn('[Bottle Design Upload Bucket Check Warning]', bucketErr)
    }

    const uploadedUrls: string[] = []

    for (const file of uploadQueue) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const fileType = (file.type || '').toLowerCase()

      const isValidFormat =
        ALLOWED_MIME_TYPES.includes(fileType) || ALLOWED_EXTENSIONS.includes(ext)

      if (!isValidFormat) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is not a recognized image format. Please upload JPG, PNG, WEBP, or SVG images.`,
          },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum 15MB size limit.` },
          { status: 400 }
        )
      }

      const fileName = `design-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
      const contentType = getNormalizedContentType(ext, fileType)

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[Bottle Design Image Upload Error]', uploadError)
        return NextResponse.json(
          { error: `Failed to upload "${file.name}": ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl)
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image uploaded but public URL could not be resolved.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0] || null,
    })
  } catch (err: any) {
    console.error('[Bottle Design Upload Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
