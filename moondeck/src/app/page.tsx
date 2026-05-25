'use client'

import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
  }

  return (
    <main className="p-10">
      <button
        onClick={signInWithGoogle}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Login with Google
      </button>
    </main>
  )
}