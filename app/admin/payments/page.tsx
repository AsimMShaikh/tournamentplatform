import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { approvePayment, rejectPayment, approvePlayerPaymentAction, rejectPlayerPaymentAction } from '@/app/actions/admin'

interface Props {
  searchParams: Promise<{ error?: string; approved?: string; rejected?: string }>
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      payment_type,
      amount_paise,
      transaction_ref,
      status,
      created_at,
      review_note,
      team_id,
      player_id,
      teams ( team_name, team_code )
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-3 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-black transition-colors">
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <span className="font-medium">Payment Review</span>
      </nav>

      <div className="max-w-3xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Payments Awaiting Review</h1>
          <span className="text-gray-400 text-sm">{payments?.length ?? 0} pending</span>
        </div>

        {sp.error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {decodeURIComponent(sp.error)}
          </div>
        )}

        {sp.approved && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            Payment approved successfully.
          </div>
        )}

        {sp.rejected && (
          <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
            Payment rejected.
          </div>
        )}

        {!payments?.length ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <p className="text-lg">All clear</p>
            <p className="text-sm mt-1">No payments are waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const teamRows = payment.teams as unknown as { team_name: string; team_code: string }[] | { team_name: string; team_code: string } | null
              const team = Array.isArray(teamRows) ? (teamRows[0] ?? null) : teamRows
              const amountDisplay = `₹${(payment.amount_paise / 100).toLocaleString('en-IN')}`

              return (
                <div key={payment.id} className="bg-white rounded-lg border p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">
                        {team?.team_name || (
                          <span className="text-gray-400 italic">Unnamed team</span>
                        )}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {team?.team_code} · {payment.payment_type} payment ·{' '}
                        {amountDisplay}
                      </p>
                    </div>
                    <Link
                      href={`/admin/teams/${payment.team_id}`}
                      className="text-blue-600 hover:underline text-xs shrink-0"
                    >
                      View team →
                    </Link>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>
                      Submitted:{' '}
                      {new Date(payment.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {payment.transaction_ref && (
                      <p className="mt-0.5">
                        Ref:{' '}
                        <span className="font-mono">{payment.transaction_ref}</span>
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {payment.payment_type === 'team' ? (
                      <>
                        <form action={approvePayment}>
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="hidden" name="review_note" value="" />
                          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">Approve</button>
                        </form>
                        <form action={rejectPayment} className="flex flex-col gap-2">
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="text" name="review_note" required placeholder="Rejection reason (required)"
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                          <button type="submit" className="w-full bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors">Reject</button>
                        </form>
                      </>
                    ) : (
                      <>
                        <form action={approvePlayerPaymentAction}>
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="hidden" name="player_id" value={payment.player_id ?? ''} />
                          <input type="hidden" name="team_id" value={payment.team_id} />
                          <input type="hidden" name="review_note" value="" />
                          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">Approve</button>
                        </form>
                        <form action={rejectPlayerPaymentAction} className="flex flex-col gap-2">
                          <input type="hidden" name="payment_id" value={payment.id} />
                          <input type="hidden" name="player_id" value={payment.player_id ?? ''} />
                          <input type="hidden" name="team_id" value={payment.team_id} />
                          <input type="text" name="review_note" required placeholder="Rejection reason (required)"
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                          <button type="submit" className="w-full bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors">Reject</button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
