'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [showProfileNudge, setShowProfileNudge] = useState(false)

  useEffect(() => {
    initPush()
  }, [])

  async function initPush() {
    // Get session
    const res = await fetch('/auth/session')
    const session = await res.json()
    if (!session?.user) return

    // First login nudge — show if full_name is empty
    if (!session.profile?.phone) {
      setShowProfileNudge(true)
    }

    // Register service worker
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request push permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      // Subscribe
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const sub = subscription.toJSON()
      const p256dh = sub.keys?.p256dh
      const auth = sub.keys?.auth

      if (!p256dh || !auth) return

      // Upsert subscription — one row per device per user
      await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
      }, { onConflict: 'user_id,endpoint' })

    } catch (err) {
      console.error('Push setup error:', err)
    }
  }

  return (
    <>
      {children}

      {/* First login profile nudge */}
      {showProfileNudge && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: 'calc(100% - 3rem)', maxWidth: '420px',
          background: 'var(--bg-card)', border: '1px solid var(--accent)',
          borderRadius: '16px', padding: '1.25rem 1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.35rem', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', letterSpacing: '0.04em', color: 'var(--accent)' }}>
                👋 {t('Καλώς ήρθες στο Canathlon!', 'Welcome to Canathlon!')}
              </p>
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t(
                  'Συμπλήρωσε το προφίλ σου για να μπορείς να συμμετέχεις σε αγώνες και σεμινάρια.',
                  'Complete your profile to participate in events and seminars.'
                )}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setShowProfileNudge(false); router.push('/profile/edit') }}
                  style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.6rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem' }}
                >
                  {t('Συμπλήρωσε Προφίλ', 'Complete Profile')}
                </button>
                <button
                  onClick={() => setShowProfileNudge(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 1rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem' }}
                >
                  {t('Αργότερα', 'Later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
