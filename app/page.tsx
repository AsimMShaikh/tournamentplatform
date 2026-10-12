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
      <section className="bg-gray-950 px-4 pt-20 pb-14">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-3">
            Sports · Community · Experiences
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            <span className="text-orange-500">VYBE</span>{' '}
            <span className="text-white">Social</span>
          </h1>
          <p className="text-gray-400 mt-3">
            {config?.name ?? 'Bring Your Own Team Tournament'}
          </p>
          <p className="text-gray-500 mt-1 text-sm">{eventDate}</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {registrationOpen ? (
              <Link
                href="/auth/login"
                className="bg-orange-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Sign in to manage your team
              </Link>
            ) : (
              <span className="bg-gray-800 text-gray-500 px-6 py-3 rounded-lg text-sm font-medium">
                Registration closed
              </span>
            )}
            <Link
              href="/rules"
              className="text-sm text-gray-400 hover:text-orange-400 transition-colors"
            >
              View rules & eligibility →
            </Link>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="max-w-2xl mx-auto px-4 py-12 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-orange-500 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-white">{config?.max_teams ?? 8}</p>
            <p className="text-sm text-orange-100 mt-1">Teams maximum</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-orange-400">{teamFee}</p>
            <p className="text-sm text-gray-400 mt-1">Per team</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-orange-400">{playerFee}</p>
            <p className="text-sm text-gray-400 mt-1">Per player</p>
          </div>
        </div>

        <div className="mt-4 bg-gray-900 rounded-xl p-5 text-sm space-y-2">
          <p className="text-gray-300"><span className="text-orange-500 mr-2">•</span>Maximum 8 players per team</p>
          <p className="text-gray-300"><span className="text-orange-500 mr-2">•</span>Cumulative DUPR cap of 30.0 per team</p>
          <p className="text-gray-300"><span className="text-orange-500 mr-2">•</span>Payment is UPI — screenshots reviewed manually</p>
          <p className="text-gray-300"><span className="text-orange-500 mr-2">•</span>Team slot confirmed only after payment approval</p>
        </div>
      </section>
    </main>
  )
}
