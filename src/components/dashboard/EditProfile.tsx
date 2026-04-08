'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { Country, City } from 'country-state-city'

export default function EditProfile({ profile, onSave }: { profile: any, onSave: () => void }) {
  const { t } = useLang()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', date_of_birth: '',
    sex: '', country: '', city: '',
    show_phone: false, profile_public: true,
    push_notifications: true, email_notifications: true,
  })
  const [cities, setCities] = useState<any[]>([])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        sex: profile.sex || '',
        country: profile.country || '',
        city: profile.city || '',
        show_phone: profile.show_phone || false,
        profile_public: profile.profile_public ?? true,
        push_notifications: profile.push_notifications ?? true,
        email_notifications: profile.email_notifications ?? true,
      })
    }
  }, [profile])

  useEffect(() => {
    if (form.country) {
      const c = City.getCitiesOfCountry(form.country) || []
      setCities(c)
    }
  }, [form.country])

  const countries = Country.getAllCountries()

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id)
    setSaving(false)
    if (!error) onSave()
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', outline: 'none',
    marginBottom: '0.75rem',
  }

  const labelStyle = { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }

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

  return (
    <div>
      <label style={labelStyle}>{t('Ονοματεπώνυμο', 'Full Name')}</label>
      <input style={inputStyle} value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />

      <label style={labelStyle}>{t('Τηλέφωνο', 'Phone')}</label>
      <input style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />

      <label style={labelStyle}>{t('Ημ. Γέννησης', 'Date of Birth')}</label>
      <input type="date" style={inputStyle} value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />

      <label style={labelStyle}>{t('Φύλο', 'Sex')}</label>
      <select style={inputStyle} value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}>
        <option value="">{t('Επιλογή', 'Select')}</option>
        <option value="male">{t('Άνδρας', 'Male')}</option>
        <option value="female">{t('Γυναίκα', 'Female')}</option>
        <option value="other">{t('Άλλο', 'Other')}</option>
      </select>

      <label style={labelStyle}>{t('Χώρα', 'Country')}</label>
      <select style={inputStyle} value={form.country} onChange={e => setForm({...form, country: e.target.value, city: ''})}>
        <option value="">{t('Επιλογή χώρας', 'Select country')}</option>
        {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
      </select>

      <label style={labelStyle}>{t('Πόλη', 'City')}</label>
      <select style={inputStyle} value={form.city} onChange={e => setForm({...form, city: e.target.value})} disabled={!form.country}>
        <option value="">{t('Επιλογή πόλης', 'Select city')}</option>
        {cities.map((c, i) => <option key={`${c.name}-${i}`} value={c.name}>{c.name}</option>)}
      </select>

      {/* Toggles */}
      {[
        { key: 'show_phone', el: 'Εμφάνιση τηλεφώνου', en: 'Show phone' },
        { key: 'profile_public', el: 'Δημόσιο προφίλ', en: 'Public profile' },
        { key: 'push_notifications', el: 'Push ειδοποιήσεις', en: 'Push notifications' },
        { key: 'email_notifications', el: 'Email ειδοποιήσεις', en: 'Email notifications' },
      ].map(({ key, el, en }) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t(el, en)}</span>
          <div style={toggleStyle((form as any)[key])} onClick={() => setForm({...form, [key]: !(form as any)[key]})}>
            <div style={toggleKnob((form as any)[key])} />
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', marginTop: '1rem',
        background: 'var(--accent)', border: 'none', borderRadius: '8px',
        padding: '0.85rem', color: 'var(--bg)', fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        fontFamily: 'Outfit, sans-serif', fontSize: '1rem',
      }}>
        {saving ? t('Αποθήκευση...', 'Saving...') : t('Αποθήκευση', 'Save')}
      </button>
    </div>
  )
}
