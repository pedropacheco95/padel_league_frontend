import { describe, expect, it } from 'vitest'
import {
  BALL_R, COURT, CPU_Y, HIT_SPEEDUP, MAX_DT, MAX_SPEED, PADDLE, PLAYER_Y, SERVE_DELAY, SERVE_SPEED, TARGET_POINTS,
  createGame, startGame, step, type Game, type Input,
} from './pong'

const still: Input = { pointerX: null, left: false, right: false }
const centre = () => createGame(() => 0.5) // the random angle is then exactly vertical

/** A rally with the ball just above the player's paddle, falling straight down at `speed`. */
function aboutToHit(speed: number, gap = 2): Game {
  const g = centre()
  startGame(g)
  g.me.x = COURT.w / 2
  g.ball.x = COURT.w / 2
  g.ball.y = PLAYER_Y - PADDLE.h / 2 - BALL_R - gap
  g.ball.speed = speed
  g.ball.vx = 0
  g.ball.vy = speed
  return g
}

describe('padel pong rules', () => {
  it('serves at SERVE_SPEED so the first exchange stays easy', () => {
    const g = centre()
    startGame(g)
    expect(g.phase).toBe('rally')
    expect(Math.hypot(g.ball.vx, g.ball.vy)).toBeCloseTo(SERVE_SPEED, 6)
  })

  it('every paddle hit multiplies the speed by HIT_SPEEDUP and sends the ball back', () => {
    const g = aboutToHit(SERVE_SPEED)
    const event = step(g, 1 / 60, still)
    expect(event).toEqual({ type: 'hit', speed: SERVE_SPEED * HIT_SPEEDUP })
    expect(g.ball.vy).toBeLessThan(0)
    expect(Math.hypot(g.ball.vx, g.ball.vy)).toBeCloseTo(SERVE_SPEED * HIT_SPEEDUP, 6)
    // the acceleration has to be felt: a ten-hit rally more than doubles the speed
    expect(SERVE_SPEED * HIT_SPEEDUP ** 10).toBeGreaterThan(2 * SERVE_SPEED)
  })

  it('never goes faster than MAX_SPEED', () => {
    const g = aboutToHit(MAX_SPEED / HIT_SPEEDUP + 1)
    const event = step(g, 1 / 60, still)
    expect(event).toEqual({ type: 'hit', speed: MAX_SPEED })
  })

  it('at MAX_SPEED on the slowest allowed frame the ball still cannot pass through a paddle', () => {
    // in one capped frame the ball travels MAX_SPEED * MAX_DT units, several paddle heights
    expect(MAX_SPEED * MAX_DT).toBeGreaterThan(3 * PADDLE.h)
    const g = aboutToHit(MAX_SPEED, 1)
    const event = step(g, 0.5, still) // a frame far longer than MAX_DT is capped to MAX_DT
    expect(event?.type).toBe('hit')
    expect(g.ball.vy).toBeLessThan(0)
    expect(g.ball.y).toBeLessThan(PLAYER_Y)
    expect(g.score).toEqual({ me: 0, cpu: 0 })
  })

  it('the machine too: a fast ball straight at its paddle is returned, not tunnelled', () => {
    const g = centre()
    startGame(g)
    g.cpu.x = g.ball.x = COURT.w / 2
    g.ball.y = CPU_Y + PADDLE.h / 2 + BALL_R + 1
    g.ball.speed = MAX_SPEED
    g.ball.vx = 0
    g.ball.vy = -MAX_SPEED
    expect(step(g, MAX_DT, still)?.type).toBe('hit')
    expect(g.ball.vy).toBeGreaterThan(0)
  })

  it('a ball past the bottom line is a point for the machine, then the serve waits SERVE_DELAY', () => {
    const g = centre()
    startGame(g)
    g.me.x = 40 // paddle far left, ball dropping on the right
    g.ball.x = COURT.w - 40
    g.ball.y = COURT.h // on the baseline; the next frame takes it past the court
    g.ball.vx = 0
    g.ball.vy = SERVE_SPEED
    expect(step(g, 1 / 30, still)).toEqual({ type: 'point', by: 'cpu' })
    expect(g.score).toEqual({ me: 0, cpu: 1 })
    expect(g.phase).toBe('serving')
    let waited = 0
    while (g.phase === 'serving') {
      step(g, 1 / 60, still)
      waited += 1 / 60
    }
    expect(waited).toBeGreaterThanOrEqual(SERVE_DELAY - 1 / 60)
    expect(g.phase).toBe('rally')
    expect(g.ball.speed).toBe(SERVE_SPEED) // the speed-up does not carry over to the next point
    expect(g.ball.vy).toBeGreaterThan(0) // served towards the player, who lost the point
  })

  it(`first to ${TARGET_POINTS} wins and startGame resets the match`, () => {
    const g = centre()
    startGame(g)
    const loseOne = () => {
      g.phase = 'rally'
      g.me.x = 40
      g.ball.x = COURT.w - 40
      g.ball.y = COURT.h
      g.ball.vx = 0
      g.ball.vy = SERVE_SPEED
      return step(g, 1 / 30, still)
    }
    for (let i = 1; i < TARGET_POINTS; i++) expect(loseOne()).toEqual({ type: 'point', by: 'cpu' })
    expect(loseOne()).toEqual({ type: 'over', winner: 'cpu' })
    expect(g.phase).toBe('over')
    expect(step(g, 1 / 60, still)).toBeNull() // nothing moves once it is over
    startGame(g)
    expect(g.score).toEqual({ me: 0, cpu: 0 })
    expect(g.winner).toBeNull()
    expect(g.phase).toBe('rally')
  })

  it('the player paddle follows a finger and the arrow keys, inside the glass walls', () => {
    const g = centre()
    startGame(g)
    for (let i = 0; i < 60; i++) step(g, 1 / 60, { pointerX: 10_000, left: false, right: false })
    expect(g.me.x).toBeCloseTo(COURT.w - 10 - PADDLE.w / 2, 6)
    for (let i = 0; i < 120; i++) step(g, 1 / 60, { pointerX: null, left: true, right: false })
    expect(g.me.x).toBeCloseTo(10 + PADDLE.w / 2, 6)
  })
})
