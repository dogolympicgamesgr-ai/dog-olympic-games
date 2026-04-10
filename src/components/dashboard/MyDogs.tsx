'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function MyDogs({ dogs, profile, onSave }: { dogs: any[], profile: any, onSave: () => void }) {
  const { t } = useLang()
  const supabase = createClient()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [breeds, setBreeds] = useState<any[]>([])
  const [breedsLoading, setBreedsLoading] = useState(false)
  const [form, setForm] = useState({ name: '', breed_id: '', date_of_birth: '', gender: '', neutered: false })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeDogId, setActiveDogId] = useState<string | null>(null)

  async function loadBreeds() {
    if (breeds.length > 0) return // already loaded, don't refetch
    setBreedsLoading(true)
    const { data, error } = await supabase.from('breeds').select('id, name').order('name')
    if (error) console.error('breeds load error:', error)
    setBreeds(data || [])
    setBreedsLoading(false)
  }

  async function handleAddDog() {
    if (!form.name || !profile?.id) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('dogs').insert({
      owner_id: profile.id,
      name: form.name,
      breed_id: form.breed_id ? parseInt(form.breed_id) : null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      neutered: form.neutered,
    })
    setSaving(false)
    if (error) {
      console.error('add dog error:', error)
      setSaveError(error.message)
    } else {
      setForm({ name: '', breed_id: '', date_of_birth: '', gender: '', neutered: false })
      setAdding(false)
      setSaveError(null)
      onSave()
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, dogId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFor(dogId)
    try {
      const compressed = await compressImage(file, 400)
      const path = `${profile.id}/${dogId}.jpg`
      const { error: uploadError } = await supabase.storage.from('dogs').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('dogs').getPublicUrl(path)
      await supabase.from('dogs').update({ photo_url: data.publicUrl + '?t=' + Date.now() }).eq('id', dogId)
      onSave()
    } catch (err) {
      console.error('photo upload error:', err)
    }
    setUploadingFor(null)
  }

  async function compressImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize } }
        else { if (h > maxSize) { w = w * maxSize / h; h = maxSize } }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.82)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', marginBottom: '0.75rem',
  }

  const labelStyle = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }

  return (
    <div>
      {dogs.map(dog => (
        <div key={dog.id} style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '2px solid var(--accent)', overflow: 'hidden',
              background: 'var(--bg-card)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}
            onClick={() => { setActiveDogId(dog.id); fileRef.current?.click() }}
          >
            {dog.photo_url
              ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.4rem' }}>🐕</span>
            }
            {uploadingFor === dog.id && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white' }}>...</div>
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{dog.name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {dog.dog_id}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {dog.gender === 'male' ? t('Αρσενικό', 'Male') : dog.gender === 'female' ? t('Θηλυκό', 'Female') : ''}
              {dog.neutered ? ` · ${t('Στειρωμένο', 'Neutered')}` : ''}
            </p>
          </div>
        </div>
      ))}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => activeDogId && handlePhotoUpload(e, activeDogId)} />

      {!adding ? (
        <button onClick={() => { setAdding(true); loadBreeds() }} style={{
          width: '100%', background: 'var(--bg)', border: '1px dashed var(--accent)',
          borderRadius: '10px', padding: '1rem', color: 'var(--accent)',
          cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
          marginTop: '0.5rem',
        }}>
          + {t('Προσθήκη Σκύλου', 'Add Dog')}
        </button>
      ) : (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
          <label style={labelStyle}>{t('Όνομα *', 'Name *')}</label>
          <input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('Όνομα σκύλου', 'Dog name')} />

          <label style={labelStyle}>{t('Φυλή', 'Breed')}</label>
          <select style={inputStyle} value={form.breed_id} onChange={e => setForm({...form, breed_id: e.target.value})}>
            <option value="">{breedsLoading ? t('Φόρτωση...', 'Loading...') : t('Επιλογή φυλής', 'Select breed')}</option>
            {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label style={labelStyle}>{t('Ημ. Γέννησης', 'Date of Birth')}</label>
          <input type="date" style={inputStyle} value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />

          <label style={labelStyle}>{t('Φύλο', 'Gender')}</label>
          <select style={inputStyle} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
            <option value="">{t('Επιλογή', 'Select')}</option>
            <option value="male">{t('Αρσενικό', 'Male')}</option>
            <option value="female">{t('Θηλυκό', 'Female')}</option>
          </select>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t('Στειρωμένο', 'Neutered')}</span>
            <div
              style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.neutered ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
              onClick={() => setForm({...form, neutered: !form.neutered})}
            >
              <div style={{ position: 'absolute', top: '3px', left: form.neutered ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
          </div>

          {saveError && (
            <p style={{ color: '#f77e7e', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {t('Σφάλμα:', 'Error:')} {saveError}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setAdding(false); setSaveError(null) }} style={{
              flex: 1, background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.75rem', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            }}>
              {t('Ακύρωση', 'Cancel')}
            </button>
            <button onClick={handleAddDog} disabled={saving || !form.name} style={{
              flex: 1, background: 'var(--accent)', border: 'none',
              borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)',
              fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Outfit, sans-serif', opacity: saving || !form.name ? 0.7 : 1,
            }}>
              {saving ? t('...', '...') : t('Αποθήκευση', 'Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}