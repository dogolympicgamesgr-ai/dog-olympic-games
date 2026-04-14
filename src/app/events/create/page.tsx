'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

interface Sport {
  id: string
  name_el: string
  name_en: string
  is_foundation: boolean
}

interface Category {
  sport_id: string
  sublevel: string // '1' | '2' | '3' | '' (empty for foundation sports)
  max_participants: string
  is_championship: boolean
}

export default function CreateEventPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [foundationSports, setFoundationSports] = useState<Sport[]>([])
  const [disciplineSports, setDisciplineSports] = useState<Sport[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  // Event fields
  const [titleEl, setTitleEl] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [descEl, setDescEl] = useState('')
  const [descEn, setDescEn] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  // Native date/time inputs
  const [eventDate, setEventDate] = useState('')   // YYYY-MM-DD
  const [eventTime, setEventTime] = useState('')   // HH:MM
  const [regDate, setRegDate] = useState('')
  const [regTime, setRegTime] = useState('')

  const [maxParticipants, setMaxParticipants] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const [categories, setCategories] = useState<Category[]>([
    { sport_id: '', sublevel: '', max_participants: '', is_championship: false }
  ])

  useEffect(() => {
    loadSession()
    loadSports()
  }, [])

  async function loadSession() {
    const res = await fetch('/auth/session')
    const data = await res.json()
    setSession(data)
    setAuthLoading(false)
    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, display_email')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setContactName(profile.full_name || '')
        setContactPhone(profile.phone || '')
        setContactEmail(profile.display_email || '')
      }
    }
  }

  async function loadSports() {
    const { data } = await supabase
      .from('sports')
      .select('id, name_el, name_en, is_foundation')
      .eq('active', true)
      .order('name_el', { ascending: true })
    const all = (data || []) as Sport[]
    setFoundationSports(all.filter(s => s.is_foundation))
    setDisciplineSports(all.filter(s => !s.is_foundation))
  }

  // Derive auto title + requirements from sport + sublevel
  function deriveCategoryMeta(cat: Category) {
    const foundation = foundationSports.find(s => s.id === cat.sport_id)
    const discipline = disciplineSports.find(s => s.id === cat.sport_id)
    const sport = foundation || discipline

    if (!sport) return { title_el: '', title_en: '', required_foundation: null, required_sport_level: null }

    if (foundation) {
      // Entry Level or Basic Level
      const isEntry = !foundation.name_el.toLowerCase().includes('βασικό') &&
        !foundation.name_en.toLowerCase().includes('basic')
      return {
        title_el: foundation.name_el,
        title_en: foundation.name_en,
        required_foundation: isEntry ? null : 'entry',
        required_sport_level: null,
      }
    }

    // Discipline with sublevel
    const sub = cat.sublevel ? parseInt(cat.sublevel) : null
    const subLabel = sub ? ` — ${t('Επίπεδο', 'Level')} ${sub}` : ''
    return {
      title_el: `${discipline!.name_el}${subLabel}`,
      title_en: `${discipline!.name_en}${sub ? ` — Level ${sub}` : ''}`,
      required_foundation: 'basic',
      required_sport_level: sub,
    }
  }

  function toISO(datePart: string, timePart: string): string | null {
    if (!datePart) return null
    return `${datePart}T${timePart || '00:00'}:00`
  }

  async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', quality)
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    const compressed = await compressImage(file)
    const path = `${Date.now()}.jpg`
    const { error } = await supabase.storage.from('event-banners').upload(path, compressed, { contentType: 'image/jpeg' })
    if (!error) {
      const { data: urlData } = supabase.storage.from('event-banners').getPublicUrl(path)
      setBannerUrl(urlData.publicUrl)
      setBannerPreview(urlData.publicUrl)
    }
    setBannerUploading(false)
  }

  function addCategory() {
    setCategories(prev => [...prev, { sport_id: '', sublevel: '', max_participants: '', is_championship: false }])
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  function updateCategory(index: number, field: keyof Category, value: any) {
    setCategories(prev => prev.map((cat, i) => {
      if (i !== index) return cat
      // Reset sublevel when sport changes
      if (field === 'sport_id') return { ...cat, sport_id: value, sublevel: '' }
      return { ...cat, [field]: value }
    }))
  }

  async function handleSubmit() {
    setError('')

    if (!titleEl.trim())
      return setError(t('Ο τίτλος είναι υποχρεωτικός', 'Title is required'))
    if (!eventDate)
      return setError(t('Η ημερομηνία αγώνα είναι υποχρεωτική', 'Event date is required'))
    if (categories.some(c => !c.sport_id))
      return setError(t('Επίλεξε άθλημα σε όλες τις κατηγορίες', 'Select a sport for all categories'))
    if (categories.some(c => {
      const isDiscipline = disciplineSports.some(s => s.id === c.sport_id)
      return isDiscipline && !c.sublevel
    }))
      return setError(t('Επίλεξε υποεπίπεδο για όλα τα αθλήματα πειθαρχίας', 'Select sublevel for all discipline sports'))

    setSubmitting(true)

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        title_el: titleEl,
        title_en: titleEn || null,
        description_el: descEl || null,
        description_en: descEn || null,
        location: location || null,
        address: address || null,
        lat: lat ?? null,
        lng: lng ?? null,
        event_date: toISO(eventDate, eventTime),
        registration_deadline: toISO(regDate, regTime) || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        banner_url: bannerUrl || null,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        created_by: session.user.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (eventError || !eventData) {
      setError(t('Σφάλμα δημιουργίας αγώνα', 'Error creating event'))
      setSubmitting(false)
      return
    }

    const catRows = categories.map(cat => {
      const meta = deriveCategoryMeta(cat)
      return {
        event_id: eventData.id,
        sport_id: cat.sport_id,
        title_el: meta.title_el,
        title_en: meta.title_en || null,
        required_foundation: meta.required_foundation || null,
        required_sport_level: meta.required_sport_level || null,
        max_participants: cat.max_participants ? parseInt(cat.max_participants) : null,
        is_championship: cat.is_championship,
      }
    })

    const { error: catError } = await supabase.from('event_categories').insert(catRows)

    if (catError) {
      setError(t('Σφάλμα αποθήκευσης κατηγοριών', 'Error saving categories'))
      setSubmitting(false)
      return
    }

   // Notify all admins
const { data: admins } = await supabase
  .from('user_roles')
  .select('user_id')
  .eq('role', 'admin')

if (admins && admins.length > 0) {
  await supabase.from('notifications').insert(
    admins.map((a: any) => ({
      user_id: a.user_id,
      type: 'event_pending',
      title_el: 'Νέος Αγώνας προς Έγκριση',
      title_en: 'New Event Pending Approval',
      message_el: `Ο αγώνας "${titleEl}" υποβλήθηκε και περιμένει έγκριση.`,
      message_en: `Event "${titleEl}" was submitted and is waiting for approval.`,
      metadata: { event_id: eventData.id },
    }))
  )
}

setSuccess(true)
setSubmitting(false)
setTimeout(() => router.push('/events'), 1500)
  }

  if (authLoading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const canAccess = session?.isAdmin || session?.roles?.includes('organizer')
  if (!canAccess) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
        {t('Δεν έχεις πρόσβαση σε αυτή τη σελίδα', 'You do not have access to this page')}
      </p>
      <button onClick={() => router.push('/events')} style={{
        background: 'var(--accent)', border: 'none', borderRadius: '8px',
        padding: '0.65rem 1.5rem', color: 'var(--bg)', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
      }}>
        {t('Πίσω στους Αγώνες', 'Back to Events')}
      </button>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.3rem',
    display: 'block',
  }

  const hintStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
    opacity: 0.7,
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  const sectionHeader = (text: string): React.CSSProperties => ({
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: '1.1rem',
    color: 'var(--accent)',
    margin: '0 0 1rem',
    letterSpacing: '0.04em',
  })

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0
        }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          🏆 {t('Νέος Αγώνας', 'New Event')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {t('Ο αγώνας θα δημοσιευτεί μετά από έγκριση διαχειριστή', 'Event will be published after admin approval')}
        </p>

        {success && (
          <div style={{ background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', color: '#00c864', fontWeight: 600, textAlign: 'center' }}>
            ✅ {t('Ο αγώνας υποβλήθηκε για έγκριση!', 'Event submitted for approval!')}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', color: '#dc3232', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* ── Basic Info ── */}
        <div style={sectionStyle}>
          <p style={sectionHeader('')}>{t('Βασικές Πληροφορίες', 'Basic Info')}</p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Τίτλος (Ελληνικά) *', 'Title (Greek) *')}</label>
            <input style={inputStyle} value={titleEl} onChange={e => setTitleEl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Τίτλος (Αγγλικά)', 'Title (English)')}</label>
            <input style={inputStyle} value={titleEn} onChange={e => setTitleEn(e.target.value)} />
            <p style={hintStyle}>{t('Προαιρετικό — αν αφεθεί κενό θα εμφανίζεται ο ελληνικός τίτλος', 'Optional — Greek title will be used if left blank')}</p>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Περιγραφή (Ελληνικά)', 'Description (Greek)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={descEl} onChange={e => setDescEl(e.target.value)} />
            <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
          </div>
          <div>
            <label style={labelStyle}>{t('Περιγραφή (Αγγλικά)', 'Description (English)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={descEn} onChange={e => setDescEn(e.target.value)} />
            <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
          </div>
        </div>

        {/* ── Dates ── */}
        <div style={sectionStyle}>
          <p style={sectionHeader('')}>{t('Ημερομηνίες', 'Dates')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Ημερομηνία Αγώνα *', 'Event Date *')}</label>
              <input
                type="date"
                style={inputStyle}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('Ώρα Αγώνα', 'Event Time')}</label>
              <input
                type="time"
                step="3600"
                style={inputStyle}
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
              />
              <p style={hintStyle}>{t('Προαιρετικό — αν κενό: 00:00', 'Optional — defaults to 00:00')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Προθεσμία Εγγραφής', 'Registration Deadline')}</label>
              <input
                type="date"
                style={inputStyle}
                value={regDate}
                onChange={e => setRegDate(e.target.value)}
              />
              <p style={hintStyle}>{t('Προαιρετικό — αν κενό: ανοιχτό μέχρι την ημέρα του αγώνα', 'Optional — if blank: open until event date')}</p>
            </div>
            <div>
              <label style={labelStyle}>{t('Ώρα Προθεσμίας', 'Deadline Time')}</label>
              <input
                type="time"
                step="3600"
                style={inputStyle}
                value={regTime}
                onChange={e => setRegTime(e.target.value)}
              />
              <p style={hintStyle}>{t('Προαιρετικό — αν κενό: 00:00', 'Optional — defaults to 00:00')}</p>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('Μέγιστος Αριθμός Συμμετεχόντων', 'Max Participants')}</label>
            <input type="number" style={inputStyle} value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} />
            <p style={hintStyle}>{t('Προαιρετικό — αν κενό: απεριόριστος αριθμός', 'Optional — if blank: unlimited')}</p>
          </div>
        </div>

        {/* ── Location ── */}
        <div style={sectionStyle}>
          <p style={sectionHeader('')}>{t('Τοποθεσία', 'Location')}</p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Όνομα Χώρου', 'Venue Name')}</label>
            <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)}
              placeholder={t('π.χ. Εκπαιδευτικό Κέντρο Ολύμπου', 'e.g. Olympus Training Center')} />
            <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Διεύθυνση', 'Address')}</label>
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)}
              placeholder={t('π.χ. Λεωφόρος Νίκης 45, Θεσσαλονίκη', 'e.g. Victory Ave 45, Thessaloniki')} />
            <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
          </div>
          {lat !== null && lng !== null && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, ...inputStyle, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                📍 {t('Πλάτος', 'Lat')}: {lat.toFixed(6)}
              </div>
              <div style={{ flex: 1, ...inputStyle, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                📍 {t('Μήκος', 'Lng')}: {lng.toFixed(6)}
              </div>
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            📌 {t('Κλικ στον χάρτη για τοποθέτηση pin', 'Click on the map to place a pin')}
          </p>
          <p style={hintStyle}>{t('Προαιρετικό — αν δεν επιλεγεί pin, ο χάρτης δεν θα εμφανίζεται στη σελίδα αγώνα', 'Optional — if no pin selected, map will not show on event page')}</p>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', height: '280px', marginTop: '0.5rem' }}>
            <MapPicker lat={lat} lng={lng} onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
          </div>
        </div>

        {/* ── Banner ── */}
        <div style={sectionStyle}>
          <p style={sectionHeader('')}>{t('Banner', 'Banner')}</p>
          {bannerPreview && (
            <>
              <div onClick={() => setLightboxOpen(true)} style={{ marginBottom: '0.75rem', borderRadius: '10px', overflow: 'hidden', height: '160px', cursor: 'zoom-in' }}>
                <img src={bannerPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {lightboxOpen && (
                <div onClick={() => setLightboxOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
                  <img src={bannerPreview} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
                </div>
              )}
            </>
          )}
          <label style={{ display: 'inline-block', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '0.65rem 1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif' }}>
            {bannerUploading ? t('Συμπίεση & Ανέβασμα...', 'Compressing & Uploading...') : t('📷 Επιλογή Banner', '📷 Choose Banner')}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
          </label>
          <p style={hintStyle}>{t('Προαιρετικό — η εικόνα συμπιέζεται αυτόματα πριν το ανέβασμα', 'Optional — image is automatically compressed before upload')}</p>
        </div>

        {/* ── Contact ── */}
        <div style={sectionStyle}>
          <p style={sectionHeader('')}>{t('Στοιχεία Επικοινωνίας', 'Contact Info')}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
            {t('Προσυμπληρώθηκαν από το προφίλ σου — άλλαξέ τα αν θέλεις', 'Pre-filled from your profile — edit if needed')}
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Όνομα Υπεύθυνου', 'Contact Name')}</label>
            <input style={inputStyle} value={contactName} onChange={e => setContactName(e.target.value)} />
            <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Τηλέφωνο', 'Phone')}</label>
              <input style={inputStyle} value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
              <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
            </div>
          </div>
        </div>

        {/* ── Categories ── */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={sectionHeader('')}>{t('Κατηγορίες Αγώνα', 'Event Categories')}</p>
            <button onClick={addCategory} style={{
              background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px',
              padding: '0.4rem 0.85rem', color: 'var(--accent)', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem',
            }}>
              + {t('Προσθήκη', 'Add')}
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 1rem' }}>
            {t('Κάθε κατηγορία αντιστοιχεί σε ένα αγώνισμα. Μπορείς να προσθέσεις πολλές.', 'Each category is one trial. You can add multiple.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map((cat, index) => {
              const selectedSport = [...foundationSports, ...disciplineSports].find(s => s.id === cat.sport_id)
              const isDiscipline = disciplineSports.some(s => s.id === cat.sport_id)
              const meta = cat.sport_id ? deriveCategoryMeta(cat) : null

              return (
                <div key={index} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', position: 'relative' }}>
                  <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', letterSpacing: '0.04em' }}>
                    {t('Κατηγορία', 'Category')} {index + 1}
                    {meta && (
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'var(--accent)', marginLeft: '0.5rem', fontWeight: 600, letterSpacing: 0 }}>
                        → {meta.title_el}
                      </span>
                    )}
                  </p>

                  {categories.length > 1 && (
                    <button onClick={() => removeCategory(index)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>✕</button>
                  )}

                  {/* Sport picker */}
                  <div style={{ marginBottom: '0.65rem' }}>
                    <label style={labelStyle}>{t('Αγώνισμα *', 'Discipline *')}</label>
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={cat.sport_id}
                      onChange={e => updateCategory(index, 'sport_id', e.target.value)}
                    >
                      <option value="">{t('Επίλεξε αγώνισμα...', 'Select discipline...')}</option>

                      {foundationSports.length > 0 && (
                        <optgroup label={t('── Θεμελιώδη Επίπεδα ──', '── Foundation Levels ──')}>
                          {foundationSports.map(s => (
                            <option key={s.id} value={s.id}>⭐ {t(s.name_el, s.name_en)}</option>
                          ))}
                        </optgroup>
                      )}

                      {disciplineSports.length > 0 && (
                        <optgroup label={t('── Πειθαρχίες ──', '── Disciplines ──')}>
                          {disciplineSports.map(s => (
                            <option key={s.id} value={s.id}>{t(s.name_el, s.name_en)}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <p style={hintStyle}>
                      {t('Θεμελιώδη: Εισαγωγικό & Βασικό Επίπεδο. Πειθαρχίες: Υπακοή, Προστασία κ.λπ.', 'Foundation: Entry & Basic Level. Disciplines: Obedience, Protection, etc.')}
                    </p>
                  </div>

                  {/* Sublevel picker — only for disciplines */}
                  {isDiscipline && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <label style={labelStyle}>{t('Υποεπίπεδο *', 'Sublevel *')}</label>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={cat.sublevel}
                        onChange={e => updateCategory(index, 'sublevel', e.target.value)}
                      >
                        <option value="">{t('Επίλεξε επίπεδο...', 'Select level...')}</option>
                        <option value="1">{t('Επίπεδο 1', 'Level 1')}</option>
                        <option value="2">{t('Επίπεδο 2', 'Level 2')}</option>
                        <option value="3">{t('Επίπεδο 3', 'Level 3')}</option>
                      </select>
                      <p style={hintStyle}>{t('Απαιτείται Βασικό Επίπεδο για συμμετοχή σε πειθαρχία', 'Basic Level title required to enter a discipline')}</p>
                    </div>
                  )}

                  {/* Requirement preview */}
                  {meta && (
                    <div style={{
                      background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
                      borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.65rem',
                      fontSize: '0.75rem', color: 'var(--text-secondary)',
                    }}>
                      {meta.required_foundation === null
                        ? t('✅ Ανοιχτό σε όλους — δεν απαιτείται τίτλος', '✅ Open to all — no title required')
                        : meta.required_foundation === 'entry'
                          ? t('⭐ Απαιτείται τίτλος Εισαγωγικού Επιπέδου', '⭐ Entry Level title required')
                          : t('⭐⭐ Απαιτείται τίτλος Βασικού Επιπέδου', '⭐⭐ Basic Level title required')
                      }
                    </div>
                  )}

                  {/* Max participants + championship */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>{t('Μέγ. Συμμετέχοντες', 'Max Participants')}</label>
                      <input type="number" style={inputStyle} value={cat.max_participants}
                        onChange={e => updateCategory(index, 'max_participants', e.target.value)}
                        placeholder={t('Κενό = Απεριόριστο', 'Unlimited')} />
                      <p style={hintStyle}>{t('Προαιρετικό', 'Optional')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1.2rem' }}>
                      <input type="checkbox" id={`champ-${index}`} checked={cat.is_championship}
                        onChange={e => updateCategory(index, 'is_championship', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                      <label htmlFor={`champ-${index}`} style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
                        🥇 {t('Πρωτάθλημα', 'Championship')}
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          onClick={handleSubmit}
          disabled={submitting || bannerUploading}
          style={{
            width: '100%', background: 'var(--accent)', border: 'none',
            borderRadius: '12px', padding: '1rem', color: 'var(--bg)',
            fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem',
            letterSpacing: '0.05em', opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? t('Υποβολή...', 'Submitting...') : t('Υποβολή για Έγκριση', 'Submit for Approval')}
        </button>

      </div>
    </main>
  )
}
