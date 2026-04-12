'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Leaflet must be loaded client-side only
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

export default function CreateEventPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sports, setSports] = useState<any[]>([])
  const [foundationTitles, setFoundationTitles] = useState<string[]>([])
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

  // Date fields — separate date + time inputs
  const [eventDatePart, setEventDatePart] = useState('')   // DD/MM/YYYY
  const [eventTimePart, setEventTimePart] = useState('')   // HH:MM
  const [regDatePart, setRegDatePart] = useState('')
  const [regTimePart, setRegTimePart] = useState('')

  const [maxParticipants, setMaxParticipants] = useState('')
  const [teamEvent, setTeamEvent] = useState(false)
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const [categories, setCategories] = useState<any[]>([
    { title_el: '', title_en: '', sport_id: '', required_title: '', max_participants: '', is_championship: false }
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
      .order('is_foundation', { ascending: false })
    setSports(data || [])
    // Build required_title options from foundation sport names
    const titles = (data || [])
      .filter((s: any) => s.is_foundation)
      .map((s: any) => s.name_el)
    setFoundationTitles(titles)
  }

  // Convert DD/MM/YYYY + HH:MM → ISO string
  function toISO(datePart: string, timePart: string): string | null {
    if (!datePart) return null
    const [day, month, year] = datePart.split('/')
    if (!day || !month || !year) return null
    const time = timePart || '00:00'
    return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${time}:00`
  }

  // Compress image before upload
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
    setCategories(prev => [...prev, {
      title_el: '', title_en: '', sport_id: '', required_title: '', max_participants: '', is_championship: false
    }])
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  function updateCategory(index: number, field: string, value: any) {
    setCategories(prev => prev.map((cat, i) => i === index ? { ...cat, [field]: value } : cat))
  }

  async function handleSubmit() {
    setError('')
    if (!titleEl.trim()) return setError(t('Ο τίτλος είναι υποχρεωτικός', 'Title is required'))
    if (!eventDatePart) return setError(t('Η ημερομηνία είναι υποχρεωτική', 'Event date is required'))
    if (categories.some(c => !c.title_el.trim() || !c.sport_id)) {
      return setError(t('Συμπλήρωσε τίτλο και άθλημα σε όλες τις κατηγορίες', 'Fill title and sport for all categories'))
    }

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
        event_date: toISO(eventDatePart, eventTimePart),
        registration_deadline: toISO(regDatePart, regTimePart),
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        team_event: teamEvent,
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

    const catRows = categories.map(cat => ({
      event_id: eventData.id,
      sport_id: cat.sport_id,
      title_el: cat.title_el,
      title_en: cat.title_en || null,
      required_title: cat.required_title || null,
      max_participants: cat.max_participants ? parseInt(cat.max_participants) : null,
      is_championship: cat.is_championship,
    }))

    const { error: catError } = await supabase.from('event_categories').insert(catRows)

    if (catError) {
      setError(t('Σφάλμα αποθήκευσης κατηγοριών', 'Error saving categories'))
      setSubmitting(false)
      return
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

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0
        }}>←</button>

        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem',
          letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem'
        }}>
          🏆 {t('Νέος Αγώνας', 'New Event')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {t('Ο αγώνας θα δημοσιευτεί μετά από έγκριση διαχειριστή', 'Event will be published after admin approval')}
        </p>

        {success && (
          <div style={{
            background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)',
            borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
            color: '#00c864', fontWeight: 600, textAlign: 'center'
          }}>
            ✅ {t('Ο αγώνας υποβλήθηκε για έγκριση!', 'Event submitted for approval!')}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.3)',
            borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
            color: '#dc3232', fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div style={sectionStyle}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }}>
            {t('Βασικές Πληροφορίες', 'Basic Info')}
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Τίτλος (Ελληνικά) *', 'Title (Greek) *')}</label>
            <input style={inputStyle} value={titleEl} onChange={e => setTitleEl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Τίτλος (Αγγλικά)', 'Title (English)')}</label>
            <input style={inputStyle} value={titleEn} onChange={e => setTitleEn(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Περιγραφή (Ελληνικά)', 'Description (Greek)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={descEl} onChange={e => setDescEl(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Περιγραφή (Αγγλικά)', 'Description (English)')}</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={descEn} onChange={e => setDescEn(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" id="teamEvent" checked={teamEvent}
              onChange={e => setTeamEvent(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <label htmlFor="teamEvent" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
              🛡️ {t('Αγώνας Ομάδων', 'Team Event')}
            </label>
          </div>
        </div>

        {/* Dates */}
        <div style={sectionStyle}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }}>
            {t('Ημερομηνίες', 'Dates')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Ημερομηνία Αγώνα *', 'Event Date *')} (DD/MM/YYYY)</label>
              <input style={inputStyle} value={eventDatePart}
                onChange={e => setEventDatePart(e.target.value)}
                placeholder="π.χ. 25/06/2026" maxLength={10} />
            </div>
            <div>
              <label style={labelStyle}>{t('Ώρα Αγώνα', 'Event Time')} (HH:MM)</label>
              <input style={inputStyle} value={eventTimePart}
                onChange={e => setEventTimePart(e.target.value)}
                placeholder="π.χ. 09:00" maxLength={5} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Προθεσμία Εγγραφής', 'Registration Deadline')} (DD/MM/YYYY)</label>
              <input style={inputStyle} value={regDatePart}
                onChange={e => setRegDatePart(e.target.value)}
                placeholder="π.χ. 20/06/2026" maxLength={10} />
            </div>
            <div>
              <label style={labelStyle}>{t('Ώρα', 'Time')} (HH:MM)</label>
              <input style={inputStyle} value={regTimePart}
                onChange={e => setRegTimePart(e.target.value)}
                placeholder="π.χ. 23:59" maxLength={5} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('Μέγιστος Αριθμός Συμμετεχόντων', 'Max Participants')}</label>
            <input type="number" style={inputStyle} value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              placeholder={t('Κενό = Απεριόριστο', 'Empty = Unlimited')} />
          </div>
        </div>

        {/* Location */}
        <div style={sectionStyle}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }}>
            {t('Τοποθεσία', 'Location')}
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Όνομα Χώρου', 'Venue Name')}</label>
            <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)}
              placeholder={t('π.χ. Εκπαιδευτικό Κέντρο Ολύμπου', 'e.g. Olympus Training Center')} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Διεύθυνση', 'Address')}</label>
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)}
              placeholder={t('π.χ. Λεωφόρος Νίκης 45, Θεσσαλονίκη', 'e.g. Victory Ave 45, Thessaloniki')} />
          </div>
          {/* Coordinates display */}
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
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', height: '280px' }}>
            <MapPicker
              lat={lat}
              lng={lng}
              onSelect={(newLat, newLng) => { setLat(newLat); setLng(newLng) }}
            />
          </div>
        </div>

        {/* Banner */}
        <div style={sectionStyle}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }}>
            {t('Banner', 'Banner')}
          </p>
          {bannerPreview && (
            <>
              <div
                onClick={() => setLightboxOpen(true)}
                style={{ marginBottom: '0.75rem', borderRadius: '10px', overflow: 'hidden', height: '160px', cursor: 'zoom-in' }}>
                <img src={bannerPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {lightboxOpen && (
                <div onClick={() => setLightboxOpen(false)} style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, cursor: 'zoom-out'
                }}>
                  <img src={bannerPreview} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
                </div>
              )}
            </>
          )}
          <label style={{
            display: 'inline-block', background: 'var(--bg)',
            border: '1px dashed var(--border)', borderRadius: '8px',
            padding: '0.65rem 1.25rem', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif',
          }}>
            {bannerUploading ? t('Συμπίεση & Ανέβασμα...', 'Compressing & Uploading...') : t('📷 Επιλογή Banner', '📷 Choose Banner')}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
          </label>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            {t('Η εικόνα συμπιέζεται αυτόματα πριν το ανέβασμα', 'Image is automatically compressed before upload')}
          </p>
        </div>

        {/* Contact */}
        <div style={sectionStyle}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 0.25rem', letterSpacing: '0.04em' }}>
            {t('Στοιχεία Επικοινωνίας', 'Contact Info')}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
            {t('Προσυμπληρώθηκαν από το προφίλ σου — άλλαξέ τα αν θέλεις', 'Pre-filled from your profile — edit if needed')}
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>{t('Όνομα Υπεύθυνου', 'Contact Name')}</label>
            <input style={inputStyle} value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>{t('Τηλέφωνο', 'Phone')}</label>
              <input style={inputStyle} value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: 0, letterSpacing: '0.04em' }}>
              {t('Κατηγορίες Αγώνα', 'Event Categories')}
            </p>
            <button onClick={addCategory} style={{
              background: 'var(--bg)', border: '1px solid var(--accent)',
              borderRadius: '8px', padding: '0.4rem 0.85rem',
              color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem',
            }}>
              + {t('Προσθήκη', 'Add')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map((cat, index) => (
              <div key={index} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem', position: 'relative'
              }}>
                <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', letterSpacing: '0.04em' }}>
                  {t('Κατηγορία', 'Category')} {index + 1}
                </p>
                {categories.length > 1 && (
                  <button onClick={() => removeCategory(index)} style={{
                    position: 'absolute', top: '0.75rem', right: '0.75rem',
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '1rem', padding: 0,
                  }}>✕</button>
                )}

                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={labelStyle}>{t('Άθλημα *', 'Sport *')}</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }}
                    value={cat.sport_id}
                    onChange={e => updateCategory(index, 'sport_id', e.target.value)}>
                    <option value="">{t('Επίλεξε άθλημα...', 'Select sport...')}</option>
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.is_foundation ? '⭐ ' : ''}{t(s.name_el, s.name_en)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                  <div>
                    <label style={labelStyle}>{t('Τίτλος Κατηγορίας (ΕΛ) *', 'Category Title (GR) *')}</label>
                    <input style={inputStyle} value={cat.title_el}
                      onChange={e => updateCategory(index, 'title_el', e.target.value)}
                      placeholder={t('π.χ. Εισαγωγικό Επίπεδο 1', 'e.g. Entry Level 1')} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Τίτλος Κατηγορίας (EN)', 'Category Title (EN)')}</label>
                    <input style={inputStyle} value={cat.title_en}
                      onChange={e => updateCategory(index, 'title_en', e.target.value)}
                      placeholder="e.g. Entry Level 1" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                  <div>
                    <label style={labelStyle}>{t('Απαιτούμενος Τίτλος', 'Required Title')}</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }}
                      value={cat.required_title}
                      onChange={e => updateCategory(index, 'required_title', e.target.value)}>
                      <option value="">{t('Κανένας — Ανοιχτό σε όλους', 'None — Open to all')}</option>
                      {foundationTitles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Μέγ. Συμμετέχοντες', 'Max Participants')}</label>
                    <input type="number" style={inputStyle} value={cat.max_participants}
                      onChange={e => updateCategory(index, 'max_participants', e.target.value)}
                      placeholder={t('Κενό = Απεριόριστο', 'Unlimited')} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="checkbox" id={`champ-${index}`} checked={cat.is_championship}
                    onChange={e => updateCategory(index, 'is_championship', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  <label htmlFor={`champ-${index}`} style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
                    🥇 {t('Πρωτάθλημα', 'Championship')}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || bannerUploading}
          style={{
            width: '100%',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem',
            color: 'var(--bg)',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '1.2rem',
            letterSpacing: '0.05em',
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? t('Υποβολή...', 'Submitting...') : t('Υποβολή για Έγκριση', 'Submit for Approval')}
        </button>

      </div>
    </main>
  )
}