import { createClient } from '@/lib/supabase/server'
import { validateRegistrationToken } from '@/lib/tokens'
import { sendMagicLink } from '@/app/actions/auth'
import { registerTeam } from '@/app/actions/registration'

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>
}

export default async function RegisterTeamPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Invalid Link</h1>
          <p className="text-gray-500 mt-2 text-sm">
            This registration link is missing or invalid.
          </p>
        </div>
      </main>
    )
  }

  // Validate token server-side before rendering anything
  let tokenError = ''
  try {
    await validateRegistrationToken(token)
  } catch (err) {
    tokenError = (err as Error).message
  }

  if (tokenError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold text-gray-800">Link Unavailable</h1>
          <p className="text-gray-500 mt-2 text-sm">{tokenError}</p>
          <p className="text-gray-400 mt-4 text-xs">
            Contact the tournament organiser if you believe this is an error.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const nextPath = `/register/team?token=${encodeURIComponent(token)}`

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">VYBE Social</h1>
          <p className="text-gray-500 text-sm mt-1">BYOT Tournament — 21 October 2026</p>
        </div>

        {params.error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {!user ? (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-lg mb-1">Step 1 of 2 — Verify your email</h2>
            <p className="text-gray-500 text-sm mb-4">
              Enter your email to receive a sign-in link. You'll complete registration after
              clicking it.
            </p>
            <form action={sendMagicLink}>
              <input type="hidden" name="next" value={nextPath} />
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                className="mt-4 w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Send sign-in link
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-lg mb-1">Step 2 of 2 — Your team details</h2>
            <p className="text-gray-500 text-sm mb-4">
              Signed in as <span className="font-medium text-gray-800">{user.email}</span>
            </p>
            <form action={registerTeam} className="space-y-4">
              <input type="hidden" name="token" value={token} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="team_name"
                  required
                  maxLength={60}
                  placeholder="e.g. Fire Smashers"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="owner_name"
                  required
                  maxLength={80}
                  placeholder="Full name"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="owner_phone"
                  required
                  maxLength={20}
                  placeholder="+91 98765 43210"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact email (optional)
                </label>
                <input
                  type="email"
                  name="owner_email"
                  defaultValue={user.email ?? ''}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Register team →
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
