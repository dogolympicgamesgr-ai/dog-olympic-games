'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const ALL_ROLES = ['judge', 'organizer', 'decoy']

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [banning, setBanning] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [showBanForm, setShowBanForm] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('member_id')
    setUsers(data || [])
    setLoading(false)
  }

  async function selectUser(user: any) {
    setSelected(user)
    setShowBanForm(false)
    setBanReason('')
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
    setUserRoles(data?.map((r: any) => r.role).filter((r: string) => r !== 'admin') || [])
  }

  async function saveRoles() {
    if (!selected) return
    setSaving(true)
    await supabase.from('user_roles').delete().eq('user_id', selected.id).in('role', ALL_ROLES)
    if (userRoles.length > 0) {
      await supabase.from('user_roles').insert(userRoles.map(role => ({ user_id: selected.id, role })))
    }
    setSaving(false)
    loadUsers()
  }

  async function banUser() {
    if (!selected) return
    setBanning(true)
    await supabase.from('profiles').update({ status: 'banned', ban_reason: banReason }).eq('id', selected.id)
    setBanning(false)
    setShowBanForm(false)
    setSelected({ ...selected, status: 'banned', ban_reason: banReason })
    loadUsers()
  }

  async function unbanUser() {
    if (!selected) return
    await supabase.from('profiles').update({ status: 'active', ban_reason: null }).eq('id', selected.id)
    setSelected({ ...selected, status: 'active', ban_reason: null })
    loadUsers()
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.member_id?.includes(search) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s: string) => s === 'banned' ? '#f77e7e' : s === 'deleted' ? '#888' : 'var(--text-secondary)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="admin-grid">
      {/* User list */}
      <div>
        <input
          placeholder="Search by name, ID or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', marginBottom: '1rem', outline: 'none' }}
        />
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
            {filtered.map(user => (
              <div key={user.id} onClick={() => selectUser(user)} style={{
                background: selected?.id === user.id ? 'var(--bg)' : 'var(--bg-card)',
                border: `1px solid ${selected?.id === user.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px', padding: '0.75rem 1rem', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>
                    {user.full_name || 'No name'} <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>#{user.member_id}</span>
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{user.email}</p>
                </div>
                <span style={{ fontSize: '0.72rem', color: statusColor(user.status) }}>{user.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User detail */}
      <div>
        {!selected ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '3rem' }}>
            Select a user to manage
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>{selected.full_name || 'No name'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Member ID: {selected.member_id}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.15rem' }}>{selected.email}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Status: <span style={{ color: statusColor(selected.status) }}>{selected.status}</span>
            </p>

            {/* Roles */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles</p>
            {ALL_ROLES.map(role => (
              <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={userRoles.includes(role)}
                  onChange={e => setUserRoles(e.target.checked ? [...userRoles, role] : userRoles.filter(r => r !== role))}
                  style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{role}</span>
              </label>
            ))}

            <button onClick={saveRoles} disabled={saving} style={{
              width: '100%', marginTop: '1rem', background: 'var(--accent)', border: 'none',
              borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : 'Save Roles'}
            </button>

            {/* Ban/Unban */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {selected.status === 'banned' ? (
                <button onClick={unbanUser} style={{
                  width: '100%', background: 'transparent', border: '1px solid #7ef7a0',
                  borderRadius: '8px', padding: '0.75rem', color: '#7ef7a0',
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                }}>Unban User</button>
              ) : (
                <>
                  {!showBanForm ? (
                    <button onClick={() => setShowBanForm(true)} style={{
                      width: '100%', background: 'transparent', border: '1px solid #f77e7e',
                      borderRadius: '8px', padding: '0.75rem', color: '#f77e7e',
                      cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                    }}>Ban User</button>
                  ) : (
                    <div>
                      <input placeholder="Ban reason..." value={banReason} onChange={e => setBanReason(e.target.value)}
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid #f77e7e', borderRadius: '8px', padding: '0.65rem', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setShowBanForm(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                        <button onClick={banUser} disabled={banning} style={{ flex: 1, background: '#f77e7e', border: 'none', borderRadius: '8px', padding: '0.65rem', color: '#0a0f1e', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Confirm Ban</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@media(max-width:768px){.admin-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}
