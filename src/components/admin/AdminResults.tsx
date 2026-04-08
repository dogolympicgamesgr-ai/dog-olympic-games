'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminResults() {
  const supabase = createClient()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ member_id: '', dog_id: '', event_id: '', score: '', placement: '' })
  const [events, setEvents] = useState<any[]>([])
  const [resolvedDog, setResolvedDog] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadResults(); loadEvents() }, [filter])

  async function loadResults() {
    setLoading(true)
    const { data } = await supabase.from('competition_results')
      .select('*, events(title_el, location, event_date), dogs(name, dog_id), profiles(full_name, member_id)')
      .eq('status', filter).order('created_at', { ascending: false })
    setResults(data || [])
    setLoading(false)
  }

  async function loadEvents() {
    const { data } = await supabase.from('events').select('id, title_el, event_date').eq('status', 'approved').order('event_date', { ascending: false })
    setEvents(data || [])
  }

  async function updateStatus(id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('competition_results').update({ status, approved_by: user?.id }).eq('id', id)
    loadResults()
  }

  async function lookupDog() {
    if (!form.dog_id) return
    const { data } = await supabase.from('dogs').select('*, profiles(full_name, member_id)').eq('dog_id', form.dog_id).maybeSingle()
    setResolvedDog(data)
  }

  async function submitResult() {
    if (!resolvedDog || !form.event_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('competition_results').insert({
      event_id: form.event_id,
      dog_id: resolvedDog.id,
      owner_id: resolvedDog.owner_id,
      score: form.score ? parseFloat(form.score) : null,
      placement: form.placement ? parseInt(form.placement) : null,
      submitted_by: user?.id,
      approved_by: user?.id,
      status: 'approved',
    })
    setSaving(false)
    setSubmitting(false)
    setForm({ member_id: '', dog_id: '', event_id: '', score: '', placement: '' })
    setResolvedDog(null)
    setFilter('approved')
    loadResults()
  }

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', marginBottom: '0.65rem', outline: 'none' }
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['pending', 'approved'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 1rem', color: filter === s ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: filter === s ? 700 : 400, textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
        <button onClick={() => setSubmitting(!submitting)} style={{ marginLeft: 'auto', background: submitting ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', color: submitting ? 'var(--text-secondary)' : 'var(--bg)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          {submitting ? 'Cancel' : '+ Submit Result'}
        </button>
      </div>

      {submitting && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', marginBottom: '1rem' }}>SUBMIT RESULT</h3>
          <label style={labelStyle}>Dog ID (e.g. 00001.1)</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <input style={{...inputStyle, marginBottom: 0, flex: 1}} value={form.dog_id} onChange={e => setForm({...form, dog_id: e.target.value})} placeholder="00001.1" />
            <button onClick={lookupDog} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0 1rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}>Lookup</button>
          </div>
          {resolvedDog && (
            <div style={{ background: 'var(--bg)', border: '1px solid #7ef7a0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
              <p style={{ color: '#7ef7a0', fontWeight: 600 }}>✓ Found: {resolvedDog.name}</p>
              <p style={{ color: 'var(--text-secondary)' }}>Owner: {resolvedDog.profiles?.full_name} #{resolvedDog.profiles?.member_id}</p>
            </div>
          )}
          <label style={labelStyle}>Event</label>
          <select style={inputStyle} value={form.event_id} onChange={e => setForm({...form, event_id: e.target.value})}>
            <option value="">Select event...</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.title_el} — {e.event_date ? new Date(e.event_date).toLocaleDateString('el-GR') : 'No date'}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div><label style={labelStyle}>Score</label><input style={inputStyle} value={form.score} onChange={e => setForm({...form, score: e.target.value})} placeholder="e.g. 95.5" /></div>
            <div><label style={labelStyle}>Placement</label><input style={inputStyle} value={form.placement} onChange={e => setForm({...form, placement: e.target.value})} placeholder="e.g. 1" /></div>
          </div>
          <button onClick={submitResult} disabled={saving || !resolvedDog || !form.event_id} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', opacity: !resolvedDog || !form.event_id ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Submit Result'}
          </button>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No {filter} results</p>}
          {results.map(r => (
            <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.events?.title_el}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Dog: <span style={{ color: 'var(--accent)' }}>{r.dogs?.name}</span> · Owner: {r.profiles?.full_name} #{r.profiles?.member_id}
                </p>
                {r.placement && <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Placement: #{r.placement} {r.score && `· Score: ${r.score}`}</p>}
              </div>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => updateStatus(r.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(r.id, 'rejected')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
