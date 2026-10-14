'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

function buildBaseUrl(host: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = host ?? 'localhost:3000'
  const proto = h.startsWith('localhost') || h.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${h}`
}

export async function sendMagicLink(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const next = (formData.get('next') as string | null) ?? '/owner/dashboard'

  if (!email) {
    redirect(`/auth/login?error=Email+is+required&next=${encodeURIComponent(next)}`)
  }

  const headersList = await headers()
  const baseUrl = buildBaseUrl(headersList.get('host'))
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`)
  }

  redirect(`/auth/login?sent=1&email=${encodeURIComponent(email)}`)
}

export async function signInAdmin(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/admin')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
