import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'bottle-design-images'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

// CORS headers for browser-based uploads
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

function addCorsHeaders(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

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
    const contentTypeHeader = request.headers.get('content-type') || ''
    const supabase = createAdminClient()

    // Ensure bucket exists in Supabase Storage with public access
    let bucketReady = false
    try {
      const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
      console.log('[Bottle Design Upload] Existing buckets:', buckets)
      
      if (listErr) {
        console.error('[Bottle Design Upload] Failed to list buckets:', listErr)
      } else {
        const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)
        if (!bucketExists) {
          console.log('[Bottle Design Upload] Bucket not found, creating...')
          const { data: createData, error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, { public: true, fileSizeLimit: MAX_FILE_SIZE.toString() })
          if (createErr) {
            console.error('[Bottle Design Upload] Failed to create bucket:', createErr)
          } else {
            console.log('[Bottle Design Upload] Bucket created successfully:', createData)
          }
        } else {
          console.log('[Bottle Design Upload] Bucket already exists')
        }
      }
      bucketReady = true
    } catch (bucketErr) {
      console.error('[Bottle Design Upload] Bucket setup error:', bucketErr)
      bucketReady = false
    }

    // Fallback: continue even if bucket setup failed (images will be stored as data URLs)
    
    const uploadedUrls: string[] = []

    // ─── Case 1: JSON payload with Base64 Images ────────────────────────────
    if (contentTypeHeader.includes('application/json')) {
      const body = await request.json()
      const images: Array<{ data: string; name?: string }> = Array.isArray(body.images)
        ? body.images
        : body.data
        ? [{ data: body.data, name: body.name }]
        : []

      for (const img of images) {
        if (!img.data) continue

        // Check if already a remote HTTP URL
        if (img.data.startsWith('http://') || img.data.startsWith('https://')) {
          uploadedUrls.push(img.data)
          continue
        }

        // Data URL format: "data:image/png;base64,iVBORw0KG..."
        const matches = img.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (!matches || matches.length !== 3) {
          // Fallback: accept as direct string
          uploadedUrls.push(img.data)
          continue
        }

        const mimeType = matches[1].toLowerCase()
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        let ext = 'jpg'
        if (mimeType.includes('png')) ext = 'png'
        else if (mimeType.includes('webp')) ext = 'webp'
        else if (mimeType.includes('svg')) ext = 'svg'

        const fileName = `design-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
            cacheControl: '3600',
          })

        if (!uploadError) {
          console.log('[Base64 Upload] File uploaded:', fileName, uploadData)
          const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
          if (publicUrlData?.publicUrl) {
            console.log('[Base64 Upload] Public URL:', publicUrlData.publicUrl)
            uploadedUrls.push(publicUrlData.publicUrl)
          } else {
            uploadedUrls.push(img.data)
          }
        } else {
          console.warn('[Base64 Storage Upload Warning, falling back to data URL]', uploadError.message)
          uploadedUrls.push(img.data)
        }
      }

      return NextResponse.json({
        success: true,
        urls: uploadedUrls,
        url: uploadedUrls[0] || null,
      })
    }

    // ─── Case 2: Multipart FormData (Standard File Upload) ──────────────────
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

    for (const file of uploadQueue) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const fileType = (file.type || '').toLowerCase()

      const isValidFormat =
        ALLOWED_MIME_TYPES.includes(fileType) ||
        ALLOWED_EXTENSIONS.includes(ext) ||
        fileType.startsWith('image/')

      if (!isValidFormat) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is not a recognized image format. Please select JPG, PNG, WEBP, or SVG images.`,
          },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum 25MB size limit.` },
          { status: 400 }
        )
      }

      const fileName = `design-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext || 'jpg'}`
      const contentType = getNormalizedContentType(ext, fileType)

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError, data: uploadData } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
            cacheControl: '3600',
          })

      if (uploadError) {
        console.error('[Bottle Design Storage Upload Error]', uploadError.message, uploadError)
        // If storage fails, convert to base64 data URL so the client is never blocked
        const base64Fallback = `data:${contentType};base64,${buffer.toString('base64')}`
        uploadedUrls.push(base64Fallback)
      } else {
        console.log('[Bottle Design Upload] File uploaded:', fileName, uploadData)
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
        if (publicUrlData?.publicUrl) {
          console.log('[Bottle Design Upload] Public URL:', publicUrlData.publicUrl)
          uploadedUrls.push(publicUrlData.publicUrl)
        } else {
          const base64Fallback = `data:${contentType};base64,${buffer.toString('base64')}`
          uploadedUrls.push(base64Fallback)
        }
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Could not process uploaded image file.' },
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
    return addCorsHeaders(NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 }))
  }
}
