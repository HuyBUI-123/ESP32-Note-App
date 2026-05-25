'use client'

import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [devices, setDevices] = useState([])

  const loadDevices = async () => {
    const res = await fetch('/api/devices')
    const data = await res.json()
    setDevices(data)
  }

  useEffect(() => {
    loadDevices()
  }, [])

  return (
    <main className="p-10">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {devices.map((d: any) => (
        <div key={d.id} className="border p-3 mt-2">
          <p>{d.device_name}</p>
          <p>{d.current_note}</p>
        </div>
      ))}
    </main>
  )
}