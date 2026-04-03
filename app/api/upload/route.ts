import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { mkdir } from 'fs/promises'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = Date.now() + '_' + file.name.replaceAll(' ', '_')
    
    const uploadDir = path.join(process.cwd(), 'public/uploads')
    
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {
      // Directory already exists or cannot be created
    }

    await writeFile(path.join(uploadDir, filename), buffer)
    
    return NextResponse.json({ imageUrl: `/uploads/${filename}` })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
