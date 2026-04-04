import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const sanitizeFilename = (filename: string) => {
  return filename.replaceAll(/\s+/g, '_').replaceAll(/[^a-zA-Z0-9._-]/g, '')
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large.' }, { status: 400 })
    }

    const safeName = sanitizeFilename(file.name || 'upload')
    const pathname = `uploads/${Date.now()}_${safeName || 'upload'}`

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })

    return NextResponse.json({ imageUrl: blob.url })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
