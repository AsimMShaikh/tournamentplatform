import { signInAdmin } from '@/app/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">VYBE Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">Tournament administration</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          {params.error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {decodeURIComponent(params.error)}
            </div>
          )}

          <form action={signInAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
