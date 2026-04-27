import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:noreply@canathlon.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Notification types that also trigger an email
const EMAIL_TYPES = ['title_earned', 'no_show_warning']

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase DB webhook sends { type, table, record, old_record }
    const notification = payload.record
    if (!notification) return new Response('no record', { status: 200 })

    const { user_id, type, title_el, title_en, message_el, message_en, metadata } = notification

    // ── 1. PUSH NOTIFICATIONS ──
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (subscriptions && subscriptions.length > 0) {
      const pushPayload = JSON.stringify({
        title: title_el || 'Canathlon',
        body: message_el || '',
        url: metadata?.action_url || '/',
      })

      const pushResults = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          )
        )
      )

      // Clean up expired/invalid subscriptions (410 Gone)
      for (let i = 0; i < pushResults.length; i++) {
        const result = pushResults[i]
        if (result.status === 'rejected') {
          const err = result.reason as any
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscriptions[i].endpoint)
          }
        }
      }
    }

    // ── 2. EMAIL (only for specific types) ──
    if (EMAIL_TYPES.includes(type)) {
      // Check user opted in
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_notifications, display_email, full_name')
        .eq('id', user_id)
        .maybeSingle()

      if (profile?.email_notifications && profile?.display_email) {
        const name = profile.full_name || 'Canathlon Member'
        const subject = type === 'title_earned'
          ? `🏅 Νέος Τίτλος! — ${title_el}`
          : `⚠️ Προειδοποίηση Απουσίας — ${title_el}`

        const html = buildEmailHtml({ name, title_el, title_en, message_el, message_en, type })

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Canathlon <noreply@canathlon.com>',
            to: profile.display_email,
            subject,
            html,
          }),
        })
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('notify function error:', err)
    return new Response('error', { status: 200 }) // always 200 to avoid webhook retries
  }
})

function buildEmailHtml({ name, title_el, message_el, type }: {
  name: string
  title_el: string
  title_en: string
  message_el: string
  message_en: string
  type: string
}) {
  const isTitle = type === 'title_earned'
  const accentColor = '#D4AF37'
  const bgColor = '#0a0f1e'
  const cardBg = '#111827'

  return `
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title_el}</title>
</head>
<body style="margin:0;padding:0;background:${bgColor};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bgColor};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:28px;font-weight:900;letter-spacing:4px;color:${accentColor};text-transform:uppercase;">
                CANATHLON
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">
                Official Platform
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${cardBg};border-radius:16px;border:1px solid #1f2937;padding:32px;">
              <p style="margin:0 0 8px;font-size:32px;text-align:center;">
                ${isTitle ? '🏅' : '⚠️'}
              </p>
              <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f9fafb;text-align:center;">
                ${title_el}
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.6;text-align:center;">
                Γεια σου ${name},<br/>${message_el}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://www.canathlon.com" style="display:inline-block;background:${accentColor};color:#0a0f1e;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
                      ΑΝΟΙΞΕ ΤΟ CANATHLON
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#4b5563;line-height:1.6;">
                Έλαβες αυτό το email γιατί έχεις ενεργοποιημένες τις ειδοποιήσεις email.<br/>
                <a href="https://www.canathlon.com/profile" style="color:#6b7280;">Διαχείριση ρυθμίσεων</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
