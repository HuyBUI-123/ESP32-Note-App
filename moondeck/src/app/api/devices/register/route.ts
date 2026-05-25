import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sql } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No auth' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    const { data: userData, error } = await supabase.auth.getUser(token)

    if (error || !userData.user) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    const body = await req.json()
    const { device_identifier, device_secret, device_name } = body ?? {}

    if (!device_identifier || !device_secret || !device_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const secretHash = createHash('sha256')
      .update(device_secret)
      .digest('hex')

    await sql`
      INSERT INTO devices (
        user_id,
        device_identifier,
        device_secret_hash,
        device_name,
        current_note
      )
      VALUES (
        ${userData.user.id},
        ${device_identifier},
        ${secretHash},
        ${device_name},
        ''
      )
    `

    return NextResponse.json({
      success: true,
      device_identifier
    })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Device already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
