// components/Layout.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, getSession } from '../login/supabase'
import { Session } from '@supabase/supabase-js'

export default function Layout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getSession().then((session) => {
      setSession(session)
      setLoading(false)
      
      // Redirect to login if not authenticated
      if (!session && router.pathname !== '/login') {
        router.push('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session && router.pathname !== '/login') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session && (
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold text-gray-900">Logic Legends</h1>
                <div className="hidden sm:flex space-x-8">
                  <a href="/problems" className="text-gray-700 hover:text-gray-900">Problems</a>
                  <a href="/submissions" className="text-gray-700 hover:text-gray-900">Submissions</a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{session.user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}