'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import MyDogs from '@/components/dashboard/MyDogs'

export default function MyDogsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [dogs, setDogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user } = await res.json()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      await loadDogs(user.id)
    }
    init()
  }, [])

  async function loadDogs(userId: string) {
    setLoading(true)
    const { data } = await supabase.from('dogs').select('*').eq('owner_id', userId).order('created_at')
    setDogs(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem' }}
          >←</button>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            🐕 {t('Οι Σκύλοι μου', 'My Dogs')}
          </h1>
        </div>
        {profile && (
          <MyDogs
            dogs={dogs}
            profile={profile}
            onSave={() => loadDogs(profile.id)}
          />
        )}
      </div>
    </main>
  )
}
