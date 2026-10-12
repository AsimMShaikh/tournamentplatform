import { sendMagicLink } from '@/app/actions/auth'

interface Props {
  searchParams: Promise<{ sent?: string; error?: string; email?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const next = params.next ?? '/owner/dashboard'

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">VYBE Social</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to manage your team</p>
        </div>

        {params.sent ? (
          <div className="bg-white rounded-lg border p-6 text-center">
            <div className="text-green-600 text-3xl mb-3">✓</div>
            <h2 className="font-semibold text-lg">Check your inbox</h2>
            <p className="text-gray-500 text-sm mt-2">
              We sent a sign-in link to{' '}
              <span className="font-medium text-gray-800">{params.email}</span>.
              Click it to continue.
            </p>
            <p className="text-gray-400 text-xs mt-4">The link expires in 1 hour.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-6">
            {params.error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {decodeURIComponent(params.error)}
              </div>
            )}

            <form action={sendMagicLink}>
              <input type="hidden" name="next" value={next} />

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
        )}
      </div>
    </main>
  )
}
