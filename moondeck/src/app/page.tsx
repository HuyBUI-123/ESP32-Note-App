'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const supabase = useMemo(() => createClient(), [])
  const [isAuthed, setIsAuthed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      setIsAuthed(!!data.user)
      setIsChecking(false)
    }

    checkUser()
  }, [supabase])

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
  }

  return (
    <main className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ESP32 Notes System</h1>
        <p className="text-sm text-neutral-600">
          Manage the note displayed on each ESP32 screen.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={login}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Login with Google
        </button>

        {!isChecking && isAuthed ? (
          <Link
            href="/dashboard"
            className="border border-neutral-300 px-4 py-2 rounded"
          >
            Go to Dashboard
          </Link>
        ) : null}
      </div>
    </main>
  )
}