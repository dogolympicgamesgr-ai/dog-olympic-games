'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDogs() {
  const supabase = createClient()
  const router = useRouter()
  const [dogs, setDogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [breedFilter, setBreedFilter] = useState('')
  const [showStats, setShowStats] = useState(false)

  useEffect(() => { loadDogs() }, [])

  async function loadDogs() {
    setLoading(true)
    const { data } = await supabase
      .from('dogs')
      .select('*, profiles(full_name, member_id), breeds(name)')
      .order('dog_id')
    setDogs(data || [])
    setLoading(false)
  }

  // Breed stats — only breeds present in registered dogs
  const breedCounts: Record<string, number> = {}
  dogs.forEach(d => {
    const breed = d.breeds?.name || 'Unknown'
    breedCounts[breed] = (breedCounts[breed] || 0) + 1
  })
  const sortedBreeds = Object.entries(breedCounts).sort((a, b) => b[1] - a[1])
  const uniqueBreeds = sortedBreeds.map(([name]) => name)

  const filtered = dogs.filter(d => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.dog_id?.includes(search) ||
      d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.profiles?.member_id?.includes(search)
    const matchesBreed = !breedFilter || (d.breeds?.name || 'Unknown') === breedFilter
    return matchesSearch && matchesBreed
  })

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search by dog name, dog ID, owner name or member ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', outline: 'none' }}
        />
        <select
          value={breedFilter}
          onChange={e => setBreedFilter(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: breedFilter ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.88rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
        >
          <option value="">All breeds</option>
          {uniqueBreeds.map(breed => (
            <option key={breed} value={breed}>{breed} ({breedCounts[breed]})</option>
          ))}
        </select>
        <button
          onClick={() => setShowStats(!showStats)}
          style={{ background: showStats ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: showStats ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
        >
          📊 Breed Stats
        </button>
      </div>

      {/* Breed stats panel */}
      {showStats && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
            Registered Breeds — {dogs.length} dogs · {sortedBreeds.length} breeds
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {sortedBreeds.map(([breed, count]) => (
              <div
                key={breed}
                onClick={() => { setBreedFilter(breedFilter === breed ? '' : breed); setShowStats(false) }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: breedFilter === breed ? 'var(--accent)22' : 'var(--bg)', border: `1px solid ${breedFilter === breed ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{breed}</span>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', marginLeft: '0.5rem' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      {(search || breedFilter) && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {breedFilter && ` · ${breedFilter}`}
          {search && ` · "${search}"`}
          {(search || breedFilter) && (
            <button onClick={() => { setSearch(''); setBreedFilter('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              Clear filters
            </button>
          )}
        </p>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No dogs found</p>
          )}
          {filtered.map(dog => (
            <div key={dog.id} onClick={() => router.push(`/dogs/${dog.id}`)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}