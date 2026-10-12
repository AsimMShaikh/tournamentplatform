import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getPaymentProofSignedUrl } from '@/lib/domain/payments'
import {
  approvePayment, rejectPayment,
  approvePlayerPaymentAction, rejectPlayerPaymentAction,
  verifyPlayerRatingAction,
} from '@/app/actions/admin'

interface Props {
  params: Promise<{ teamId: string }>
  searchParams: Promise<{ error?: string; player_approved?: string; player_rejected?: string; rating_updated?: string }>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    waitlisted: 'bg-orange-100 text-orange-800',
    rejected: 'bg-red-100 text-red-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    no_dupr: 'bg-gray-100 text-gray-600',
    verified: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function AdminTeamDetailPage({ params, searchParams }: Props) {
  const { teamId } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [teamResult, paymentsResult, playersResult] = await Promise.all([
    supabase.from('teams')
      .select('id, team_name, team_code, status, owner_name, owner_phone, owner_email, confirmed_at, admin_notes')
      .eq('id', teamId).maybeSingle(),
    supabase.from('payments')
      .select('id, payment_type, amount_paise, status, screenshot_path, transaction_ref, created_at, review_note, player_id')
      .eq('team_id', teamId).order('created_at', { ascending: false }),
    supabase.from('players')
      .select('id, name, phone, email, dupr_id, submitted_rating, verified_rating, rating_status, status, confirmed_at, admin_notes')
      .eq('team_id', teamId).order('created_at', { ascending: true }),
  ])

  const team = teamResult.data
  const payments = paymentsResult.data ?? []
  const players = playersResult.data ?? []

  if (!team) notFound()

  // Team payment
  const teamPayment = payments.find(p => p.payment_type === 'team' && p.status === 'submitted')

  // Player payments indexed by player_id
  const playerPayments = payments.reduce<Record<string, typeof payments[number]>>((acc, p) => {
    if (p.payment_type === 'player' && p.player_id && !acc[p.player_id]) {
      acc[p.player_id] = p
    }
    return acc
  }, {})

  // Signed URL for team payment proof
  let teamProofUrl: string | null = null
  if (teamPayment?.screenshot_path) {
    try { teamProofUrl = await getPaymentProofSignedUrl(teamPayment.screenshot_path) } catch {}
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-3 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-black transition-colors">← Dashboard</Link>
        <span className="text-gray-300">|</span>
        <Link href="/admin/payments" className="text-gray-500 hover:text-black transition-colors">Payments</Link>
        <span className="text-gray-300">|</span>
        <span className="font-medium">{team.team_name || 'Unnamed team'}</span>
      </nav>

      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {sp.error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{decodeURIComponent(sp.error)}</div>}
        {sp.player_approved && <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">Player payment approved.</div>}
        {sp.player_rejected && <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">Player payment rejected.</div>}
        {sp.rating_updated && <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">Player rating updated.</div>}

        {/* Team info */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{team.team_name || <span className="text-gray-400 italic">Unnamed</span>}</h1>
              <p className="text-gray-400 text-sm">{team.team_code}</p>
            </div>
            <StatusBadge status={team.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Owner</dt><dd className="font-medium">{team.owner_name || '—'}</dd>
            <dt className="text-gray-500">Phone</dt><dd className="font-mono">{team.owner_phone || '—'}</dd>
            <dt className="text-gray-500">Email</dt><dd>{team.owner_email || '—'}</dd>
          </dl>
        </div>

        {/* Team payment review */}
        {teamPayment && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-lg mb-4">Review Team Payment</h2>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>Amount: <span className="font-medium">₹{(teamPayment.amount_paise / 100).toLocaleString('en-IN')}</span></p>
              {teamPayment.transaction_ref && <p>Ref: <span className="font-mono">{teamPayment.transaction_ref}</span></p>}
              <p>Submitted: {new Date(teamPayment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {teamProofUrl && (
              <div className="mb-4">
                <a href={teamProofUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-gray-100 text-gray-800 text-sm px-4 py-2 rounded hover:bg-gray-200 transition-colors">
                  View payment proof ↗
                </a>
                <p className="text-gray-400 text-xs mt-1">Link expires in 15 minutes.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <form action={approvePayment}>
                <input type="hidden" name="payment_id" value={teamPayment.id} />
                <input type="hidden" name="review_note" value="" />
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">Approve</button>
              </form>
              <form action={rejectPayment} className="flex flex-col gap-2">
                <input type="hidden" name="payment_id" value={teamPayment.id} />
                <input type="text" name="review_note" required placeholder="Rejection reason (required)"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button type="submit" className="w-full bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors">Reject</button>
              </form>
            </div>
          </div>
        )}

        {/* Players */}
        {players.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold">Players ({players.length})</h2>
            </div>
            <div className="divide-y">
              {players.map((player) => {
                const payment = playerPayments[player.id]
                return (
                  <div key={player.id} className="p-5 space-y-4">
                    {/* Player header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{player.phone || player.email || 'No contact'}</p>
                      </div>
                      <StatusBadge status={player.status} />
                    </div>

                    {/* DUPR info */}
                    <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400">Rating status: </span>
                        <StatusBadge status={player.rating_status} />
                      </div>
                      {player.submitted_rating && (
                        <div><span className="text-gray-400">Submitted: </span><span className="font-mono">{player.submitted_rating}</span></div>
                      )}
                      {player.dupr_id && (
                        <div><span className="text-gray-400">DUPR ID: </span><span className="font-mono">{player.dupr_id}</span></div>
                      )}
                      {player.verified_rating && (
                        <div><span className="text-gray-400">Verified: </span><span className="font-mono font-medium">{player.verified_rating}</span></div>
                      )}
                    </div>

                    {/* DUPR verification form */}
                    <form action={verifyPlayerRatingAction} className="bg-gray-50 rounded p-3 space-y-2">
                      <p className="text-xs font-medium text-gray-600">Verify DUPR Rating</p>
                      <input type="hidden" name="player_id" value={player.id} />
                      <input type="hidden" name="team_id" value={teamId} />
                      <div className="flex gap-2">
                        <select name="rating_status" defaultValue={player.rating_status}
                          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                          <option value="verified">Verified</option>
                          <option value="no_dupr">No DUPR</option>
                          <option value="disputed">Disputed</option>
                        </select>
                        <input type="number" name="verified_rating"
                          defaultValue={player.verified_rating ?? ''}
                          step="0.01" min="1" max="8"
                          placeholder="Rating (if verified)"
                          className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        <button type="submit"
                          className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-700 transition-colors">
                          Update
                        </button>
                      </div>
                    </form>

                    {/* Player payment review */}
                    {payment && payment.status === 'submitted' && (
                      <div className="bg-blue-50 border border-blue-100 rounded p-3 space-y-3">
                        <p className="text-xs font-medium text-blue-800">Player Payment — Awaiting Review</p>
                        <div className="text-sm text-gray-600 space-y-0.5">
                          <p>Amount: ₹{(payment.amount_paise / 100).toLocaleString('en-IN')}</p>
                          {payment.transaction_ref && <p>Ref: <span className="font-mono">{payment.transaction_ref}</span></p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <form action={approvePlayerPaymentAction}>
                            <input type="hidden" name="payment_id" value={payment.id} />
                            <input type="hidden" name="player_id" value={player.id} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="review_note" value="" />
                            <button type="submit" className="w-full bg-green-600 text-white py-1.5 rounded text-xs font-medium hover:bg-green-700 transition-colors">Approve</button>
                          </form>
                          <form action={rejectPlayerPaymentAction} className="flex flex-col gap-1">
                            <input type="hidden" name="payment_id" value={payment.id} />
                            <input type="hidden" name="player_id" value={player.id} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="text" name="review_note" required placeholder="Rejection reason"
                              className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400" />
                            <button type="submit" className="w-full bg-red-600 text-white py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors">Reject</button>
                          </form>
                        </div>
                      </div>
                    )}

                    {payment && payment.status !== 'submitted' && (
                      <p className="text-xs text-gray-500">
                        Payment: <StatusBadge status={payment.status} />
                        {payment.review_note && <span className="ml-2 italic">"{payment.review_note}"</span>}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Full payment history */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b"><h2 className="font-semibold">Payment History</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 capitalize">{p.payment_type}</td>
                    <td className="px-4 py-3">₹{(p.amount_paise / 100).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
