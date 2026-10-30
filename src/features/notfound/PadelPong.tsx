// The 404 page's game: a portrait padel court on a canvas, the player's paddle at the
// bottom (finger drag or ← →), the machine's at the top. The rules live in pong.ts;
// this file only reads input, runs the frame loop and paints.
import { useEffect, useRef, useState } from 'react'
import { BALL_R, COURT, CPU_Y, PADDLE, PLAYER_Y, TARGET_POINTS, WALL, createGame, startGame, step, type Game, type Input, type Phase } from './pong'

const TEAL = '#006A71' // $color-primary
const GLASS = 'rgba(154,203,208,.28)' // $color-secondary, see-through: the glass walls
const LINE = '#FFFFFF'
const BALL = '#FFD93D' // $color-accent-2
const DARK = '#281e1e' // $color-dark
const FONT = "'Gemunu Libre', sans-serif"

const IDLE_INPUT: Input = { pointerX: null, left: false, right: false }

export default function PadelPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useRef<Game>(createGame())
  const input = useRef<Input>({ ...IDLE_INPUT })
  const flash = useRef<{ text: string; until: number } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState({ me: 0, cpu: 0 })
  const [winner, setWinner] = useState<'me' | 'cpu' | null>(null)
  const [hint, setHint] = useState(`Primeiro a ${TARGET_POINTS} ganha`)

  function begin() {
    const g = game.current
    startGame(g)
    flash.current = null
    setScore({ me: 0, cpu: 0 })
    setWinner(null)
    setHint(`Primeiro a ${TARGET_POINTS} ganha`)
    setPhase(g.phase)
  }

  // frame loop: simulate with the real elapsed time (capped inside step) and paint
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') // null in jsdom; then nothing is painted
    let frame = 0
    let last = performance.now()

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      ctx?.setTransform(canvas.width / COURT.w, 0, 0, canvas.height / COURT.h, 0, 0)
    }
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(canvas)

    const loop = (now: number) => {
      const g = game.current
      const dt = (now - last) / 1000
      last = now
      const event = step(g, dt, input.current)
      if (event?.type === 'point' || event?.type === 'over') {
        setScore({ ...g.score })
        const text = event.type === 'over' ? (event.winner === 'me' ? 'Jogo!' : 'Bola fora…') : event.by === 'me' ? 'Ponto!' : 'Bola fora!'
        flash.current = { text, until: now + 900 }
        setHint(text)
        if (event.type === 'over') {
          setWinner(event.winner)
          setPhase('over')
        }
      }
      if (ctx) paint(ctx, g, flash.current && now < flash.current.until ? flash.current.text : null)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') input.current.left = down
      else if (e.key === 'ArrowRight') input.current.right = down
      else return
      if (game.current.phase === 'rally' || game.current.phase === 'serving') e.preventDefault()
    }
    const keyDown = onKey(true)
    const keyUp = onKey(false)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [])

  const courtX = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return ((clientX - rect.left) / rect.width) * COURT.w
  }
  const press = (e: React.PointerEvent<HTMLCanvasElement>) => {
    input.current.pointerX = courtX(e.clientX)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (input.current.pointerX !== null) input.current.pointerX = courtX(e.clientX)
  }
  const release = () => {
    input.current.pointerX = null
  }

  const playing = phase === 'rally' || phase === 'serving'
  return (
    <section className="overflow-hidden rounded-[8px] bg-white shadow-[0_0_6px_1px_rgba(0,0,0,0.1)]" aria-label="Pong de padel" style={{ fontFamily: FONT }}>
      <div className="relative w-full" style={{ aspectRatio: `${COURT.w} / ${COURT.h}` }}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full select-none"
          style={{ touchAction: 'none', cursor: 'ew-resize' }}
          role="img"
          aria-label="Court de padel visto de cima; arrasta para mover a raquete de baixo e devolver a bola"
          onPointerDown={press}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
        />
        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[8px] px-[20px] text-center text-white" style={{ background: 'rgba(0,60,66,.78)' }}>
            <p className="m-0 text-[36px] font-extrabold leading-none">
              {phase === 'idle' ? 'Toca para jogar' : winner === 'me' ? 'Ponto, set e jogo!' : 'Bola fora…'}
            </p>
            <p className="m-0 max-w-[260px] text-[16px] opacity-90">
              {phase === 'idle'
                ? 'Arrasta para mover a raquete, ou usa as setas. A bola acelera a cada pancada.'
                : winner === 'me'
                  ? `Ganhaste ${score.me}–${score.cpu}. A página continua perdida, mas tu não.`
                  : `Perdeste ${score.me}–${score.cpu}. A parede de vidro não perdoa.`}
            </p>
            <button
              type="button"
              onClick={begin}
              className="mt-[4px] inline-flex min-h-[44px] items-center justify-center rounded-full px-[22px] text-[16px] font-bold uppercase tracking-[0.05em]"
              style={{ background: BALL, color: '#0E3335' }}
            >
              {phase === 'idle' ? 'Servir' : 'Jogar outra vez'}
            </button>
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between px-[14px] py-[10px] text-[13px] uppercase tracking-[0.1em]" style={{ color: '#6b7280' }}>
        <span>
          Tu <b className="ml-[4px] text-[24px] tracking-normal" style={{ color: DARK }}>{score.me}</b>
        </span>
        <span aria-live="polite">{hint}</span>
        <span>
          <b className="mr-[4px] text-[24px] tracking-normal" style={{ color: DARK }}>{score.cpu}</b> Máquina
        </span>
      </div>
    </section>
  )
}

function paint(ctx: CanvasRenderingContext2D, g: Game, flashText: string | null) {
  const { w, h } = COURT
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = TEAL
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = GLASS
  ctx.fillRect(0, 0, WALL, h)
  ctx.fillRect(w - WALL, 0, WALL, h)

  // the lines of a real court: outline, service lines, centre service line, the net
  const inset = WALL + 8
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.strokeRect(inset, 12, w - 2 * inset, h - 24)
  ctx.beginPath()
  ctx.moveTo(inset, h * 0.28)
  ctx.lineTo(w - inset, h * 0.28)
  ctx.moveTo(inset, h * 0.72)
  ctx.lineTo(w - inset, h * 0.72)
  ctx.moveTo(w / 2, h * 0.28)
  ctx.lineTo(w / 2, h * 0.72)
  ctx.stroke()
  ctx.setLineDash([8, 6])
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(inset, h / 2)
  ctx.lineTo(w - inset, h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(255,255,255,.14)'
  ctx.font = `800 96px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('404', w / 2, h / 2 + 6)

  ctx.fillStyle = LINE
  paddle(ctx, g.me.x, PLAYER_Y)
  paddle(ctx, g.cpu.x, CPU_Y)

  ctx.fillStyle = BALL
  ctx.beginPath()
  ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2)
  ctx.fill()

  if (flashText) {
    ctx.fillStyle = 'rgba(255,255,255,.92)'
    ctx.font = `800 40px ${FONT}`
    ctx.fillText(flashText, w / 2, h / 2 - 60)
  }
}

function paddle(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const x = cx - PADDLE.w / 2
  const y = cy - PADDLE.h / 2
  const r = 5
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + PADDLE.w, y, x + PADDLE.w, y + PADDLE.h, r)
  ctx.arcTo(x + PADDLE.w, y + PADDLE.h, x, y + PADDLE.h, r)
  ctx.arcTo(x, y + PADDLE.h, x, y, r)
  ctx.arcTo(x, y, x + PADDLE.w, y, r)
  ctx.closePath()
  ctx.fill()
}
