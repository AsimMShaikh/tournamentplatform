import Link from 'next/link'

export const metadata = {
  title: 'Rules & Eligibility — VYBE Social Tournament',
}

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-20">

        {/* Back */}
        <Link href="/" className="text-sm text-gray-400 hover:text-black transition-colors">
          ← Back
        </Link>

        {/* Header */}
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">
            Sports · Community · Experiences
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">VYBE Social</h1>
          <p className="text-lg text-gray-500 mt-2">Bring Your Own Team — Tournament Rules & Format</p>
        </div>

        {/* Stats bar */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: '8', label: 'Teams' },
            { value: '8', label: 'Players / Team' },
            { value: '≤ 30.0', label: 'Cumulative DUPR' },
            { value: '₹70,000', label: 'Prize Pool' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section 1 */}
        <Section title="1. Team Combination & Player Registration">
          <Rules
            items={[
              'Each team must consist of 8 players, with a combined cumulative DUPR rating of 30.0 or below.',
              'DUPR ratings will be strictly screened. If a player has multiple DUPR IDs, their highest rating will be considered. A player with no DUPR rating will be assigned a rating of 3.75 for team calculation.',
              'The DUPR rating recorded as of 1 October 2026 will be used for all players.',
              'All players must be pre-registered. Until a player is registered to a team, that player remains available for registration by other teams.',
              'Final team lists will be shared one day before the tournament.',
              'If a player becomes unavailable, the team owner is responsible for finding a replacement who keeps the team within the permitted cumulative DUPR limit.',
            ]}
          />
        </Section>

        {/* Section 2 */}
        <Section title="2. Game Format & Point System">
          <Rules
            items={[
              'Each tie consists of 4 matches. All four matches are in the Open Doubles category.',
              'The first three matches are worth 2 points each.',
              'The fourth match is the 3-Pointer Game, worth 3 points. A tie has a total of 9 team points available.',
            ]}
          />

          <div className="mt-5">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
              3-Pointer Game: Player Rotation Rules
            </p>
            <Rules
              items={[
                'The fourth match of each tie will begin with Players 7 and 8 from each team.',
                'The match is played to a total of 21 rally points.',
                'Players 7 and 8 will play until either team reaches 10 points, regardless of which team reaches the 10-point mark first.',
                'At that point, Players 7 and 8 will be replaced by Players 1 and 2, who will play the next 4 rally points.',
                'After every 4 rally points, players will rotate in the same manner, moving to the next designated pair of players.',
                'Rotation continues until one team reaches 21 points. That team wins the 3-Pointer Game and earns 3 team points.',
              ]}
            />
          </div>

          <div className="mt-5 bg-gray-50 rounded-xl px-5 py-4 text-sm font-semibold text-gray-700 text-center tracking-wide">
            MATCH POINTS: 2 + 2 + 2 + 3 = 9 POINTS PER TIE
          </div>
        </Section>

        {/* Section 4 */}
        <Section title="4. Tournament Format">

          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">Group Stage</p>
          <Rules
            items={[
              'Each group will consist of 4 teams playing in a round-robin format.',
              'The team finishing 1st in each group qualifies directly for the semi-finals.',
              'Teams finishing 2nd and 3rd in each group advance to the pre-semi-finals and play a team from the other group. Teams finishing 4th are eliminated.',
            ]}
          />

          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mt-6 mb-3">
            Pre-Semi-Final Fixtures
          </p>
          <FixtureTable
            rows={[
              { fixture: 'Pre-Semi 1', matchup: 'A2 vs B3' },
              { fixture: 'Pre-Semi 2', matchup: 'A3 vs B2' },
            ]}
          />

          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mt-6 mb-3">
            Standings & Tie-Breakers
          </p>
          <Rules
            items={[
              'The first ranking criterion is the number of ties won.',
              'If two teams are tied on ties won, their total team points will be considered.',
              'If teams remain tied on total team points, the points scored within their games will be considered.',
            ]}
          />

          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mt-6 mb-3">
            Semi-Final Fixtures
          </p>
          <p className="text-sm text-gray-500 mb-3">
            To preserve the group winners&apos; direct qualification, the fixtures are listed as follows:
          </p>
          <FixtureTable
            rows={[
              { fixture: 'Semi-Final 1', matchup: 'A1 vs Winner of Pre-Semi 2' },
              { fixture: 'Semi-Final 2', matchup: 'B1 vs Winner of Pre-Semi 1' },
            ]}
          />

          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mt-6 mb-2">Final</p>
          <p className="text-sm text-gray-600">
            The winners of Semi-Final 1 and Semi-Final 2 will play each other in the Final.
          </p>
        </Section>

        {/* Footer CTA */}
        <div className="mt-10 bg-black text-white rounded-xl px-6 py-5 text-center text-sm font-semibold tracking-widest uppercase">
          Pick your players. Create your strategy. Take the prize.
        </div>

      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Rules({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-gray-600">
          <span className="font-semibold text-gray-900 shrink-0">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function FixtureTable({ rows }: { rows: { fixture: string; matchup: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100">
      <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <span>Fixture</span>
        <span>Match-up</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-2 px-4 py-3 text-sm border-t border-gray-100"
        >
          <span className="text-gray-500">{row.fixture}</span>
          <span className="font-semibold">{row.matchup}</span>
        </div>
      ))}
    </div>
  )
}
