import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { device_identifier, device_secret_hash, device_secret } = body ?? {}

  if (!device_identifier || (!device_secret_hash && !device_secret)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const secretHash = device_secret_hash
    ? String(device_secret_hash).toLowerCase()
    : createHash('sha256').update(String(device_secret)).digest('hex')

  const devices = await sql`
    SELECT current_note
    FROM devices
    WHERE device_identifier = ${device_identifier}
      AND device_secret_hash = ${secretHash}
    LIMIT 1
  `

  if (devices.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  return NextResponse.json({ current_note: devices[0].current_note ?? '' })
}
