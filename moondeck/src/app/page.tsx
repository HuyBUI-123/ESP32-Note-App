'use client'

import { createClient } from '@/utils/supabase/client'

export default function Home() {

  const handleTest = async () => {

    const supabase = createClient()

    const { data, error } = await supabase.auth.getSession()

    console.log(data)
    console.log(error)

    alert('Supabase connected!')
  }

  return (
    <main className="p-10">
      <button
        onClick={handleTest}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Test Supabase
      </button>
    </main>
  )
}