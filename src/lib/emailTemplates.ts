// ─────────────────────────────────────────────
// Canathlon — Email Templates
// All outbound email content lives here.
// Import the function you need, pass the data, get { subject, html }.
// ─────────────────────────────────────────────

const BASE_STYLES = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #0a0f1e;
  color: #e8eaf6;
  margin: 0; padding: 0;
`

const CARD_STYLE = `
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 32px;
  max-width: 560px;
  margin: 40px auto;
`

const ACCENT = '#7ef7a0'
const MUTED = '#94a3b8'

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="${BASE_STYLES}">
  <div style="${CARD_STYLE}">
    <div style="text-align:center; margin-bottom:28px;">
      <p style="font-family:'Bebas Neue',Impact,sans-serif; font-size:28px; color:${ACCENT}; letter-spacing:0.1em; margin:0;">
        CANATHLON
      </p>
      <p style="font-size:12px; color:${MUTED}; margin:4px 0 0;">www.canathlon.com</p>
    </div>
    ${content}
    <div style="margin-top:32px; padding-top:20px; border-top:1px solid #1e293b; text-align:center;">
      <p style="font-size:11px; color:${MUTED}; margin:0;">
        Αυτό το email στάλθηκε από το Canathlon. / This email was sent by Canathlon.<br/>
        <a href="https://www.canathlon.com" style="color:${ACCENT}; text-decoration:none;">www.canathlon.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── New Event Announcement ───────────────────

export interface EventTemplateData {
  title_el: string
  title_en?: string
  location: string
  event_date: string   // ISO string
  id: string
}

export function newEventTemplate(event: EventTemplateData): { subject: string; html: string } {
  const dateFormatted = new Date(event.event_date).toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const dateFormattedEn = new Date(event.event_date).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const url = `https://www.canathlon.com/events/${event.id}`

  const html = baseLayout(`
    <div style="margin-bottom:20px;">
      <span style="background:${ACCENT}22; border:1px solid ${ACCENT}44; border-radius:99px; padding:4px 12px; font-size:12px; color:${ACCENT}; font-weight:600;">
        🏆 Νέος Αγώνας / New Event
      </span>
    </div>
    <h1 style="font-size:22px; color:#e8eaf6; font-weight:700; margin:0 0 8px;">${event.title_el}</h1>
    ${event.title_en ? `<p style="font-size:14px; color:${MUTED}; margin:0 0 20px;">${event.title_en}</p>` : ''}
    <div style="background:#0a0f1e; border-radius:8px; padding:16px; margin-bottom:24px;">
      <p style="margin:0 0 8px; font-size:14px; color:#e8eaf6;">
        📅 <strong>${dateFormatted}</strong>
      </p>
      <p style="margin:0 0 8px; font-size:12px; color:${MUTED};">${dateFormattedEn}</p>
      <p style="margin:0; font-size:14px; color:#e8eaf6;">
        📍 ${event.location}
      </p>
    </div>
    <p style="font-size:14px; color:${MUTED}; margin:0 0 24px;">
      Ένας νέος αγώνας είναι διαθέσιμος στην πλατφόρμα Canathlon. Δείτε τις λεπτομέρειες και εγγραφείτε έγκαιρα.<br/>
      <span style="font-size:12px;">A new event is now available on Canathlon. View details and register early.</span>
    </p>
    <a href="${url}" style="display:inline-block; background:${ACCENT}; color:#0a0f1e; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
      Δείτε τον Αγώνα / View Event →
    </a>
  `)

  return {
    subject: `🏆 Νέος Αγώνας: ${event.title_el}`,
    html,
  }
}

// ─── New Seminar Announcement ─────────────────

export interface SeminarTemplateData {
  title_el: string
  title_en?: string
  location?: string
  seminar_date: string  // ISO string
  is_online: boolean
  id: string
}

export function newSeminarTemplate(seminar: SeminarTemplateData): { subject: string; html: string } {
  const dateFormatted = new Date(seminar.seminar_date).toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const dateFormattedEn = new Date(seminar.seminar_date).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const url = `https://www.canathlon.com/seminars/${seminar.id}`
  const locationLine = seminar.is_online
    ? '🌐 Online'
    : `📍 ${seminar.location || ''}`

  const html = baseLayout(`
    <div style="margin-bottom:20px;">
      <span style="background:#7eb8f722; border:1px solid #7eb8f744; border-radius:99px; padding:4px 12px; font-size:12px; color:#7eb8f7; font-weight:600;">
        📚 Νέο Σεμινάριο / New Seminar
      </span>
    </div>
    <h1 style="font-size:22px; color:#e8eaf6; font-weight:700; margin:0 0 8px;">${seminar.title_el}</h1>
    ${seminar.title_en ? `<p style="font-size:14px; color:${MUTED}; margin:0 0 20px;">${seminar.title_en}</p>` : ''}
    <div style="background:#0a0f1e; border-radius:8px; padding:16px; margin-bottom:24px;">
      <p style="margin:0 0 8px; font-size:14px; color:#e8eaf6;">
        📅 <strong>${dateFormatted}</strong>
      </p>
      <p style="margin:0 0 8px; font-size:12px; color:${MUTED};">${dateFormattedEn}</p>
      <p style="margin:0; font-size:14px; color:#e8eaf6;">
        ${locationLine}
        ${seminar.is_online ? '<span style="margin-left:8px; font-size:11px; color:#7eb8f7; background:#7eb8f711; border:1px solid #7eb8f733; border-radius:99px; padding:2px 8px;">Online</span>' : ''}
      </p>
    </div>
    <p style="font-size:14px; color:${MUTED}; margin:0 0 24px;">
      Ένα νέο σεμινάριο είναι διαθέσιμο στην πλατφόρμα Canathlon. Δείτε τις λεπτομέρειες και δηλώστε συμμετοχή.<br/>
      <span style="font-size:12px;">A new seminar is now available on Canathlon. View details and register.</span>
    </p>
    <a href="${url}" style="display:inline-block; background:#7eb8f7; color:#0a0f1e; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
      Δείτε το Σεμινάριο / View Seminar →
    </a>
  `)

  return {
    subject: `📚 Νέο Σεμινάριο: ${seminar.title_el}`,
    html,
  }
}

// ─── Custom Broadcast ─────────────────────────

export interface BroadcastTemplateData {
  title_el: string
  title_en: string
  message_el: string
  message_en: string
}

export function broadcastTemplate(data: BroadcastTemplateData): { subject: string; html: string } {
  const html = baseLayout(`
    <div style="margin-bottom:20px;">
      <span style="background:${ACCENT}22; border:1px solid ${ACCENT}44; border-radius:99px; padding:4px 12px; font-size:12px; color:${ACCENT}; font-weight:600;">
        📢 Ανακοίνωση / Announcement
      </span>
    </div>
    <h1 style="font-size:22px; color:#e8eaf6; font-weight:700; margin:0 0 6px;">${data.title_el}</h1>
    <p style="font-size:14px; color:${MUTED}; margin:0 0 24px;">${data.title_en}</p>
    <div style="border-left:3px solid ${ACCENT}; padding-left:16px; margin-bottom:24px;">
      <p style="font-size:15px; color:#e8eaf6; margin:0 0 12px; line-height:1.6;">${data.message_el}</p>
      <p style="font-size:13px; color:${MUTED}; margin:0; line-height:1.6;">${data.message_en}</p>
    </div>
    <a href="https://www.canathlon.com" style="display:inline-block; background:${ACCENT}; color:#0a0f1e; font-weight:700; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;">
      Canathlon →
    </a>
  `)

  return {
    subject: `📢 ${data.title_el}`,
    html,
  }
}
