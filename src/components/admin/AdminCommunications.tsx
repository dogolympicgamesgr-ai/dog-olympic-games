'use client'
import { useState } from 'react'
import { broadcastTemplate } from '@/lib/emailTemplates'

type Audience = 'all' | 'judges' | 'organizers' | 'decoys'

const AUDIENCES: { id: Audience; label: string; icon: string }[] = [
  { id: 'all',        icon: '👥', label: 'All Users' },
  { id: 'judges',     icon: '⚖️', label: 'All Judges' },
  { id: 'organizers', icon: '🗂️', label: 'All Organizers' },
  { id: 'decoys',     icon: '🦺', label: 'All Decoys' },
]

export default function AdminCommunications() {
  const [audience, setAudience]     = useState<Audience>('all')
  const [titleEl, setTitleEl]       = useState('')
  const [titleEn, setTitleEn]       = useState('')
  const [messageEl, setMessageEl]   = useState('')
  const [messageEn, setMessageEn]   = useState('')
  const [channels, setChannels]     = useState<Set<string>>(new Set(['push']))
  const [sending, setSending]       = useState(false)
  const [result, setResult]         = useState<{ push_sent: number; email_sent: number } | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [preview, setPreview]       = useState(false)

  function toggleChannel(ch: string) {
    setChannels(prev => {
      const next = new Set(prev)
      next.has(ch) ? next.delete(ch) : next.add(ch)
      return next
    })
  }

  const canSend =
    titleEl.trim() &&
    titleEn.trim() &&
    messageEl.trim() &&
    messageEn.trim() &&
    channels.size > 0

  const previewHtml = broadcastTemplate({
    title_el: titleEl || 'Τίτλος',
    title_en: titleEn || 'Title',
    message_el: messageEl || 'Μήνυμα...',
    message_en: messageEn || 'Message...',
  }).html

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          title_el: titleEl.trim(),
          title_en: titleEn.trim(),
          message_el: messageEl.trim(),
          message_en: messageEn.trim(),
          channels: Array.from(channels),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      // Reset form on success
      setTitleEl(''); setTitleEn(''); setMessageEl(''); setMessageEn('')
      setChannels(new Set(['push']))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────
  const audienceBtn = (id: Audience) => ({
    background: audience === id ? 'var(--accent)' : 'var(--bg-card)',
    border: `1px solid ${audience === id ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    color: audience === id ? 'var(--bg)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: audience === id ? 700 : 400,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.15s',
  } as const)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '0.65rem 0.9rem',
    color: 'var(--text-primary)',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
    display: 'block',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  return (
    <div style={{ maxWidth: '680px' }}>

      {/* ── Audience ──────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Audience</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {AUDIENCES.map(a => (
            <button key={a.id} onClick={() => setAudience(a.id)} style={audienceBtn(a.id)}>
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message ───────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Message</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Τίτλος (Greek)</label>
            <input
              value={titleEl}
              onChange={e => setTitleEl(e.target.value)}
              placeholder="π.χ. Νέος Αγώνας..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Title (English)</label>
            <input
              value={titleEn}
              onChange={e => setTitleEn(e.target.value)}
              placeholder="e.g. New Event..."
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Μήνυμα (Greek)</label>
            <textarea
              value={messageEl}
              onChange={e => setMessageEl(e.target.value)}
              placeholder="Γράψτε το μήνυμά σας..."
              style={textareaStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Message (English)</label>
            <textarea
              value={messageEn}
              onChange={e => setMessageEn(e.target.value)}
              placeholder="Write your message..."
              style={textareaStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Channels ──────────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Send via</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { id: 'push',  icon: '🔔', label: 'Push Notification' },
            { id: 'email', icon: '✉️', label: 'Email' },
          ].map(ch => (
            <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.has(ch.id)}
                onChange={() => toggleChannel(ch.id)}
                style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {ch.icon} {ch.label}
              </span>
            </label>
          ))}
        </div>
        {channels.has('email') && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
            Only users with email notifications enabled and a public email set will receive the email.
          </p>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          style={{
            background: canSend && !sending ? 'var(--accent)' : 'var(--border)',
            color: canSend && !sending ? 'var(--bg)' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.7rem 1.5rem',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: canSend && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {sending ? 'Sending...' : `📢 Send to ${AUDIENCES.find(a => a.id === audience)?.label}`}
        </button>

        {channels.has('email') && (
          <button
            onClick={() => setPreview(true)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.7rem 1.2rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.85rem',
            }}
          >
            👁️ Preview Email
          </button>
        )}
      </div>

      {/* ── Result / Error ────────────────────────────────────────── */}
      {result && (
        <div style={{ marginTop: '1rem', background: '#7ef7a011', border: '1px solid #7ef7a033', borderRadius: '8px', padding: '0.75rem 1rem' }}>
          <p style={{ color: '#7ef7a0', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            ✅ Message sent!
            {result.push_sent > 0 && ` · ${result.push_sent} push notification${result.push_sent !== 1 ? 's' : ''}`}
            {result.email_sent > 0 && ` · ${result.email_sent} email${result.email_sent !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
      {error && (
        <div style={{ marginTop: '1rem', background: '#f77e7e11', border: '1px solid #f77e7e33', borderRadius: '8px', padding: '0.75rem 1rem' }}>
          <p style={{ color: '#f77e7e', fontSize: '0.85rem', margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {/* ── Email Preview Modal ───────────────────────────────────── */}
      {preview && (
        <div
          onClick={() => setPreview(false)}
          style={{
            position: 'fixed', inset: 0, background: '#000000cc',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>📧 Email Preview</p>
              <button
                onClick={() => setPreview(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <iframe
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
