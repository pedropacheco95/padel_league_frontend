// Types generated from the backend contract (docs/v2/api/openapi.yaml).
// Regenerate: SPEC=<path to openapi.yaml> npm run gen:api   (owner: S0)
import type { components, paths } from './schema'

export type { components, paths }
export type Schemas = components['schemas']

export type CompetitionCard = Schemas['CompetitionCard']
export type Competition = Schemas['Competition']
export type Season = Schemas['Season']
export type Stage = Schemas['Stage']
export type GroupSummary = Schemas['GroupSummary']
export type GroupDetail = Schemas['GroupDetail']
export type StandingRow = Schemas['StandingRow']
export type Match = Schemas['Match']
export type MatchSet = Schemas['MatchSet']
export type Participant = Schemas['Participant']
export type ResultInput = Schemas['ResultInput']
export type Absence = Schemas['Absence']
export type PlayerRef = Schemas['PlayerRef']
export type PlayerSummary = Schemas['PlayerSummary']
export type PlayerDetail = Schemas['PlayerDetail']
export type PlayerComparison = Schemas['PlayerComparison']
export type Ranking = Schemas['Ranking']
export type RankingExplanation = Schemas['RankingExplanation']
export type TeamsState = Schemas['TeamsState']
export type Format = Schemas['Format']
export type CompetitionStatus = Schemas['CompetitionStatus']
export type ApiError = Schemas['Error']
export type PasswordCode = Schemas['PasswordCode']

// The v2 API lives beside v1 on the same host.
export const API_V2_BASE = '/api/v2'
