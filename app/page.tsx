import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('tournament_config')
    .select('name, event_date, max_teams, team_fee_paise, player_fee_paise, registration_status')
    .maybeSingle()

  const teamFee = config?.team_fee_paise
    ? `₹${(config.team_fee_paise / 100).toLocaleString('en-IN')}`
    : '₹7,000'
  const playerFee = config?.player_fee_paise
    ? `₹${(config.player_fee_paise / 100).toLocaleString('en-IN')}`
    : '₹650'
  const eventDate = config?.event_date
    ? new Date(config.event_date).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '21 October 2026'

  const registrationOpen = config?.registration_status === 'open'

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 pt-20 pb-12 text-center">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
          Sports · Community · Experiences
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">VYBE Social</h1>
        <p className="text-xl text-gray-500 mt-3">
          {config?.name ?? 'Bring Your Own Team Tournament'}
        </p>
        <p className="text-gray-400 mt-2">{eventDate}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {registrationOpen ? (
            <Link
              href="/auth/login"
              className="bg-black text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Sign in to manage your team
            </Link>
          ) : (
            <span className="bg-gray-100 text-gray-500 px-6 py-3 rounded-lg text-sm font-medium">
              Registration closed
            </span>
          )}
          <Link
            href="/rules"
            className="text-sm text-gray-500 hover:text-black transition-colors"
          >
            View rules & eligibility →
          </Link>
        </div>
      </section>

      {/* Info cards */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold">{config?.max_teams ?? 8}</p>
            <p className="text-sm text-gray-500 mt-1">Teams maximum</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold">{teamFee}</p>
            <p className="text-sm text-gray-500 mt-1">Per team</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold">{playerFee}</p>
            <p className="text-sm text-gray-500 mt-1">Per player</p>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 rounded-xl p-5 text-sm text-gray-500 space-y-1.5">
          <p>• Maximum 8 players per team</p>
          <p>• Cumulative DUPR cap of 30.0 per team</p>
          <p>• Payment is UPI — screenshots reviewed manually</p>
          <p>• Team slot confirmed only after payment approval</p>
        </div>
      </section>
    </main>
  )
}
