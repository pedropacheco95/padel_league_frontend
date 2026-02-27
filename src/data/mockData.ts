import { IndexData, TournamentsData, TournamentDetail, PlayerRanking, PlayerDetail, ForEditData, User } from '../types'
import { ShuffleTournamentDetail } from '@/types/tournament'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'
export const MOCK_LOGGED_IN = import.meta.env.VITE_MOCK_LOGGED_IN === 'true'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const MOCK_TOKEN = 'mock-admin-token'

export const mockUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@padelleague.pt',
  isAdmin: true,
  playerId: 7,
}

/** Simulates network latency so loading states are testable */
export function mockResponse<T>(data: T): Promise<{ data: T }> {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), 250))
}

// ---------------------------------------------------------------------------
// /api/v1/main/index
// ---------------------------------------------------------------------------

export const mockIndexData: IndexData = {
  latestNews: {
    id: 11,
    title: 'Parceria Histórica – Porto Padel League e Quinta da Sardinha de Cima',
    author: 'Direção da Porto Padel League',
    coverImageUrl:
      'https://storage.googleapis.com/portopadelleague-storage/images/News/parceriahistorica-portopadelleagueequintadasardinhadecima_11.jpg',
    latest: true,
    text: '<h1>Um marco na história da Porto Padel League</h1><p class="highlight">É com profundo orgulho e sentido de ocasião que anunciamos a primeira parceria oficial da nossa liga!</p>',
  },
  allNews: [
    {
      id: 13,
      title: 'Porto Padel League - Novo Site e Loja Oficial',
      author: 'Direção Porto Padel League',
      coverImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/News/portopadelleague-novositeoficial_13.jpg',
      latest: false,
    },
    {
      id: 12,
      title:
        'Porto Padel League regressa em grande para a sua 16.ª Edição — com 5 Divisões e prémios inéditos',
      author: 'Carlos GPT',
      coverImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/News/portopadelleagueregressaemgrandeparaasua16.aedicao--com5divisoesepremiosineditos_12.jpg',
      latest: false,
    },
    {
      id: 10,
      title: 'A Incrível Ressurreição de João Archer: Quando as Lendas do Padel Se Criam',
      author: 'Carlos GPT',
      coverImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/News/aincrivelressurreicaodejoaoarcher:quandoaslendasdopadelsecriam_10.jpg',
      latest: false,
    },
  ],
  sponsors: [
    {
      id: 2,
      name: 'Quinta da Sardinha de Cima',
      url: '/sponsors/sponsor_click/2',
      imageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Sponsor/20250423172512_image.png',
    },
  ],
  tournaments: [
    {
      id: 51,
      name: 'Outono 2025 - 1ª Divisão',
      rating: 2000,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
    },
    {
      id: 52,
      name: 'Outono 2025 - 2ª Divisão',
      rating: 1000,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-2adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-2adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
    },
    {
      id: 53,
      name: 'Outono 2025 - 3ª Divisão',
      rating: 500,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-3adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-3adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
    },
    {
      id: 54,
      name: 'Outono 2025 - 4ª Divisão',
      rating: 250,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-4adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-4adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
    },
    {
      id: 55,
      name: 'Outono 2025 - 5ª Divisão',
      rating: 125,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-5adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-5adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
    },
  ],
  lastEdition: {
    id: 21,
    name: '17ª Edição Powered by QSC',
    fullName: 'Padel League: 17ª Edição Powered by QSC ',
    shortDateString: '2-14 outubro',
    hasEnded: false,
    leagueId: 1,
    leagueName: 'Padel League',
    divisions: [
      {
        id: 51,
        name: 'Outono 2025 - 1ª Divisão',
        rating: 2000,
        hasEnded: false,
        openDivision: false,
        logoImageUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png',
        largePictureUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png.png',
        editionId: 21,
        editionName: '17ª Edição Powered by QSC',
        editionShortDateString: '2-14 outubro',
        beginningDatetime: '2025-09-02T00:00:00',
        endDate: '2025-10-14',
        lastPlayedMatches: [
          { id: 2066, home: { player1: 'Cuca', player2: 'Pancho', result: 9 }, away: { player1: 'Carlo', player2: 'Bernardo C', result: 3 } },
          { id: 2067, home: { player1: 'Malafaya', player2: 'Substituto', result: 7 }, away: { player1: 'Dinis', player2: 'Fred', result: 8 } },
          { id: 2069, home: { player1: 'Bernardo C', player2: 'Carlo', result: 8 }, away: { player1: 'Dinis', player2: 'Fred', result: 6 } },
          { id: 2070, home: { player1: 'Cuca', player2: 'Pancho', result: 9 }, away: { player1: 'Fred', player2: 'Dinis', result: 6 } },
        ],
      },
      {
        id: 52,
        name: 'Outono 2025 - 2ª Divisão',
        rating: 1000,
        hasEnded: false,
        openDivision: false,
        logoImageUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-2adivisao.png',
        largePictureUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-2adivisao.png.png',
        editionId: 21,
        editionName: '17ª Edição Powered by QSC',
        editionShortDateString: '2-14 outubro',
        beginningDatetime: '2025-09-02T00:00:00',
        endDate: '2025-10-14',
        lastPlayedMatches: [
          { id: 2112, home: { player1: 'Diogo', player2: 'Joao Archer', result: 6 }, away: { player1: 'Talinho', player2: 'Damásio', result: 5 } },
          { id: 2110, home: { player1: 'Diogo', player2: 'Joao Archer', result: 3 }, away: { player1: 'Afonso', player2: 'Joao perneta', result: 8 } },
          { id: 2108, home: { player1: 'Diogo', player2: 'Joao Archer', result: 3 }, away: { player1: 'Gonçalo PA', player2: 'Kikos', result: 8 } },
          { id: 2113, home: { player1: 'Kikos', player2: 'Gonçalo PA', result: 3 }, away: { player1: 'Joao perneta', player2: 'Afonso', result: 9 } },
        ],
      },
      {
        id: 53,
        name: 'Outono 2025 - 3ª Divisão',
        rating: 500,
        hasEnded: false,
        openDivision: false,
        logoImageUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-3adivisao.png',
        largePictureUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-3adivisao.png.png',
        editionId: 21,
        editionName: '17ª Edição Powered by QSC',
        editionShortDateString: '2-14 outubro',
        beginningDatetime: '2025-09-02T00:00:00',
        endDate: '2025-10-14',
        lastPlayedMatches: [
          { id: 2153, home: { player1: 'Diogo Rodrigues', player2: 'Freddy', result: 7 }, away: { player1: 'Tomás', player2: 'Freitas', result: 5 } },
          { id: 2155, home: { player1: 'Diogo Rodrigues', player2: 'Freddy', result: 5 }, away: { player1: 'Pêras', player2: 'Zé Santos', result: 10 } },
          { id: 2151, home: { player1: 'Pêras', player2: 'Zé Santos', result: 7 }, away: { player1: 'Tomás', player2: 'Freitas', result: 6 } },
          { id: 2150, home: { player1: 'Trepa', player2: 'Rodas', result: 5 }, away: { player1: 'Freddy', player2: 'Diogo Rodrigues', result: 8 } },
        ],
      },
      {
        id: 54,
        name: 'Outono 2025 - 4ª Divisão',
        rating: 250,
        hasEnded: false,
        openDivision: false,
        logoImageUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-4adivisao.png',
        largePictureUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-4adivisao.png.png',
        editionId: 21,
        editionName: '17ª Edição Powered by QSC',
        editionShortDateString: '2-14 outubro',
        beginningDatetime: '2025-09-02T00:00:00',
        endDate: '2025-10-14',
        lastPlayedMatches: [
          { id: 2192, home: { player1: 'Fezas', player2: 'Fred Baptista', result: 5 }, away: { player1: 'Lopo Sottomayor', player2: 'Ricas', result: 7 } },
          { id: 2194, home: { player1: 'Fezas', player2: 'Fred Baptista', result: 4 }, away: { player1: 'Zema', player2: 'Afonso Xavier', result: 7 } },
          { id: 2195, home: { player1: 'Ricas', player2: 'Lopo Sottomayor', result: 9 }, away: { player1: 'Rafael', player2: 'Tomás ', result: 6 } },
          { id: 2196, home: { player1: 'Fezas', player2: 'Fred Baptista', result: 8 }, away: { player1: 'Tomás ', player2: 'Rafael', result: 7 } },
        ],
      },
      {
        id: 55,
        name: 'Outono 2025 - 5ª Divisão',
        rating: 125,
        hasEnded: false,
        openDivision: false,
        logoImageUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-5adivisao.png',
        largePictureUrl:
          'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-5adivisao.png.png',
        editionId: 21,
        editionName: '17ª Edição Powered by QSC',
        editionShortDateString: '2-14 outubro',
        beginningDatetime: '2025-09-02T00:00:00',
        endDate: '2025-10-14',
        lastPlayedMatches: [
          { id: 2237, home: { player1: 'Hugo', player2: 'Pedro AR Pacheco', result: 9 }, away: { player1: 'Cou', player2: 'Kiko', result: 2 } },
          { id: 2236, home: { player1: 'Martinho', player2: 'Cameira', result: 3 }, away: { player1: 'Bucas', player2: 'Luís Folhadela', result: 8 } },
          { id: 2234, home: { player1: 'Martinho', player2: 'Cameira', result: 2 }, away: { player1: 'Pedro AR Pacheco', player2: 'Hugo', result: 10 } },
          { id: 2239, home: { player1: 'Hugo', player2: 'Pedro AR Pacheco', result: 8 }, away: { player1: 'Luís Folhadela', player2: 'Bucas', result: 4 } },
        ],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// /api/v1/tournaments/
// ---------------------------------------------------------------------------

export const mockTournamentsData: TournamentsData = {
  active: mockIndexData.tournaments,
  ended: [],
}

// ---------------------------------------------------------------------------
// /api/v1/tournaments/51  (Outono 2025 - 1ª Divisão)
// Player shorthands used below
// ---------------------------------------------------------------------------

const P_PANCHO   = { id: 7,  name: 'Pancho',     fullName: 'Pedro Pacheco',        pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/pedropacheco.png',    rankingPoints: 2522 }
const P_CUCA     = { id: 21, name: 'Cuca',        fullName: 'Alfredo Magalhães ',   pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/cuca_22.png',          rankingPoints: 1153 }
const P_CARLO    = { id: 22, name: 'Carlo',       fullName: 'Carlo Parodi',         pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/carlo_23.png',          rankingPoints: 2110 }
const P_MALAFAYA = { id: 27, name: 'Malafaya',    fullName: 'Diogo Malafaya',       pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/malafaya_27.png',       rankingPoints: 5248 }
const P_BC       = { id: 28, name: 'Bernardo C',  fullName: 'Bernardo Castro ',     pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/bernardoc_28.png',      rankingPoints: 4173 }
const P_DINIS    = { id: 32, name: 'Dinis',       fullName: 'Dinis Melo',           pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/dinis_32.png',          rankingPoints: 2529 }
const P_FRED     = { id: 33, name: 'Fred',        fullName: 'Frederico Beirão',     pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/fred_33.png',           rankingPoints: 7641 }
const P_MIGUELSG = { id: 12, name: 'Miguel SG',   fullName: 'Miguel Sousa Guedes',  pictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/miguelsg_12.png',       rankingPoints: 5440 }
const P_SUB      = { id: null, name: 'Substituto', fullName: 'Jogador substituto',  pictureUrl: '/static/images/Player/default_player.jpg', rankingPoints: 0 }

const DIVISION_51_ID = 51

const allMatches51 = [
  // ── Matchweek 1 (played) ──────────────────────────────────────────────────
  { id: 2060, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 1', dateHour: '2025-09-02T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 8,  gamesAwayTeam: 7,  homePlayers: [P_CARLO,   P_SUB],     awayPlayers: [P_FRED,     P_PANCHO]  },
  { id: 2061, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 2', dateHour: '2025-09-02T00:00:00', played: true,  winner: -1, gamesHomeTeam: 4,  gamesAwayTeam: 6,  homePlayers: [P_BC,      P_CUCA],    awayPlayers: [P_DINIS,    P_MALAFAYA] },
  { id: 2062, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 1', dateHour: '2025-09-02T00:00:00', played: true,  winner: -1, gamesHomeTeam: 5,  gamesAwayTeam: 9,  homePlayers: [P_CARLO,   P_SUB],     awayPlayers: [P_CUCA,     P_BC]       },
  { id: 2063, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 1', dateHour: '2025-09-02T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 7,  gamesAwayTeam: 6,  homePlayers: [P_PANCHO,  P_FRED],    awayPlayers: [P_DINIS,    P_MALAFAYA] },
  { id: 2064, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 2', dateHour: '2025-09-02T00:00:00', played: true,  winner: -1, gamesHomeTeam: 4,  gamesAwayTeam: 11, homePlayers: [P_CARLO,   P_SUB],     awayPlayers: [P_MALAFAYA, P_DINIS]    },
  { id: 2065, divisionId: DIVISION_51_ID, matchweek: 1, field: 'Campo 1', dateHour: '2025-09-02T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 7,  gamesAwayTeam: 6,  homePlayers: [P_PANCHO,  P_FRED],    awayPlayers: [P_BC,       P_CUCA]     },
  // ── Matchweek 2 (played) ──────────────────────────────────────────────────
  { id: 2066, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 1', dateHour: '2025-09-09T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 9,  gamesAwayTeam: 3,  homePlayers: [P_CUCA,    P_PANCHO],  awayPlayers: [P_CARLO,    P_BC]       },
  { id: 2067, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 2', dateHour: '2025-09-09T00:00:00', played: true,  winner: -1, gamesHomeTeam: 7,  gamesAwayTeam: 8,  homePlayers: [P_MALAFAYA,P_SUB],     awayPlayers: [P_DINIS,    P_FRED]     },
  { id: 2068, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 1', dateHour: '2025-09-09T00:00:00', played: true,  winner: -1, gamesHomeTeam: 4,  gamesAwayTeam: 8,  homePlayers: [P_CUCA,    P_PANCHO],  awayPlayers: [P_MALAFAYA, P_SUB]      },
  { id: 2069, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 1', dateHour: '2025-09-09T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 8,  gamesAwayTeam: 6,  homePlayers: [P_BC,      P_CARLO],   awayPlayers: [P_DINIS,    P_FRED]     },
  { id: 2070, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 1', dateHour: '2025-09-09T00:00:00', played: true,  winner: 1,  gamesHomeTeam: 9,  gamesAwayTeam: 6,  homePlayers: [P_CUCA,    P_PANCHO],  awayPlayers: [P_FRED,     P_DINIS]    },
  { id: 2071, divisionId: DIVISION_51_ID, matchweek: 2, field: 'Campo 2', dateHour: '2025-09-09T00:00:00', played: true,  winner: -1, gamesHomeTeam: 5,  gamesAwayTeam: 8,  homePlayers: [P_BC,      P_CARLO],   awayPlayers: [P_MALAFAYA, P_SUB]      },
  // ── Matchweek 3 (unplayed) ────────────────────────────────────────────────
  { id: 2072, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 1', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_CUCA,    P_FRED],    awayPlayers: [P_CARLO,    P_PANCHO]  },
  { id: 2073, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 2', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_BC,      P_MALAFAYA],awayPlayers: [P_MIGUELSG, P_DINIS]   },
  { id: 2074, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 1', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_CUCA,    P_FRED],    awayPlayers: [P_MALAFAYA, P_BC]      },
  { id: 2075, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 2', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_DINIS,   P_MIGUELSG],awayPlayers: [P_PANCHO,   P_CARLO]   },
  { id: 2076, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 1', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_PANCHO,  P_CARLO],   awayPlayers: [P_FRED,     P_CUCA]    },
  { id: 2077, divisionId: DIVISION_51_ID, matchweek: 3, field: 'Campo 2', dateHour: '2025-09-16T00:00:00', played: false, winner: null, gamesHomeTeam: null, gamesAwayTeam: null, homePlayers: [P_MALAFAYA,P_BC],      awayPlayers: [P_MIGUELSG, P_DINIS]   },
]

// Played matches only (ordered by matchweek) — mirrors get_ordered_matches_played()
const playedMatches51 = allMatches51.filter((m) => m.played)

// Standings derived from mw1+mw2 results (wins×3 pts each)
// Pancho: 4W 2L = 12pts | Malafaya: 4W 2L = 12pts | Cuca: 3W 3L = 9pts
// Fred: 3W 3L = 9pts | Dinis: 3W 3L = 9pts | BC: 2W 4L = 6pts
// Carlo: 2W 4L = 6pts | Miguel SG: 0W (no games played yet) = 0pts
const standings51 = [
  { position: 1, player: P_PANCHO,   points: 12, wins: 4, draws: 0, losts: 2, appearances: 2 },
  { position: 2, player: P_MALAFAYA, points: 12, wins: 4, draws: 0, losts: 2, appearances: 2 },
  { position: 3, player: P_CUCA,     points:  9, wins: 3, draws: 0, losts: 3, appearances: 2 },
  { position: 4, player: P_FRED,     points:  9, wins: 3, draws: 0, losts: 3, appearances: 2 },
  { position: 5, player: P_DINIS,    points:  9, wins: 3, draws: 0, losts: 3, appearances: 2 },
  { position: 6, player: P_BC,       points:  6, wins: 2, draws: 0, losts: 4, appearances: 2 },
  { position: 7, player: P_CARLO,    points:  6, wins: 2, draws: 0, losts: 4, appearances: 2 },
  { position: 8, player: P_MIGUELSG, points:  0, wins: 0, draws: 0, losts: 0, appearances: 0 },
]

// ---------------------------------------------------------------------------
// /api/v1/players/ranking
// ---------------------------------------------------------------------------

export const mockPlayersRanking: PlayerRanking[] = [
  { ...P_FRED,     rankingPosition: 1 },
  { ...P_MIGUELSG, rankingPosition: 2 },
  { ...P_MALAFAYA, rankingPosition: 3 },
  { ...P_BC,       rankingPosition: 4 },
  { ...P_DINIS,    rankingPosition: 5 },
  { ...P_PANCHO,   rankingPosition: 6 },
  { ...P_CARLO,    rankingPosition: 7 },
  { ...P_CUCA,     rankingPosition: 8 },
]

// ---------------------------------------------------------------------------
// /api/v1/players/7  (Pancho — the admin mock user)
// ---------------------------------------------------------------------------

export const mockPlayerDetails: Record<number, PlayerDetail> = {
  7: {
    id: 7,
    name: 'Pancho',
    fullName: 'Pedro Pacheco',
    birthday: '1996-01-01',
    height: 1.83,
    preferedHand: 'Direita',
    preferedPosition: 'Lado direito',
    pictureUrl: P_PANCHO.pictureUrl,
    largePictureUrl: 'https://storage.googleapis.com/portopadelleague-storage/images/Player/pedropacheco_large.png',
    rankingPoints: 2522,
    rankingPosition: 6,
    username: 'admin',
    previousPlayer: { ...P_MIGUELSG, rankingPosition: 8 },
    nextPlayer:     { ...P_MALAFAYA, rankingPosition: 2 },
    matchesPlayed: 6,
    matchesWon: 4,
    matchesLost: 2,
    matchesDrawn: 0,
    efficiency: 66.67,
    tournamentsPlayed: 1,
    matchweeksPlayed: 2,
    matchweeksMissed: 5,
    matchweeksPerTournament: 2,
    attendance: 28.57,
    tournamentHistory: [
      {
        divisionId: 51,
        divisionName: 'Outono 2025 - 1ª Divisão',
        endDate: '2025-10-14',
        won: 4,
        played: 6,
        place: 1,
        rankingPoints: 120,
      },
    ],
  },
}

export const mockTournamentDetails: Record<number, TournamentDetail> = {
  51: {
    division: {
      id: 51,
      name: 'Outono 2025 - 1ª Divisão',
      rating: 2000,
      hasEnded: false,
      openDivision: false,
      logoImageUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png',
      largePictureUrl:
        'https://storage.googleapis.com/portopadelleague-storage/images/Division/outono2025-1adivisao.png.png',
      editionId: 21,
      editionName: '17ª Edição Powered by QSC',
      editionShortDateString: '2-14 outubro',
      beginningDatetime: '2025-09-02T00:00:00',
      endDate: '2025-10-14',
      tournamentName: 'Padel League: 17ª Edição Powered by QSC Outono 2025 - 1ª Divisão',
      lastPlayedMatches: mockIndexData.lastEdition!.divisions[0].lastPlayedMatches,
    },
    standings: standings51,
    matches: playedMatches51 as TournamentDetail['matches'],
    allMatches: allMatches51 as TournamentDetail['allMatches'],
    players: [P_PANCHO, P_CUCA, P_CARLO, P_MALAFAYA, P_BC, P_DINIS, P_FRED, P_MIGUELSG],
  },
}

// ---------------------------------------------------------------------------
// /api/v1/matches/for_edit  (matchweek 3 — all unplayed)
// ---------------------------------------------------------------------------

export const mockForEditData: ForEditData = {
  matches: allMatches51.filter(m => !m.played) as ForEditData['matches'],
  divisions: mockIndexData.tournaments,
}

// ---------------------------------------------------------------------------
// /api/v1/shuffle_tournament
// ---------------------------------------------------------------------------

export const mockShuffleTournamentDetail: ShuffleTournamentDetail = {
  id: 1,
  title: 'Padel Shuffle',
  currentMatchweek: 3,
  maxPlayers: 48,
  divisionMultipliers: { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2, 6: 1 },
  players: [
    { id: 'p1', position: 1, name: 'Carlos García', points: 52, wins: 5, draws: 1, losses: 0, gamesPlayed: 6, gamesWon: 53, gamesLost: 34 },
    { id: 'p2', position: 2, name: 'Miguel Torres', points: 45, wins: 4, draws: 1, losses: 1, gamesPlayed: 6, gamesWon: 48, gamesLost: 39 },
    { id: 'p3', position: 3, name: 'Pablo Ruiz', points: 42, wins: 4, draws: 0, losses: 2, gamesPlayed: 6, gamesWon: 47, gamesLost: 41 },
    { id: 'p4', position: 6, name: 'Alejandro López', points: 36, wins: 3, draws: 0, losses: 3, gamesPlayed: 6, gamesWon: 45, gamesLost: 43 },
    { id: 'p5', position: 8, name: 'Javier Martín', points: 33, wins: 3, draws: 0, losses: 3, gamesPlayed: 6, gamesWon: 43, gamesLost: 45 },
    { id: 'p6', position: 10, name: 'Daniel Sánchez', points: 29, wins: 2, draws: 1, losses: 3, gamesPlayed: 6, gamesWon: 39, gamesLost: 47 },
    { id: 'p7', position: 13, name: 'Fernando Díaz', points: 24, wins: 2, draws: 0, losses: 4, gamesPlayed: 6, gamesWon: 36, gamesLost: 49 },
    { id: 'p8', position: 14, name: 'Andrés Moreno', points: 21, wins: 2, draws: 0, losses: 4, gamesPlayed: 6, gamesWon: 35, gamesLost: 50 },
    { id: 'p9', position: 4, name: 'Diego Hernández', points: 41, wins: 4, draws: 1, losses: 1, gamesPlayed: 6, gamesWon: 50, gamesLost: 40 },
    { id: 'p10', position: 5, name: 'Rafael Jiménez', points: 38, wins: 4, draws: 0, losses: 2, gamesPlayed: 6, gamesWon: 47, gamesLost: 42 },
    { id: 'p11', position: 7, name: 'Sergio Romero', points: 34, wins: 3, draws: 1, losses: 2, gamesPlayed: 6, gamesWon: 44, gamesLost: 43 },
    { id: 'p12', position: 9, name: 'Álvaro Navarro', points: 32, wins: 3, draws: 1, losses: 2, gamesPlayed: 6, gamesWon: 42, gamesLost: 44 },
    { id: 'p13', position: 11, name: 'Iván Domínguez', points: 27, wins: 2, draws: 1, losses: 3, gamesPlayed: 6, gamesWon: 40, gamesLost: 46 },
    { id: 'p14', position: 12, name: 'Hugo Vázquez', points: 25, wins: 2, draws: 1, losses: 3, gamesPlayed: 6, gamesWon: 39, gamesLost: 47 },
    { id: 'p15', position: 15, name: 'Marcos Gil', points: 20, wins: 2, draws: 0, losses: 4, gamesPlayed: 6, gamesWon: 36, gamesLost: 50 },
    { id: 'p16', position: 16, name: 'Adrián Molina', points: 18, wins: 1, draws: 1, losses: 4, gamesPlayed: 6, gamesWon: 34, gamesLost: 52 },
  ],
  divisions: [
    { number: 1, playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'] },
    { number: 2, playerIds: ['p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16'] },
  ],
  matches: [
    { id: 'd1w2m1', matchweek: 2, division: 1, team1: ['p1', 'p8'], team2: ['p2', 'p7'], played: true, score1: 9, score2: 6 },
    { id: 'd1w2m2', matchweek: 2, division: 1, team1: ['p3', 'p6'], team2: ['p4', 'p5'], played: true, score1: 7, score2: 8 },
    { id: 'd1w2m3', matchweek: 2, division: 1, team1: ['p1', 'p8'], team2: ['p3', 'p6'], played: true, score1: 8, score2: 6 },
    { id: 'd1w2m4', matchweek: 2, division: 1, team1: ['p2', 'p7'], team2: ['p4', 'p5'], played: true, score1: 7, score2: 7 },
    { id: 'd1w2m5', matchweek: 2, division: 1, team1: ['p1', 'p8'], team2: ['p4', 'p5'], played: true, score1: 9, score2: 7 },
    { id: 'd1w2m6', matchweek: 2, division: 1, team1: ['p2', 'p7'], team2: ['p3', 'p6'], played: true, score1: 5, score2: 8 },
    { id: 'd2w2m1', matchweek: 2, division: 2, team1: ['p9', 'p16'], team2: ['p10', 'p15'], played: true, score1: 8, score2: 6 },
    { id: 'd2w2m2', matchweek: 2, division: 2, team1: ['p11', 'p14'], team2: ['p12', 'p13'], played: true, score1: 7, score2: 9 },
    { id: 'd2w2m3', matchweek: 2, division: 2, team1: ['p9', 'p16'], team2: ['p11', 'p14'], played: true, score1: 8, score2: 7 },
    { id: 'd2w2m4', matchweek: 2, division: 2, team1: ['p10', 'p15'], team2: ['p12', 'p13'], played: true, score1: 6, score2: 8 },
    { id: 'd2w2m5', matchweek: 2, division: 2, team1: ['p9', 'p16'], team2: ['p12', 'p13'], played: true, score1: 9, score2: 8 },
    { id: 'd2w2m6', matchweek: 2, division: 2, team1: ['p10', 'p15'], team2: ['p11', 'p14'], played: true, score1: 7, score2: 6 },
    { id: 'd1w3m1', matchweek: 3, division: 1, team1: ['p1', 'p8'], team2: ['p2', 'p7'], played: false },
    { id: 'd1w3m2', matchweek: 3, division: 1, team1: ['p3', 'p6'], team2: ['p4', 'p5'], played: false },
    { id: 'd1w3m3', matchweek: 3, division: 1, team1: ['p1', 'p8'], team2: ['p3', 'p6'], played: false },
    { id: 'd1w3m4', matchweek: 3, division: 1, team1: ['p2', 'p7'], team2: ['p4', 'p5'], played: false },
    { id: 'd1w3m5', matchweek: 3, division: 1, team1: ['p1', 'p8'], team2: ['p4', 'p5'], played: false },
    { id: 'd1w3m6', matchweek: 3, division: 1, team1: ['p2', 'p7'], team2: ['p3', 'p6'], played: false },
    { id: 'd2w3m1', matchweek: 3, division: 2, team1: ['p9', 'p16'], team2: ['p10', 'p15'], played: false },
    { id: 'd2w3m2', matchweek: 3, division: 2, team1: ['p11', 'p14'], team2: ['p12', 'p13'], played: false },
    { id: 'd2w3m3', matchweek: 3, division: 2, team1: ['p9', 'p16'], team2: ['p11', 'p14'], played: false },
    { id: 'd2w3m4', matchweek: 3, division: 2, team1: ['p10', 'p15'], team2: ['p12', 'p13'], played: false },
    { id: 'd2w3m5', matchweek: 3, division: 2, team1: ['p9', 'p16'], team2: ['p12', 'p13'], played: false },
    { id: 'd2w3m6', matchweek: 3, division: 2, team1: ['p10', 'p15'], team2: ['p11', 'p14'], played: false },
  ],
}
