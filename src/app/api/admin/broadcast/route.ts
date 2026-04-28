import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseserver'
import { broadcastTemplate, newEventTemplate, newSeminarTemplate } from '@/lib/emailTemplates'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM_EMAIL = 'noreply@canathlon.com'

// Audience → role name mapping (null = all users)
const AUDIENCE_ROLE: Record<string, string | null> = {
  all: null,
  judges: 'judge',
  organizers: 'organizer',
  decoys: 'decoy',
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return res.ok
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!roleRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    audience,           // 'all' | 'judges' | 'organizers' | 'decoys'
    title_el,
    title_en,
    message_el,
    message_en,
    channels,           // string[] — ['push', 'email']
    // Optional — for event/seminar notify buttons:
    item_type,          // 'event' | 'seminar' | undefined
    item_id,            // uuid | undefined
    item_data,          // full event/seminar object for template | undefined
  } = body

  if (!audience || !title_el || !title_en || !message_el || !message_en || !channels?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const roleFilter = AUDIENCE_ROLE[audience]

  // ── Fetch target user IDs ──────────────────────────────────────────
  let userIds: string[] = []

  if (roleFilter === null) {
    // All active users
    const { data } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('status', 'active')
    userIds = (data || []).map((r: any) => r.user_id)
  } else {
    // Users with a specific role
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', roleFilter)
    const roleUserIds = (data || []).map((r: any) => r.user_id)

    // Filter to active profiles only
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('status', 'active')
      .in('user_id', roleUserIds)
    userIds = (profiles || []).map((r: any) => r.user_id)
  }

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // ── Push: insert notifications (Edge Function handles delivery) ────
  if (channels.includes('push')) {
    const notifications = userIds.map(uid => ({
      user_id: uid,
      type: item_type === 'event' ? 'new_event_announced'
           : item_type === 'seminar' ? 'new_seminar_announced'
           : 'broadcast',
      title_el,
      title_en,
      message_el,
      message_en,
      metadata: item_id ? { [`${item_type}_id`]: item_id } : { audience },
    }))

    // Batch insert in chunks of 100 to avoid payload limits
    const CHUNK = 100
    for (let i = 0; i < notifications.length; i += CHUNK) {
      await supabase.from('notifications').insert(notifications.slice(i, i + CHUNK))
    }
  }

  // ── Email: send via Resend ─────────────────────────────────────────
  let emailSent = 0
  if (channels.includes('email')) {
    // Fetch display_email for users who have opted in
    const { data: emailProfiles } = await supabase
      .from('profiles')
      .select('user_id, display_email, email_notifications')
      .in('user_id', userIds)
      .eq('email_notifications', true)
      .not('display_email', 'is', null)

    const recipients = (emailProfiles || []).filter((p: any) => p.display_email)

    // Build email content
    let subject: string
    let html: string

    if (item_type === 'event' && item_data) {
      ;({ subject, html } = newEventTemplate(item_data))
    } else if (item_type === 'seminar' && item_data) {
      ;({ subject, html } = newSeminarTemplate(item_data))
    } else {
      ;({ subject, html } = broadcastTemplate({ title_el, title_en, message_el, message_en }))
    }

    // Send individually (Resend free tier doesn't support bulk to)
    // Fire concurrently in batches of 10
    const BATCH = 10
    for (let i = 0; i < recipients.length; i += BATCH) {
      await Promise.all(
        recipients.slice(i, i + BATCH).map((p: any) =>
          sendEmail(p.display_email, subject, html)
        )
      )
      emailSent += Math.min(BATCH, recipients.length - i)
    }
  }

  return NextResponse.json({
    ok: true,
    push_sent: channels.includes('push') ? userIds.length : 0,
    email_sent: emailSent,
  })
}
