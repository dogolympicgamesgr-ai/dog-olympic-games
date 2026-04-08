import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  return (
    <div style={{
      minHeight: '90vh',
      padding: '3rem 1.5rem',
      maxWidth: '900px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        color: 'var(--accent)',
        marginBottom: '0.5rem',
      }}>
        ΚΑΛΩΣ ΗΡΘΕΣ
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '1rem',
        marginBottom: '3rem',
      }}>
        {user.email}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {[
          { icon: '🐕', title: 'Οι Σκύλοι μου', desc: 'Διαχείριση σκύλων' },
          { icon: '👥', title: 'Η Ομάδα μου', desc: 'Ομάδα & μέλη' },
          { icon: '🏆', title: 'Αγώνες μου', desc: 'Ιστορικό συμμετοχών' },
          { icon: '📊', title: 'Κατάταξή μου', desc: 'Πόντοι & επίπεδο' },
        ].map(card => (
          <div key={card.title} className="section-card">
            <span style={{ fontSize: '2rem' }}>{card.icon}</span>
            <h3 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.3rem',
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}>{card.title}</h3>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}