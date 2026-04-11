import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ user: null, profile: null, isAdmin: false, roles: [] })

    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
    ])

    const roles = rolesRes.data?.map((r: any) => r.role) || []

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: profileRes.data,
      isAdmin: roles.includes('admin'),
      roles,
    })
  } catch {
    return NextResponse.json({ user: null, profile: null, isAdmin: false, roles: [] })
  }
}