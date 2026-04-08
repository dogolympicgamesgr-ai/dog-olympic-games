'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function ProfileCircle({ profile, onUpload }: { profile: any, onUpload: () => void }) {
  const { t } = useLang()
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const avatarUrl = profile?.avatar_url

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    setUploading(true)
    try {
      const compressed = await compressImage(file, 400)
      const path = `${profile.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl + '?t=' + Date.now() }).eq('id', profile.id)
      onUpload()
    } catch (err) {
      console.error(err)
    }
    setUploading(false)
  }

  async function compressImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
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

  return (
    <>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => avatarUrl && setLightbox(true)}>
        <div style={{
          width: '180px', height: '180px', borderRadius: '50%',
          border: '3px solid var(--accent)',
          background: 'var(--bg-card)',
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(232,185,79,0.15)',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover',  objectPosition: 'center top' }} />
          ) : (
            <span style={{ fontSize: '4rem' }}>🐾</span>
          )}
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600,
            }}>
              {t('Μεταφόρτωση...', 'Uploading...')}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'var(--accent)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer',
            fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={t('Αλλαγή φωτογραφίας', 'Change photo')}
        >📷</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, cursor: 'zoom-out',
        }}>
          <img src={avatarUrl} alt="avatar" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}
