'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

export default function CreateSeminarPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [form, setForm] = useState({
    title_el: '',
    title_en: '',
    description_el: '',
    description_en: '',
    seminar_date: '',
    seminar_time: '',
    is_online: false,
    location: '',
    url: '',
    lat: null as number | null,
    lng: null as number | null,
  })

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const data = await res.json()
      if (!data.user) { router.push('/'); return }
      if (!data.isAdmin && !data.roles?.includes('organizer')) { router.push('/seminars'); return }
      setSession(data)
      setChecking(false)
    }
    init()
  }, [])

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title_el.trim() || !form.seminar_date) {
      setMsg({ type: 'error', text: t('Συμπλήρωσε τίτλο και ημερομηνία', 'Title and date are required') })
      return
    }
    if (form.is_online && !form.url.trim()) {
      setMsg({ type: 'error', text: t('Συμπλήρωσε το URL για online σεμινάριο', 'URL is required for online seminars') })
      return
    }
    if (!form.is_online && !form.location.trim()) {
      setMsg({ type: 'error', text: t('Συμπλήρωσε τοποθεσία για φυσικό σεμινάριο', 'Location is required for in-person seminars') })
      return
    }

    setSubmitting(true)
    setMsg(null)

    // Combine date + time into ISO
    const dateTimeStr = form.seminar_time
      ? `${form.seminar_date}T${form.seminar_time}:00`
      : `${form.seminar_date}T09:00:00`
    const seminarDate = new Date(dateTimeStr).toISOString()

    const { error } = await supabase.from('seminars').insert({
      title_el: form.title_el.trim(),
      title_en: form.title_en.trim() || null,
      description_el: form.description_el.trim() || null,
      description_en: form.description_en.trim() || null,
      seminar_date: seminarDate,
      is_online: form.is_online,
      location: form.is_online ? null : form.location.trim() || null,
      url: form.is_online ? form.url.trim() : null,
      lat: form.is_online ? null : form.lat,
      lng: form.is_online ? null : form.lng,
      created_by: session.user.id,
      status: 'pending',
    })

    if (error) {
      setMsg({ type: 'error', text: t('Σφάλμα υποβολής. Δοκίμασε ξανά.', 'Submission error. Please try again.') })
    } else {
      setMsg({ type: 'success', text: t('Υποβλήθηκε για έγκριση!', 'Submitted for approval!') })
      setTimeout(() => router.push('/seminars'), 1500)
    }
    setSubmitting(false)
  }

  if (checking) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)',
    fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)',
    marginBottom: '0.35rem', fontWeight: 600,
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0 }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
          📚 {t('Νέο Σεμινάριο', 'New Seminar')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          {t('Θα αποσταλεί για έγκριση πριν δημοσιευτεί', 'Will be sent for approval before publishing')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Online toggle */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                🌐 {t('Διαδικτυακό Σεμινάριο', 'Online Seminar')}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {t('Αν είναι online, δώσε σύνδεσμο αντί τοποθεσίας', 'If online, provide a link instead of location')}
              </p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_online} onChange={e => set('is_online', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', inset: 0, background: form.is_online ? 'var(--accent)' : 'var(--border)', borderRadius: '99px', transition: '0.2s' }} />
              <span style={{ position: 'absolute', top: '3px', left: form.is_online ? '25px' : '3px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
            </label>
          </div>

          {/* Titles */}
          <div>
            <label style={labelStyle}>{t('Τίτλος (Ελληνικά) *', 'Title (Greek) *')}</label>
            <input style={inputStyle} value={form.title_el} onChange={e => set('title_el', e.target.value)} placeholder={t('π.χ. Εισαγωγή στην Υπακοή', 'e.g. Introduction to Obedience')} />
          </div>
          <div>
            <label style={labelStyle}>{t('Τίτλος (Αγγλικά)', 'Title (English)')}</label>
            <input style={inputStyle} value={form.title_en} onChange={e => set('title_en', e.target.value)} placeholder="e.g. Introduction to Obedience" />
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>{t('Ημερομηνία *', 'Date *')}</label>
              <input type="date" style={inputStyle} value={form.seminar_date} onChange={e => set('seminar_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t('Ώρα', 'Time')}</label>
              <input type="time" style={inputStyle} value={form.seminar_time} onChange={e => set('seminar_time', e.target.value)} />
            </div>
          </div>

          {/* Location or URL */}
          {form.is_online ? (
            <div>
              <label style={labelStyle}>{t('Σύνδεσμος (URL) *', 'Link (URL) *')}</label>
              <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>{t('Τοποθεσία *', 'Location *')}</label>
                <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder={t('π.χ. Αθλητικό Κέντρο Θεσσαλονίκης', 'e.g. Sports Center Thessaloniki')} />
              </div>
              <div>
                <label style={labelStyle}>{t('Τοποθεσία στον χάρτη (προαιρετικό)', 'Map location (optional)')}</label>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <MapPicker lat={form.lat} lng={form.lng} onSelect={(lat, lng) => { set('lat', lat); set('lng', lng) }} />
                </div>
                {form.lat && form.lng && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                    <button onClick={() => { set('lat', null); set('lng', null) }} style={{ background: 'none', border: 'none', color: '#f77e7e', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '0.5rem' }}>✕ {t('Αφαίρεση', 'Remove')}</button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Descriptions */}
          <div>
            <label style={labelStyle}>{t('Περιγραφή (Ελληνικά)', 'Description (Greek)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.description_el} onChange={e => set('description_el', e.target.value)} placeholder={t('Πληροφορίες για το σεμινάριο...', 'Information about the seminar...')} />
          </div>
          <div>
            <label style={labelStyle}>{t('Περιγραφή (Αγγλικά)', 'Description (English)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.description_en} onChange={e => set('description_en', e.target.value)} placeholder="Information about the seminar..." />
          </div>

          {/* Message */}
          {msg && (
            <div style={{ background: msg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`, borderRadius: '10px', padding: '0.85rem', color: msg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.88rem', fontWeight: 600 }}>
              {msg.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: submitting ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '12px', padding: '1rem', color: submitting ? 'var(--text-secondary)' : 'var(--bg)', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', letterSpacing: '0.05em', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? t('Υποβολή...', 'Submitting...') : t('Υποβολή για Έγκριση', 'Submit for Approval')}
          </button>
        </div>
      </div>
    </main>
  )
}
