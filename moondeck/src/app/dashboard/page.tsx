'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Device = {
  id: string
  device_identifier: string
  device_name: string
  current_note: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [deviceId, setDeviceId] = useState('')
  const [deviceSecret, setDeviceSecret] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({})

  const getToken = async () => {
    const session = await supabase.auth.getSession()
    return session.data.session?.access_token ?? null
  }

  const loadDevices = async () => {
    setIsLoadingDevices(true)
    setDevicesError(null)

    const token = await getToken()

    if (!token) {
      setDevicesError('Please log in again.')
      setIsLoadingDevices(false)
      return
    }

    const res = await fetch('/api/devices', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const data = await res.json()

    if (!res.ok) {
      setDevicesError(data?.error ?? 'Failed to load devices.')
      setIsLoadingDevices(false)
      return
    }

    const loadedDevices = data as Device[]
    setDevices(loadedDevices)
    setNoteEdits(
      Object.fromEntries(
        loadedDevices.map((device) => [device.id, device.current_note ?? ''])
      )
    )
    setIsLoadingDevices(false)
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.replace('/')
        return
      }

      await loadDevices()
    }

    checkUser()
  }, [router, supabase])

  const registerDevice = async () => {
    setIsSubmitting(true)
    setStatus(null)

    const token = await getToken()

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
    await loadDevices()
  }

  const updateNote = async (deviceId: string) => {
    setStatus(null)

    const token = await getToken()
    if (!token) {
      setStatus('Please log in again.')
      return
    }

    const res = await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        current_note: noteEdits[deviceId] ?? ''
      })
    })

    const data = await res.json()

    if (!res.ok) {
      setStatus(data?.error ?? 'Failed to update note.')
      return
    }

    setStatus('Note updated.')
    await loadDevices()
  }

  const deleteDevice = async (deviceId: string) => {
    setStatus(null)

    const token = await getToken()
    if (!token) {
      setStatus('Please log in again.')
      return
    }

    const res = await fetch(`/api/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const data = await res.json()

    if (!res.ok) {
      setStatus(data?.error ?? 'Failed to delete device.')
      return
    }

    setStatus('Device deleted.')
    await loadDevices()
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

      <section className="pt-4">
        <h2 className="text-lg font-semibold">My Devices</h2>

        {isLoadingDevices ? (
          <p className="text-sm text-neutral-600">Loading devices...</p>
        ) : null}

        {devicesError ? (
          <p className="text-sm text-red-600">{devicesError}</p>
        ) : null}

        {!isLoadingDevices && !devicesError && devices.length === 0 ? (
          <p className="text-sm text-neutral-600">No devices yet.</p>
        ) : null}

        {!isLoadingDevices && !devicesError && devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="border border-neutral-200 px-3 py-3 space-y-2"
              >
                <div className="font-medium">{device.device_name}</div>
                <div className="text-xs text-neutral-500">
                  ID: {device.device_identifier}
                </div>
                <div className="space-y-2">
                  <textarea
                    className="w-full border border-neutral-300 px-3 py-2 text-sm"
                    rows={3}
                    value={noteEdits[device.id] ?? ''}
                    onChange={(e) =>
                      setNoteEdits((prev) => ({
                        ...prev,
                        [device.id]: e.target.value
                      }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateNote(device.id)}
                      className="bg-black text-white px-3 py-1 text-sm"
                    >
                      Save Note
                    </button>
                    <button
                      onClick={() => deleteDevice(device.id)}
                      className="bg-red-500 text-white px-3 py-1 text-sm"
                    >
                      Delete Device
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}