'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [deviceId, setDeviceId] = useState('')
  const [deviceSecret, setDeviceSecret] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.replace('/')
      }
    }

    checkUser()
  }, [router, supabase])

  const registerDevice = async () => {
    setIsSubmitting(true)
    setStatus(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (!token) {
      setStatus('Please log in again.')
      setIsSubmitting(false)
      return
    }

    const res = await fetch('/api/devices/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        device_identifier: deviceId.trim(),
        device_secret: deviceSecret,
        device_name: deviceName.trim()
      })
    })

    const data = await res.json()

    if (!res.ok) {
      setStatus(data?.error ?? 'Failed to register device.')
      setIsSubmitting(false)
      return
    }

    setStatus('Device registered!')
    setDeviceId('')
    setDeviceSecret('')
    setDeviceName('')
    setIsSubmitting(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <main className="p-10 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Register ESP32</h1>
        <p className="text-sm text-neutral-600">
          Link an ESP32 to your account by its ID and password.
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <input
          className="w-full border border-neutral-300 px-3 py-2"
          placeholder="Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        />
        <input
          className="w-full border border-neutral-300 px-3 py-2"
          placeholder="Device Password"
          type="password"
          value={deviceSecret}
          onChange={(e) => setDeviceSecret(e.target.value)}
        />
        <input
          className="w-full border border-neutral-300 px-3 py-2"
          placeholder="Device Name"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={registerDevice}
          disabled={isSubmitting}
          className="bg-black text-white px-3 py-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-2"
        >
          Logout
        </button>
      </div>

      {status ? <p className="text-sm text-neutral-700">{status}</p> : null}
    </main>
  )
}