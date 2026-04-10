import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ user: null, profile: null, isAdmin: false })

    const [profileRes, adminRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
    ])

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: profileRes.data,
      isAdmin: !!adminRes.data,
    })
  } catch {
    return NextResponse.json({ user: null, profile: null, isAdmin: false })
  }
}