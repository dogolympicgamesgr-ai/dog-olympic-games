import { createBrowserClient } from '@supabase/ssr'

function getCookieValue(name: string): string {
  const cookies: Record<string, string> = {}
  document.cookie.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=')
    cookies[k.trim()] = v.join('=')
  })
  // Reassemble chunked cookies (.0, .1, .2 etc)
  if (!cookies[name]) {
    let chunks = ''
    let i = 0
    while (cookies[`${name}.${i}`]) {
      chunks += cookies[`${name}.${i}`]
      i++
    }
    return chunks
  }
  return cookies[name] || ''
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').map(c => {
            const [name, ...val] = c.trim().split('=')
            return { name: name.trim(), value: val.join('=') }
          })
        },
        setAll(cookies) {
          if (typeof document === 'undefined') return
          cookies.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`
            if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`
            if (options?.path) cookie += `; Path=${options.path || '/'}`
            if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
            document.cookie = cookie
          })
        },
      },
    }
  )
}