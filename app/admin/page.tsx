import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import TokenGenerator from './TokenGenerator'

function StatCard({
  label,
  value,
  color = 'gray',
}: {
  label: string
  value: number
  color?: 'green' | 'yellow' | 'blue' | 'orange' | 'gray'
}) {
  const colorMap = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    gray: 'text-gray-600',
  }
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: teams }, { data: pendingPayments }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, team_name, team_code, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id')
      .eq('status', 'submitted'),
  ])

  const statusCounts = (teams ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-sm">VYBE Admin</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/payments" className="text-sm text-gray-600 hover:text-black transition-colors">
            Payments
          </Link>
          <form action={signOut}>
            <button className="text-sm text-gray-500 hover:text-black transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">BYOT Tournament — 21 October 2026</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Confirmed" value={statusCounts.confirmed ?? 0} color="green" />
          <StatCard label="Pending review" value={statusCounts.pending_review ?? 0} color="yellow" />
          <StatCard label="Waitlisted" value={statusCounts.waitlisted ?? 0} color="orange" />
          <StatCard label="Pending payment" value={statusCounts.pending_payment ?? 0} color="blue" />
        </div>

        {/* Payment queue alert */}
        {(pendingPayments?.length ?? 0) > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-800">
              {pendingPayments!.length} payment
              {pendingPayments!.length !== 1 ? 's' : ''} awaiting review
            </p>
            <Link
              href="/admin/payments"
              className="bg-yellow-600 text-white text-sm px-4 py-1.5 rounded hover:bg-yellow-700 transition-colors"
            >
              Review →
            </Link>
          </div>
        )}

        {/* Token generator */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-1">Registration Links</h2>
          <p className="text-gray-500 text-sm mb-4">
            Generate a private one-time link to share with a team owner. Each link creates
            a pending team slot.
          </p>
          <TokenGenerator />
        </div>

        {/* Teams table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">All Teams</h2>
            <span className="text-gray-400 text-sm">{teams?.length ?? 0} total</span>
          </div>

          {!teams?.length ? (
            <p className="p-6 text-sm text-gray-500">No teams yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {team.team_name || (
                          <span className="text-gray-400 italic">Unnamed</span>
                        )}
                      </p>
                      <p className="text-gray-400 text-xs">{team.team_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          team.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : team.status === 'pending_review'
                            ? 'bg-blue-100 text-blue-800'
                            : team.status === 'waitlisted'
                            ? 'bg-orange-100 text-orange-800'
                            : team.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {team.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/teams/${team.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
