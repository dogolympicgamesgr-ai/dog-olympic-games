'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminDogs() {
  const supabase = createClient()
  const [dogs, setDogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadDogs() }, [])

  async function loadDogs() {
    setLoading(true)
    const { data } = await supabase.from('dogs').select('*, profiles(full_name, member_id), breeds(name)').order('dog_id')
    setDogs(data || [])
    setLoading(false)
  }

  const filtered = dogs.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.dog_id?.includes(search) ||
    d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.member_id?.includes(search)
  )

  return (
    <div>
      <input
        placeholder="Search by dog name, dog ID, owner name or member ID..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', marginBottom: '1rem', outline: 'none' }}
      />
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No dogs found</p>}
          {filtered.map(dog => (
            <div key={dog.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--accent)', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dog.photo_url ? <img src={dog.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} /> : <span>🐕</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {dog.name} <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>#{dog.dog_id}</span>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  {dog.breeds?.name || 'Unknown breed'} · {dog.gender || '—'} {dog.neutered ? '· Neutered' : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Owner</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{dog.profiles?.full_name}</p>
                <p style={{ color: 'var(--accent)', fontSize: '0.72rem' }}>#{dog.profiles?.member_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
