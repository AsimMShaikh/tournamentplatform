import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import PlayerPaymentForm from './PlayerPaymentForm'

interface Props {
  params: Promise<{ token: string }>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function PlayerPaymentPage({ params }: Props) {
  const { token } = await params

  const supabase = createAdminClient()

  // payment_token added in migration 013 — not yet in generated database.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (supabase as any)
    .from('players')
    .select('id, name, team_id, status, payment_token')
    .eq('payment_token', token)
    .maybeSingle() as { data: { id: string; name: string; team_id: string; status: string; payment_token: string } | null }

  if (!player) notFound()

  const { data: team } = await supabase
    .from('teams')
    .select('team_name, team_code')
    .eq('id', player.team_id)
    .maybeSingle()

  const { data: config } = await supabase
    .from('tournament_config')
    .select('upi_id, player_fee_paise')
    .maybeSingle()

  // Check if payment already submitted
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status, created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const playerFeeDisplay = config?.player_fee_paise
    ? `₹${(config.player_fee_paise / 100).toLocaleString('en-IN')}`
    : '₹650'

  const alreadySubmitted =
    existingPayment && ['submitted', 'approved'].includes(existingPayment.status)

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">VYBE Social</h1>
          <p className="text-gray-500 text-sm mt-1">Player Registration Payment</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          {/* Player + team info */}
          <div className="mb-6 pb-4 border-b">
            <p className="text-sm text-gray-500">Player</p>
            <p className="font-semibold text-lg">{player.name}</p>
            {team && (
              <p className="text-gray-400 text-sm mt-0.5">
                Team: {team.team_name} ({team.team_code})
              </p>
            )}
          </div>

          {alreadySubmitted ? (
            <div className="text-center py-4">
              <StatusBadge status={existingPayment!.status} />
              <p className="text-gray-600 text-sm mt-3">
                {existingPayment!.status === 'approved'
                  ? 'Your payment has been approved. You are confirmed!'
                  : 'Your payment proof has been submitted and is under review.'}
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Submitted on{' '}
                {new Date(existingPayment!.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ) : (
            <PlayerPaymentForm
              token={token}
              upiId={config?.upi_id as string | null ?? null}
              playerFeeDisplay={playerFeeDisplay}
            />
          )}
        </div>
      </div>
    </main>
  )
}
