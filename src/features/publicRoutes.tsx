// S3 public routes, wired into App.tsx by S0.
// New v2 paths are always on. Old paths switch to the v2 pages (and the Teams/Shuffle nav tabs go)
// only with VITE_V2_PUBLIC=true, so the v1 pages keep working until S0 flips the flag.
import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import CompetitionsPage from './competitions/CompetitionsPage'
import CompetitionPage from './competitions/CompetitionPage'
import { RedirectToCurrent, RedirectToGroup } from './competitions/Redirects'
import GroupPage from './groups/GroupPage'
import CalendarPage from './calendar/CalendarPage'
import RankingPage from './ranking/RankingPage'
import HomePage from './home/HomePage'
import PlayersPage from './players/PlayersPage'
import PlayerPage from './players/PlayerPage'

import { V2_FORMAT_REDIRECTS, V2_PUBLIC } from './v2flag'
export { V2_FORMAT_REDIRECTS, V2_PUBLIC }

/** Pick the v2 page when the flag is on, else the old one. */
export function v2Or(v1: ReactNode, v2: ReactNode): ReactNode {
  return V2_PUBLIC ? v2 : v1
}

/** Same, for /teams and /shuffle, behind their own flag. */
export function v2FormatOr(v1: ReactNode, v2: ReactNode): ReactNode {
  return V2_FORMAT_REDIRECTS ? v2 : v1
}

export const v2PublicElements = {
  home: <HomePage />,
  tournaments: <CompetitionsPage />,
  tournament: <RedirectToGroup />,
  players: <PlayersPage />,
  player: <PlayerPage />,
  calendar: <CalendarPage />,
  teams: <RedirectToCurrent format="teams" />,
  shuffle: <RedirectToCurrent format="shuffle" />,
}

export const v2PublicRoutes = (
  <>
    <Route path="/competitions" element={<Layout><CompetitionsPage /></Layout>} />
    <Route path="/competitions/:id" element={<Layout><CompetitionPage /></Layout>} />
    <Route path="/groups/:id" element={<Layout><GroupPage /></Layout>} />
    <Route path="/ranking" element={<Layout><RankingPage /></Layout>} />
  </>
)
