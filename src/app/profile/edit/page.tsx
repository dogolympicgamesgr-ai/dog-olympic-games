'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { Country, City } from 'country-state-city'

export default function EditProfilePage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cities, setCities] = useState<any[]>([])
  const [form, setForm] = useState({
    full_name: '', display_email: '', phone: '', date_of_birth: '',
    sex: '', country: '', city: '',
    show_phone: false, profile_public: true,
    push_notifications: true, email_notifications: true,
  })

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user } = await res.json()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          full_name: data.full_name || '',
          display_email: data.display_email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth ? formatDateToDMY(data.date_of_birth) : '',
          sex: data.sex || '',
          country: data.country || '',
          city: data.city || '',
          show_phone: data.show_phone || false,
          profile_public: data.profile_public ?? true,
          push_notifications: data.push_notifications ?? true,
          email_notifications: data.email_notifications ?? true,
        })
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (form.country) {
      const c = City.getCitiesOfCountry(form.country) || []
      setCities(c)
    }
  }, [form.country])

  function formatDateToDMY(iso: string): string {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
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
    const date = new Date(y, m - 1, d)
    if (date.getMonth() !== m - 1) return null // catches invalid days like 31/02
    return `${yyyy}-${mm}-${dd}`
  }

  async function handleSave() {
    if (!profile) return

    if (form.date_of_birth && !parseDateToISO(form.date_of_birth)) {
      alert(t('Μη έγκυρη ημερομηνία. Χρησιμοποιήστε ΗΗ/ΜΜ/ΕΕΕΕ', 'Invalid date. Please use DD/MM/YYYY'))
      return
    }

    setSaving(true)
    const isoDate = form.date_of_birth ? parseDateToISO(form.date_of_birth) : null
    await supabase.from('profiles').update({
      ...form,
      date_of_birth: isoDate,
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const countries = Country.getAllCountries()

  const inputStyle = {
    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', outline: 'none',
    marginBottom: '0.75rem', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '0.78rem', color: 'var(--text-secondary)',
    marginBottom: '0.25rem', display: 'block',
  }

  const toggleStyle = (on: boolean) => ({
    width: '44px', height: '24px', borderRadius: '12px',
    background: on ? 'var(--accent)' : 'var(--border)',
    position: 'relative' as const, cursor: 'pointer', flexShrink: 0,
    transition: 'background 0.2s',
  })

  const toggleKnob = (on: boolean) => ({
    position: 'absolute' as const, top: '3px',
    left: on ? '23px' : '3px', width: '18px', height: '18px',
    borderRadius: '50%', background: 'white', transition: 'left 0.2s',
  })

  if (!profile) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem',
    }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => router.back()} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
          }}>←</button>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)',
          }}>
            ✏️ {t('Επεξεργασία Προφίλ', 'Edit Profile')}
          </h1>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>

          <label style={labelStyle}>{t('Ονοματεπώνυμο', 'Full Name')}</label>
          <input style={inputStyle} value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })} />

          <label style={labelStyle}>{t('Email εμφάνισης', 'Display Email')}</label>
          <input
            style={inputStyle}
            value={form.display_email}
            onChange={e => setForm({ ...form, display_email: e.target.value })}
            placeholder={profile?.email || ''}
            type="email"
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
            {t('Αν αφεθεί κενό, θα εμφανιστεί το email του Google.', 'If left empty, your Google email will be shown.')}
          </p>

          <label style={labelStyle}>{t('Τηλέφωνο', 'Phone')}</label>
          <input style={inputStyle} value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />

          <label style={labelStyle}>{t('Ημ. Γέννησης (ΗΗ/ΜΜ/ΕΕΕΕ)', 'Date of Birth (DD/MM/YYYY)')}</label>
          <input
            style={inputStyle}
            value={form.date_of_birth}
            onChange={e => handleDateInput(e.target.value)}
            placeholder="ΗΗ/ΜΜ/ΕΕΕΕ"
            maxLength={10}
            inputMode="numeric"
          />

          <label style={labelStyle}>{t('Φύλο', 'Sex')}</label>
          <select style={inputStyle} value={form.sex}
            onChange={e => setForm({ ...form, sex: e.target.value })}>
            <option value="">{t('Επιλογή', 'Select')}</option>
            <option value="male">{t('Άνδρας', 'Male')}</option>
            <option value="female">{t('Γυναίκα', 'Female')}</option>
            <option value="other">{t('Άλλο', 'Other')}</option>
          </select>

          <label style={labelStyle}>{t('Χώρα', 'Country')}</label>
          <select style={inputStyle} value={form.country}
            onChange={e => setForm({ ...form, country: e.target.value, city: '' })}>
            <option value="">{t('Επιλογή χώρας', 'Select country')}</option>
            {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
          </select>

          <label style={labelStyle}>{t('Πόλη', 'City')}</label>
          <select style={inputStyle} value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
            disabled={!form.country}>
            <option value="">{t('Επιλογή πόλης', 'Select city')}</option>
            {cities.map((c, i) => <option key={`${c.name}-${i}`} value={c.name}>{c.name}</option>)}
          </select>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
            {[
              { key: 'show_phone', el: 'Εμφάνιση τηλεφώνου', en: 'Show phone number' },
              { key: 'profile_public', el: 'Δημόσιο προφίλ', en: 'Public profile' },
              { key: 'push_notifications', el: 'Push ειδοποιήσεις', en: 'Push notifications' },
              { key: 'email_notifications', el: 'Email ειδοποιήσεις', en: 'Email notifications' },
            ].map(({ key, el, en }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t(el, en)}</span>
                <div style={toggleStyle((form as any)[key])}
                  onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}>
                  <div style={toggleKnob((form as any)[key])} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', marginTop: '1rem',
            background: saved ? '#4caf50' : 'var(--accent)',
            border: 'none', borderRadius: '8px',
            padding: '0.85rem', color: 'var(--bg)', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'Outfit, sans-serif', fontSize: '1rem',
            transition: 'background 0.3s',
          }}>
            {saving ? t('Αποθήκευση...', 'Saving...') : saved ? '✓ ' + t('Αποθηκεύτηκε', 'Saved') : t('Αποθήκευση', 'Save')}
          </button>
        </div>
      </div>
    </main>
  )
}