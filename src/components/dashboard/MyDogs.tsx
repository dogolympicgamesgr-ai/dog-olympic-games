'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import Link from 'next/link'

export default function MyDogs({ dogs, profile, onSave }: { dogs: any[], profile: any, onSave: () => void }) {
  const { t } = useLang()
  const supabase = createClient()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [breeds, setBreeds] = useState<any[]>([])
  const [breedsLoading, setBreedsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', breed_id: '', date_of_birth: '', gender: '', neutered: false, chip_number: '',
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeDogId, setActiveDogId] = useState<string | null>(null)

  async function loadBreeds() {
    if (breeds.length > 0) return
    setBreedsLoading(true)
    const { data } = await supabase.from('breeds').select('id, name').order('name')
    setBreeds(data || [])
    setBreedsLoading(false)
  }

  function handleDateInput(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
    setForm({ ...form, date_of_birth: formatted })
  }

  function parseDateToISO(dmy: string): string | null {
    const parts = dmy.split('/')
    if (parts.length !== 3) return null
    const [dd, mm, yyyy] = parts
    if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return null
    const d = parseInt(dd), m = parseInt(mm), y = parseInt(yyyy)
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return null
    return `${yyyy}-${mm}-${dd}`
  }

  async function handleAddDog() {
    if (!form.name || !profile?.id) return

    if (!form.chip_number.trim()) {
      setSaveError(t('Ο αριθμός chip είναι υποχρεωτικός', 'Chip number is required'))
      return
    }

    const isoDate = form.date_of_birth ? parseDateToISO(form.date_of_birth) : null
    if (form.date_of_birth && !isoDate) {
      setSaveError(t('Μη έγκυρη ημερομηνία. Χρησιμοποιήστε ΗΗ/ΜΜ/ΕΕΕΕ', 'Invalid date. Use DD/MM/YYYY'))
      return
    }

    setSaving(true)
    setSaveError(null)

    const { error } = await supabase.from('dogs').insert({
      owner_id: profile.id,
      name: form.name,
      breed_id: form.breed_id ? parseInt(form.breed_id) : null,
      date_of_birth: isoDate,
      gender: form.gender || null,
      neutered: form.neutered,
      chip_number: form.chip_number.trim(),
      status: 'active',
    })

    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setForm({ name: '', breed_id: '', date_of_birth: '', gender: '', neutered: false, chip_number: '' })
      setAdding(false)
      setSaveError(null)
      onSave()
    }
  }

  async function handleStatusChange(dogId: string, newStatus: string) {
    setUpdatingStatusFor(dogId)
    await supabase.from('dogs').update({ status: newStatus }).eq('id', dogId)
    setUpdatingStatusFor(null)
    onSave()
  }

  async function handleDelete(dogId: string) {
    setDeletingId(dogId)
    const { data: results } = await supabase
      .from('competition_results').select('id').eq('dog_id', dogId).limit(1)
    if (results && results.length > 0) {
      alert(t(
        'Αυτός ο σκύλος έχει αποτελέσματα αγώνων και δεν μπορεί να διαγραφεί. Αλλάξτε την κατάστασή του.',
        'This dog has competition results and cannot be deleted. Change their status instead.'
      ))
      setDeletingId(null)
      setConfirmDeleteId(null)
      return
    }
    await supabase.from('dogs').delete().eq('id', dogId)
    setDeletingId(null)
    setConfirmDeleteId(null)
    onSave()
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, dogId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFor(dogId)
    try {
      const compressed = await compressImage(file, 400)
      const path = `${profile.id}/${dogId}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('dogs').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('dogs').getPublicUrl(path)
      await supabase.from('dogs').update({ photo_url: data.publicUrl + '?t=' + Date.now() }).eq('id', dogId)
      onSave()
    } catch (err) { console.error('photo upload error:', err) }
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
    borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)',
    fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', marginBottom: '0.75rem',
    boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }
  const statusLabel = (s: string) => s === 'active' ? t('Ενεργός', 'Active') : s === 'retired' ? t('Αποσυρμένος', 'Retired') : s === 'in_our_memories' ? t('Στη μνήμη του', 'In our memories') : s
  const statusColor = (s: string) => s === 'active' ? '#4caf50' : s === 'retired' ? 'var(--text-secondary)' : s === 'in_our_memories' ? '#9575cd' : 'var(--text-secondary)'

  return (
    <div>
      {dogs.map(dog => (
        <div key={dog.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--accent)', overflow: 'hidden', background: 'var(--bg-card)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              onClick={() => { setActiveDogId(dog.id); fileRef.current?.click() }}
            >
              {dog.photo_url ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.4rem' }}>🐕</span>}
              {uploadingFor === dog.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white' }}>...</div>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{dog.name}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {dog.dog_id}</p>
              {dog.chip_number && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>🔖 Chip: {dog.chip_number}</p>}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {dog.gender === 'male' ? t('Αρσενικό', 'Male') : dog.gender === 'female' ? t('Θηλυκό', 'Female') : ''}
                {dog.neutered ? ` · ${t('Στειρωμένο', 'Neutered')}` : ''}
              </p>
              <p style={{ fontSize: '0.72rem', color: statusColor(dog.status), fontWeight: 600, marginTop: '0.15rem' }}>● {statusLabel(dog.status || 'active')}</p>
              <Link href={`/dogs/${dog.id}`} style={{ fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'none' }}>{t('Προφίλ', 'Profile')} →</Link>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
            <select value={dog.status || 'active'} onChange={e => handleStatusChange(dog.id, e.target.value)} disabled={updatingStatusFor === dog.id} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif', cursor: 'pointer' }}>
              <option value="active">{t('Ενεργός', 'Active')}</option>
              <option value="retired">{t('Αποσυρμένος', 'Retired')}</option>
              <option value="in_our_memories">{t('Στη μνήμη του', 'In our memories')}</option>
            </select>
            {confirmDeleteId === dog.id ? (
              <>
                <button onClick={() => handleDelete(dog.id)} disabled={deletingId === dog.id} style={{ background: '#c62828', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', color: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                  {deletingId === dog.id ? '...' : t('Επιβεβαίωση', 'Confirm')}
                </button>
                <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                  {t('Ακύρωση', 'Cancel')}
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDeleteId(dog.id)} style={{ background: 'transparent', border: '1px solid #c62828', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                🗑 {t('Διαγραφή', 'Delete')}
              </button>
            )}
          </div>
        </div>
      ))}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => activeDogId && handlePhotoUpload(e, activeDogId)} />

      {!adding ? (
        <button onClick={() => { setAdding(true); loadBreeds() }} style={{ width: '100%', background: 'var(--bg)', border: '1px dashed var(--accent)', borderRadius: '10px', padding: '1rem', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', marginTop: '0.5rem' }}>
          + {t('Προσθήκη Σκύλου', 'Add Dog')}
        </button>
      ) : (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
          <div style={{ background: 'rgba(232,185,79,0.08)', border: '1px solid rgba(232,185,79,0.3)', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--accent)', lineHeight: 1.5 }}>
            ⚠️ {t('Τα στοιχεία του σκύλου δεν μπορούν να αλλάξουν μετά την αποθήκευση. Ελέγξτε προσεκτικά πριν αποθηκεύσετε.', 'Dog data cannot be changed after saving. Please check carefully before saving.')}
          </div>

          <label style={labelStyle}>{t('Όνομα *', 'Name *')}</label>
          <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('Όνομα σκύλου', 'Dog name')} />

          <label style={labelStyle}>🔖 {t('Αριθμός Chip *', 'Chip Number *')}</label>
          <input
            style={{ ...inputStyle, border: '1px solid var(--accent)55' }}
            value={form.chip_number}
            onChange={e => setForm({ ...form, chip_number: e.target.value })}
            placeholder={t('π.χ. 900182000123456', 'e.g. 900182000123456')}
            maxLength={20}
          />

          <label style={labelStyle}>{t('Φυλή', 'Breed')}</label>
          <select style={inputStyle} value={form.breed_id} onChange={e => setForm({ ...form, breed_id: e.target.value })}>
            <option value="">{breedsLoading ? t('Φόρτωση...', 'Loading...') : t('Επιλογή φυλής', 'Select breed')}</option>
            {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label style={labelStyle}>{t('Ημ. Γέννησης (ΗΗ/ΜΜ/ΕΕΕΕ)', 'Date of Birth (DD/MM/YYYY)')}</label>
          <input style={inputStyle} value={form.date_of_birth} onChange={e => handleDateInput(e.target.value)} placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" maxLength={10} inputMode="numeric" />

          <label style={labelStyle}>{t('Φύλο', 'Gender')}</label>
          <select style={inputStyle} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
            <option value="">{t('Επιλογή', 'Select')}</option>
            <option value="male">{t('Αρσενικό', 'Male')}</option>
            <option value="female">{t('Θηλυκό', 'Female')}</option>
          </select>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t('Στειρωμένο', 'Neutered')}</span>
            <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.neutered ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setForm({ ...form, neutered: !form.neutered })}>
              <div style={{ position: 'absolute', top: '3px', left: form.neutered ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
          </div>

          {saveError && <p style={{ color: '#f77e7e', fontSize: '0.82rem', marginBottom: '0.75rem' }}>⚠️ {saveError}</p>}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setAdding(false); setSaveError(null) }} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
              {t('Ακύρωση', 'Cancel')}
            </button>
            <button
              onClick={handleAddDog}
              disabled={saving || !form.name || !form.chip_number.trim()}
              style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: (saving || !form.name || !form.chip_number.trim()) ? 0.7 : 1 }}
            >
              {saving ? '...' : t('Αποθήκευση', 'Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
