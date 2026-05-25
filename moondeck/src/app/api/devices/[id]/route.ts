import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sql } from '@/lib/db'

async function getUserId(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'No auth' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return { error: NextResponse.json({ error: 'No auth token' }, { status: 401 }) }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: userData, error } = await supabase.auth.getUser(token)

  if (error || !userData.user) {
    return { error: NextResponse.json({ error: 'Invalid user' }, { status: 401 }) }
  }

  return { userId: userData.user.id }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getUserId(req)
  if (auth.error) {
    return auth.error
  }

  const body = await req.json()
  const { current_note } = body ?? {}

  if (typeof current_note !== 'string') {
    return NextResponse.json({ error: 'Missing note' }, { status: 400 })
  }

  const updated = await sql`
    UPDATE devices
    SET current_note = ${current_note}
    WHERE id = ${id}
      AND user_id = ${auth.userId}
    RETURNING id, current_note
  `

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  return NextResponse.json(updated[0])
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getUserId(req)
  if (auth.error) {
    return auth.error
  }

  const deleted = await sql`
    DELETE FROM devices
    WHERE id = ${id}
      AND user_id = ${auth.userId}
    RETURNING id
  `

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
