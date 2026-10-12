import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    waitlisted: 'bg-orange-100 text-orange-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    refund_due: 'bg-orange-100 text-orange-800',
    refunded: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function OwnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, team_name, team_code, status, confirmed_at, admin_notes')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  const { data: teamPayment } = team
    ? await supabase
        .from('payments')
        .select('id, status, amount_paise, created_at, review_note')
        .eq('team_id', team.id)
        .eq('payment_type', 'team')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-sm">VYBE Social</span>
        <form action={signOut}>
          <button className="text-sm text-gray-500 hover:text-black transition-colors">
            Sign out
          </button>
        </form>
      </nav>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Team Dashboard</h1>

        {!team ? (
          <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
            <p>No team found for your account.</p>
            <p className="text-sm mt-2">
              Contact the tournament organiser for your registration link.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Team card */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {team.team_name || (
                      <span className="text-gray-400 italic">Unnamed team</span>
                    )}
                  </h2>
                  <p className="text-gray-400 text-sm mt-0.5">Code: {team.team_code}</p>
                </div>
                <StatusBadge status={team.status} />
              </div>

              {team.confirmed_at && (
                <p className="text-green-600 text-sm mt-3">
                  Confirmed on{' '}
                  {new Date(team.confirmed_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}

              {team.admin_notes && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">
                  <span className="font-medium">Note from admin:</span> {team.admin_notes}
                </div>
              )}

              <div className="mt-4">
                <Link
                  href={`/owner/teams/${team.id}`}
                  className="inline-block bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                >
                  View team details →
                </Link>
              </div>
            </div>

            {/* Payment card */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-medium mb-3">Team Payment (₹7,000)</h3>

              {!teamPayment ? (
                <div>
                  <p className="text-gray-500 text-sm mb-3">Payment not yet submitted.</p>
                  {team.status === 'pending_payment' && (
                    <Link
                      href={`/owner/teams/${team.id}`}
                      className="inline-block bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                    >
                      Submit payment proof →
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={teamPayment.status} />
                    <span className="text-gray-400 text-xs">
                      Submitted{' '}
                      {new Date(teamPayment.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {teamPayment.review_note && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                      <span className="font-medium">Note:</span> {teamPayment.review_note}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
