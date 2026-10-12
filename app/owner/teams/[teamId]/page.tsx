import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import PaymentUploadForm from './PaymentUploadForm'
import AddPlayersForm from './AddPlayersForm'
import CopyButton from './CopyButton'

interface Props {
  params: Promise<{ teamId: string }>
  searchParams: Promise<{ error?: string; submitted?: string; added?: string }>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    confirmed: 'bg-green-100 text-green-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-blue-100 text-blue-800',
    removed: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function TeamDetailPage({ params, searchParams }: Props) {
  const { teamId } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, team_name, team_code, status, owner_user_id')
    .eq('id', teamId)
    .maybeSingle()

  if (!team || team.owner_user_id !== user.id) notFound()

  const [configResult, teamPaymentResult, playersResult] = await Promise.all([
    supabase.from('tournament_config').select('upi_id, team_fee_paise').maybeSingle(),
    supabase.from('payments').select('id, status, transaction_ref, created_at, review_note')
      .eq('team_id', teamId).eq('payment_type', 'team')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('players')
      .select('id, name, status, rating_status, submitted_rating, payment_token')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true }),
  ])

  const config = configResult.data
  const teamPayment = teamPaymentResult.data
  const players = playersResult.data ?? []

  const hasActivePayment = teamPayment && ['submitted', 'approved'].includes(teamPayment.status)
  const teamFeeDisplay = config?.team_fee_paise
    ? `₹${(config.team_fee_paise / 100).toLocaleString('en-IN')}`
    : '₹7,000'

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  const isConfirmed = team.status === 'confirmed'

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-3 text-sm">
        <Link href="/owner/dashboard" className="text-gray-500 hover:text-black transition-colors">
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <span className="font-medium">{team.team_name}</span>
      </nav>

      <div className="max-w-xl mx-auto p-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{team.team_name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Code: {team.team_code}</p>
        </div>

        {sp.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {decodeURIComponent(sp.error)}
          </div>
        )}
        {sp.submitted && (
          <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            Payment submitted. You'll be notified once it's reviewed.
          </div>
        )}
        {sp.added && (
          <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            Players added! Share each player's payment link so they can submit their ₹650.
          </div>
        )}

        {/* Team payment */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-lg mb-4">Team Payment</h2>
          {hasActivePayment ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={teamPayment!.status} />
              </div>
              <p className="text-gray-500 text-sm">
                Submitted {new Date(teamPayment!.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {teamPayment!.transaction_ref && (
                <p className="text-gray-500 text-sm mt-1">Ref: <span className="font-mono">{teamPayment!.transaction_ref}</span></p>
              )}
              {teamPayment!.review_note && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">
                  <span className="font-medium">Admin note:</span> {teamPayment!.review_note}
                </div>
              )}
            </div>
          ) : (
            <PaymentUploadForm teamId={teamId} upiId={config?.upi_id ?? null} teamFeeDisplay={teamFeeDisplay} />
          )}
        </div>

        {/* Players section — gated by FEATURE_PLAYERS env var */}
        {process.env.FEATURE_PLAYERS === 'true' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-lg mb-4">Players</h2>

          {players.length > 0 && (
            <div className="mb-6 space-y-2">
              {players.map((player) => {
                const paymentLink = `${baseUrl}/pay/player/${player.payment_token}`
                return (
                  <div key={player.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{player.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={player.status} />
                        <span className="text-gray-400 text-xs">
                          {player.rating_status === 'no_dupr'
                            ? 'No DUPR (3.75)'
                            : player.submitted_rating
                            ? `DUPR ${player.submitted_rating}`
                            : player.rating_status}
                        </span>
                      </div>
                    </div>
                    {player.status === 'pending_payment' && player.payment_token && (
                      <CopyButton text={paymentLink} label="Copy payment link" />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isConfirmed ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {players.length === 0
                  ? 'No players yet. Add your team roster below.'
                  : 'Add more players to your roster.'}
              </p>
              <AddPlayersForm teamId={teamId} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {team.status === 'pending_review' || team.status === 'pending_payment'
                ? 'Players can be added after your team payment is approved.'
                : 'Player registration is not available for this team status.'}
            </p>
          )}
        </div>
        )}
      </div>
    </main>
  )
}
