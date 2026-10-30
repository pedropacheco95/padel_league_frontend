// Padel pong for the 404 page: the rules and the simulation, with no DOM in sight so
// vitest can drive it. The court is portrait (the player's paddle at the bottom, the
// machine's at the top), the side walls are glass (the ball bounces off them) and the
// net is only a line. A point is won when the ball leaves the court behind a paddle.

export const COURT = { w: 340, h: 540 } // logical units; the canvas scales them
export const WALL = 10 // glass wall thickness on each side
export const PADDLE = { w: 64, h: 10 }
export const BALL_R = 7
export const TARGET_POINTS = 3 // first to 3 ("melhor de 5")

// Speeds in court units per second. SERVE_SPEED keeps the first exchange easy; every
// paddle hit multiplies the speed by HIT_SPEEDUP so the acceleration is clearly felt
// (Pedro, 2026-10-30), up to MAX_SPEED, where the ball crosses the court in about a
// third of a second. Simulation moves the ball at most MAX_STEP units per sub-step,
// well under the paddle height, so a fast ball can never pass through a paddle
// between two frames.
export const SERVE_SPEED = 270
export const HIT_SPEEDUP = 1.09
export const MAX_SPEED = 1500
export const MAX_STEP = 6
export const MAX_DT = 1 / 30 // a frame longer than this is simulated as this long
export const PLAYER_SPEED = 420 // keyboard
export const CPU_SPEED = 200 // the machine's cap: it loses to a fast, angled ball
export const SERVE_DELAY = 1 // seconds between a point and the next serve
export const PLAYER_Y = COURT.h - 34
export const CPU_Y = 24
const MAX_ANGLE = 1.0 // radians off the vertical when the ball hits a paddle edge

export type Side = 'me' | 'cpu'
export type Phase = 'idle' | 'serving' | 'rally' | 'over'
export type Event = { type: 'hit'; speed: number } | { type: 'point'; by: Side } | { type: 'over'; winner: Side } | null

export interface Input {
  pointerX: number | null // finger or mouse x in court units, when pressed
  left: boolean
  right: boolean
}

export interface Game {
  phase: Phase
  me: { x: number }
  cpu: { x: number }
  ball: { x: number; y: number; vx: number; vy: number; speed: number }
  score: Record<Side, number>
  serveIn: number
  serveTowards: Side
  winner: Side | null
  random: () => number
}

export function createGame(random: () => number = Math.random): Game {
  return {
    phase: 'idle',
    me: { x: COURT.w / 2 },
    cpu: { x: COURT.w / 2 },
    ball: { x: COURT.w / 2, y: COURT.h / 2, vx: 0, vy: 0, speed: 0 },
    score: { me: 0, cpu: 0 },
    serveIn: 0,
    serveTowards: 'me',
    winner: null,
    random,
  }
}

export function startGame(g: Game): void {
  g.score = { me: 0, cpu: 0 }
  g.winner = null
  g.me.x = g.cpu.x = COURT.w / 2
  serve(g, 'me')
}

export function serve(g: Game, towards: Side): void {
  const angle = g.random() * 0.8 - 0.4
  g.ball.x = COURT.w / 2
  g.ball.y = COURT.h / 2
  g.ball.speed = SERVE_SPEED
  g.ball.vx = Math.sin(angle) * SERVE_SPEED
  g.ball.vy = Math.cos(angle) * SERVE_SPEED * (towards === 'me' ? 1 : -1)
  g.phase = 'rally'
}

const clampPaddle = (x: number) => Math.max(WALL + PADDLE.w / 2, Math.min(COURT.w - WALL - PADDLE.w / 2, x))

/** Advance the game by dt seconds. Mutates g; returns the one event that happened, if any. */
export function step(g: Game, dt: number, input: Input): Event {
  if (g.phase === 'idle' || g.phase === 'over') return null
  dt = Math.min(MAX_DT, Math.max(0, dt))

  // the player's paddle: a finger wins over the keyboard
  if (input.pointerX !== null) g.me.x += (clampPaddle(input.pointerX) - g.me.x) * Math.min(1, dt * 18)
  else if (input.left !== input.right) g.me.x = clampPaddle(g.me.x + (input.right ? 1 : -1) * PLAYER_SPEED * dt)

  // the machine follows the ball while it comes, and drifts back to the middle otherwise
  const chase = g.ball.vy < 0 ? g.ball.x : COURT.w / 2
  const reach = CPU_SPEED * dt
  g.cpu.x = clampPaddle(g.cpu.x + Math.max(-reach, Math.min(reach, chase - g.cpu.x)))

  if (g.phase === 'serving') {
    g.serveIn -= dt
    if (g.serveIn <= 0) serve(g, g.serveTowards)
    return null
  }

  // move the ball in sub-steps short enough that it cannot skip a paddle
  const distance = g.ball.speed * dt
  const parts = Math.max(1, Math.ceil(distance / MAX_STEP))
  let event: Event = null
  for (let i = 0; i < parts && !event; i++) {
    const b = g.ball
    b.x += (b.vx * dt) / parts
    b.y += (b.vy * dt) / parts

    if (b.x - BALL_R < WALL) {
      b.x = WALL + BALL_R
      b.vx = Math.abs(b.vx)
    } else if (b.x + BALL_R > COURT.w - WALL) {
      b.x = COURT.w - WALL - BALL_R
      b.vx = -Math.abs(b.vx)
    }

    event = hit(g, g.me.x, PLAYER_Y, 1) ?? hit(g, g.cpu.x, CPU_Y, -1)
    if (event) break
    if (b.y - BALL_R > COURT.h) event = point(g, 'cpu')
    else if (b.y + BALL_R < 0) event = point(g, 'me')
  }
  return event
}

// dir 1 is the bottom paddle (the ball must be moving down to hit it), -1 the top one.
function hit(g: Game, px: number, py: number, dir: 1 | -1): Event {
  const b = g.ball
  if (dir === 1 ? b.vy <= 0 : b.vy >= 0) return null
  const top = py - PADDLE.h / 2
  const bottom = py + PADDLE.h / 2
  const edge = dir === 1 ? b.y + BALL_R : b.y - BALL_R
  if (edge < top || edge > bottom) return null
  if (Math.abs(b.x - px) > PADDLE.w / 2 + BALL_R) return null

  const off = Math.max(-1, Math.min(1, (b.x - px) / (PADDLE.w / 2))) // where on the paddle
  b.speed = Math.min(MAX_SPEED, b.speed * HIT_SPEEDUP)
  const angle = off * MAX_ANGLE
  b.vx = Math.sin(angle) * b.speed
  b.vy = -dir * Math.cos(angle) * b.speed
  b.y = dir === 1 ? top - BALL_R : bottom + BALL_R
  return { type: 'hit', speed: b.speed }
}

function point(g: Game, by: Side): Event {
  g.score[by] += 1
  g.ball.vx = g.ball.vy = 0
  g.ball.x = COURT.w / 2
  g.ball.y = COURT.h / 2
  if (g.score[by] >= TARGET_POINTS) {
    g.phase = 'over'
    g.winner = by
    return { type: 'over', winner: by }
  }
  g.phase = 'serving'
  g.serveIn = SERVE_DELAY
  g.serveTowards = by === 'me' ? 'cpu' : 'me' // the one who lost the point receives
  return { type: 'point', by }
}
