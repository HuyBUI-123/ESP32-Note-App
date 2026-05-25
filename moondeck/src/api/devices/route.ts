import { sql } from '@/lib/db'

export async function GET() {
  const devices = await sql`
    SELECT id, device_name, current_note
    FROM devices
  `

  return Response.json(devices)
}