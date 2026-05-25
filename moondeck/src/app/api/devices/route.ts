import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sql } from '@/lib/db'

export async function GET(req: Request) {
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

  const devices = await sql`
    SELECT id, device_identifier, device_name, current_note, created_at
    FROM devices
    WHERE user_id = ${userData.user.id}
    ORDER BY created_at DESC
  `

  return NextResponse.json(devices)
}
