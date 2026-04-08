'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminSeminars() {
  const supabase = createClient()
  const [seminars, setSeminars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title_el: '', title_en: '', location: '', lat: '', lng: '', seminar_date: '', is_online: false, url: '' })

  useEffect(() => { loadSeminars() }, [filter])

  async function loadSeminars() {
    setLoading(true)
    const { data } = await supabase.from('seminars').select('*, profiles(full_name, member_id)').eq('status', filter).order('seminar_date', { ascending: true })
    setSeminars(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('seminars').update({ status }).eq('id', id)
    loadSeminars()
  }

  async function createSeminar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('seminars').insert({
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      seminar_date: form.seminar_date || null,
      created_by: user?.id,
      status: 'approved',
    })
    setSaving(false)
    setCreating(false)
    setFilter('approved')
    loadSeminars()
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', marginBottom: '0.65rem', outline: 'none' }
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['pending', 'approved', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 1rem', color: filter === s ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: filter === s ? 700 : 400, textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
        <button onClick={() => setCreating(!creating)} style={{ marginLeft: 'auto', background: creating ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', color: creating ? 'var(--text-secondary)' : 'var(--bg)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          {creating ? 'Cancel' : '+ New Seminar'}
        </button>
      </div>

      {creating && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', marginBottom: '1rem' }}>NEW SEMINAR</h3>
          <label style={labelStyle}>Title (Greek) *</label>
          <input style={inputStyle} value={form.title_el} onChange={e => setForm({...form, title_el: e.target.value})} />
          <label style={labelStyle}>Title (English)</label>
          <input style={inputStyle} value={form.title_en} onChange={e => setForm({...form, title_en: e.target.value})} />
          <label style={labelStyle}>Date</label>
          <input type="datetime-local" style={inputStyle} value={form.seminar_date} onChange={e => setForm({...form, seminar_date: e.target.value})} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.is_online} onChange={e => setForm({...form, is_online: e.target.checked})} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Online seminar</span>
          </div>

          {form.is_online
            ? <><label style={labelStyle}>URL</label><input style={inputStyle} value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." /></>
            : <><label style={labelStyle}>Location</label><input style={inputStyle} value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></>
          }

          <button onClick={createSeminar} disabled={saving || !form.title_el} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
            {saving ? 'Saving...' : 'Create Seminar'}
          </button>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {seminars.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No {filter} seminars</p>}
          {seminars.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.title_el} {s.is_online && <span style={{ color: '#7eb8f7', fontSize: '0.75rem' }}>ONLINE</span>}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {s.is_online ? s.url : s.location} · {s.seminar_date ? new Date(s.seminar_date).toLocaleDateString('el-GR') : 'No date'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {s.status === 'pending' && <>
                  <button onClick={() => updateStatus(s.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </>}
                {s.status === 'approved' && <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
