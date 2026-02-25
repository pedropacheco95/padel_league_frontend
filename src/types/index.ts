export interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
  playerId: number | null
}

export interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
  playerId: number | null
}

export interface News {
  id: number
  title: string
  author: string | null
  coverImageUrl: string | null
  latest: boolean
  text?: string
}

export interface MatchLine {
  id: number
  home: { player1: string; player2: string; result: number | null }
  away: { player1: string; player2: string; result: number | null }
}

export interface PlayerShort {
  id: number | null
  name: string
  fullName: string
  pictureUrl: string | null
  rankingPoints: number
}

export interface Match {
  id: number
  dateHour: string | null
  gamesHomeTeam: number | null
  gamesAwayTeam: number | null
  winner: number | null
  matchweek: number
  field: string | null
  played: boolean
  divisionId: number
  homePlayers: [PlayerShort, PlayerShort]
  awayPlayers: [PlayerShort, PlayerShort]
}

export interface Division {
  id: number
  name: string
  rating: number | null
  hasEnded: boolean
  openDivision: boolean
  logoImageUrl: string | null
  largePictureUrl: string | null
  editionId: number
  editionName: string | null
  editionShortDateString: string | null
  beginningDatetime: string | null
  endDate: string | null
  lastPlayedMatches?: MatchLine[]
}

export interface Edition {
  id: number
  name: string
  fullName: string
  shortDateString: string
  hasEnded: boolean
  leagueId: number
  leagueName: string | null
  divisions: (Division & { lastPlayedMatches: MatchLine[] })[]
}

export interface Sponsor {
  id: number
  name: string
  url: string
  imageUrl: string | null
}

export interface IndexData {
  latestNews: News | null
  allNews: News[]
  lastEdition: Edition | null
  tournaments: Division[]
  sponsors: Sponsor[]
}

export interface StandingsRow {
  position: number
  player: PlayerShort
  points: number
  wins: number
  draws: number
  losts: number
  appearances: number
}

export interface TournamentsData {
  active: Division[]
  ended: Division[]
}

export interface TournamentDetail {
  division: Division & { tournamentName: string }
  standings: StandingsRow[]
  matches: Match[]
  allMatches: Match[]
  players: PlayerShort[]
}