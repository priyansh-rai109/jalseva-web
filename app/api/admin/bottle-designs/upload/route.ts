import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'bottle-design-images'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function verifySuperAdmin() {
  const serverSupabase = await createClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'super_admin'
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 })
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
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true })
    }

    const uploadedUrls: string[] = []

    for (const file of uploadQueue) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP images.` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the maximum 10MB size limit.` },
          { status: 400 }
        )
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `design-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('[Bottle Design Image Upload Error]', uploadError)
        return NextResponse.json({ error: `Failed to upload ${file.name}: ${uploadError.message}` }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl)
      }
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
