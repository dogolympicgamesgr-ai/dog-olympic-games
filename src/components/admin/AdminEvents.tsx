'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminEvents() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title_el: '', title_en: '', description_el: '', description_en: '', location: '', lat: '', lng: '', event_date: '' })

  useEffect(() => { loadEvents() }, [filter])

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase.from('events').select('*, profiles(full_name, member_id)').eq('status', filter).order('event_date', { ascending: true })
    setEvents(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('events').update({ status }).eq('id', id)
    loadEvents()
  }

  async function createEvent() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('events').insert({
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      event_date: form.event_date || null,
      created_by: user?.id,
      status: 'approved',
    })
    setSaving(false)
    setCreating(false)
    setForm({ title_el: '', title_en: '', description_el: '', description_en: '', location: '', lat: '', lng: '', event_date: '' })
    setFilter('approved')
    loadEvents()
  }

  const statusColor = (s: string) => s === 'approved' ? '#7ef7a0' : s === 'cancelled' ? '#f77e7e' : 'var(--accent)'
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
          {creating ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {creating && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', marginBottom: '1rem' }}>NEW EVENT</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div><label style={labelStyle}>Title (Greek) *</label><input style={inputStyle} value={form.title_el} onChange={e => setForm({...form, title_el: e.target.value})} /></div>
            <div><label style={labelStyle}>Title (English)</label><input style={inputStyle} value={form.title_en} onChange={e => setForm({...form, title_en: e.target.value})} /></div>
            <div><label style={labelStyle}>Description (GR)</label><textarea style={{...inputStyle, minHeight: '70px', resize: 'vertical'}} value={form.description_el} onChange={e => setForm({...form, description_el: e.target.value})} /></div>
            <div><label style={labelStyle}>Description (EN)</label><textarea style={{...inputStyle, minHeight: '70px', resize: 'vertical'}} value={form.description_en} onChange={e => setForm({...form, description_en: e.target.value})} /></div>
            <div><label style={labelStyle}>Location</label><input style={inputStyle} value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
            <div><label style={labelStyle}>Event Date</label><input type="datetime-local" style={inputStyle} value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} /></div>
            <div><label style={labelStyle}>Latitude</label><input style={inputStyle} value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} placeholder="e.g. 37.9838" /></div>
            <div><label style={labelStyle}>Longitude</label><input style={inputStyle} value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} placeholder="e.g. 23.7275" /></div>
          </div>
          <button onClick={createEvent} disabled={saving || !form.title_el} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', opacity: !form.title_el ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Create Event'}
          </button>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {events.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No {filter} events</p>}
          {events.map(event => (
            <div key={event.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem' }}>{event.title_el}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {event.location} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : 'No date'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  By: {event.profiles?.full_name || 'Admin'} #{event.profiles?.member_id}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {event.status === 'pending' && <>
                  <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </>}
                {event.status === 'approved' && <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>}
                {event.status === 'cancelled' && <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Restore</button>}
                <span style={{ background: 'var(--bg)', borderRadius: '6px', padding: '0.4rem 0.75rem', color: statusColor(event.status), fontSize: '0.8rem' }}>{event.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
