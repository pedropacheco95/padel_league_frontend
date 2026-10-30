// "‹ label ▾ ›" selector (design brief direction C): the arrows step one at a time, tapping the label
// opens a bottom sheet with every option. Variants: `header` (white pill on the teal hero, mini-torneio),
// `subheader` (sticky division bar with the neighbours peeking and dots), `pill` (floating jornada pill
// at the bottom of the screen) and `chip` (the collapsed "MT1 ▾" chip in the compact title bar).
// With a single option nothing renders: a competition with 1 mini-torneio or 1 division hides the control.
import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useInputFocused } from '@/hooks/useInputFocused'

export type StepperOption = {
  key: number
  label: string
  /** Short text at the right of the option in the sheet ("a decorrer", "03/11"). */
  hint?: ReactNode
  /** The signed-in player's own entry ("a tua"). */
  mine?: boolean
  /** The current one ("atual"). */
  current?: boolean
}

export type StepperVariant = 'header' | 'subheader' | 'pill' | 'chip'

const TEAL = '#006A71'
const INK = '#141a28'
const PILL = '#1a1f2e'
const TEAL_LIGHT = '#e3f1f2'

const tag = (text: string, dark?: boolean) => (
  <span
    className="ml-[6px] inline-block rounded-full px-[7px] py-[1px] align-[3px] text-[11px] font-semibold uppercase tracking-[0.04em]"
    style={dark ? { background: 'rgba(255,255,255,.16)', color: '#7fd3d8' } : { background: TEAL_LIGHT, color: TEAL }}
  >
    {text}
  </span>
)

export default function StepperSelect({
  options,
  value,
  onChange,
  variant,
  title,
  chipLabel,
  nudgeKey,
}: {
  options: StepperOption[]
  value: number | null
  onChange: (key: number) => void
  variant: StepperVariant
  /** Sheet heading and accessible name of the control ("Mini-torneio", "Divisão", "Jornada"). */
  title: string
  /** `chip`: the text on the chip (defaults to the current label). */
  chipLabel?: string
  /** `subheader`: run the one-time 150 ms nudge once per session under this key (discoverability). */
  nudgeKey?: string
}) {
  const [open, setOpen] = useState(false)
  const inputFocused = useInputFocused()
  const labelRef = useRef<HTMLButtonElement>(null)

  // Discoverability: a one-time sideways nudge of the current label, once per session, no motion when
  // the user asked for reduced motion. Web Animations API, so no CSS keyframes are needed.
  useEffect(() => {
    if (variant !== 'subheader' || !nudgeKey || options.length < 2) return
    const el = labelRef.current
    if (!el || typeof el.animate !== 'function') return
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const key = `ppl.nudge.${nudgeKey}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      return
    }
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }],
      { duration: 150, delay: 400, easing: 'ease-in-out' },
    )
  }, [variant, nudgeKey, options.length])

  const idx = Math.max(0, options.findIndex(o => o.key === value))
  // Pill: when the value changes (a swipe on the list, or an arrow) the label slides in from the side
  // it came from, so the user sees what moved. No motion under prefers-reduced-motion.
  const prevIdx = useRef(idx)
  useEffect(() => {
    const from = prevIdx.current
    prevIdx.current = idx
    if (variant !== 'pill' || from === idx) return
    const el = labelRef.current
    if (!el || typeof el.animate !== 'function') return
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    } catch {
      return
    }
    const dir = idx > from ? 1 : -1
    el.animate(
      [{ transform: `translateX(${dir * 18}px)`, opacity: 0.4 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: 180, easing: 'ease-out' },
    )
  }, [idx, variant])

  if (options.length < 2) return null
  const cur = options[idx]
  const prev = options[idx - 1]
  const next = options[idx + 1]
  const go = (o?: StepperOption) => o && onChange(o.key)

  const sheet = (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60]" style={{ background: 'rgba(20,26,40,.35)' }} />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[61] max-h-[80vh] overflow-y-auto rounded-t-[16px] bg-white px-[16px] pb-[max(18px,env(safe-area-inset-bottom))] pt-[10px] outline-none"
          style={{ boxShadow: '0 -8px 24px rgba(20,26,40,.2)', color: INK }}
          aria-label={title}
        >
          <div className="mx-auto mb-[10px] h-[4px] w-[40px] rounded-[2px] bg-gray-300" />
          <Dialog.Title className="mb-[6px] text-[18px] font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">Escolhe uma opção.</Dialog.Description>
          <ul role="listbox" aria-label={title}>
            {options.map(o => (
              <li key={o.key} role="option" aria-selected={o.key === cur.key}>
                <button
                  type="button"
                  className={`flex min-h-[48px] w-full items-center justify-between border-b border-gray-200 text-left text-[17px] ${o.key === cur.key ? 'font-bold' : ''}`}
                  onClick={() => {
                    onChange(o.key)
                    setOpen(false)
                  }}
                >
                  <span>
                    {o.label}
                    {o.mine && tag('a tua')}
                    {o.current && !o.mine && tag('atual')}
                  </span>
                  <span className="flex items-center gap-[8px] text-[13px] text-gray-500">
                    {o.hint}
                    {o.key === cur.key && <span aria-hidden style={{ color: TEAL }}>✓</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )

  const openLabel = `${title}: ${cur.label}. Abrir lista`

  if (variant === 'chip') {
    return (
      <>
        <button
          ref={labelRef}
          type="button"
          className="min-h-[32px] rounded-full bg-white px-[10px] text-[14px] font-semibold"
          style={{ color: INK }}
          aria-label={openLabel}
          onClick={() => setOpen(true)}
        >
          {chipLabel ?? cur.label} <span style={{ color: TEAL }}>▾</span>
        </button>
        {sheet}
      </>
    )
  }

  if (variant === 'header') {
    const arrow = 'grid h-[40px] w-[40px] place-items-center rounded-full text-[22px] leading-none text-white disabled:opacity-35'
    return (
      <div className="flex items-center gap-[6px]" role="group" aria-label={title}>
        <button type="button" className={arrow} style={{ background: 'rgba(255,255,255,.14)' }} disabled={!prev} onClick={() => go(prev)} aria-label="Anterior">‹</button>
        <button
          ref={labelRef}
          type="button"
          className="flex h-[40px] flex-1 items-center justify-center gap-[8px] rounded-full bg-white text-[17px] font-semibold"
          style={{ color: INK }}
          aria-label={openLabel}
          onClick={() => setOpen(true)}
        >
          {cur.label} <small className="text-[13px] font-medium text-gray-500">de {options.length}</small>
          <span className="text-[12px]" style={{ color: TEAL }}>▾</span>
        </button>
        <button type="button" className={arrow} style={{ background: 'rgba(255,255,255,.14)' }} disabled={!next} onClick={() => go(next)} aria-label="Seguinte">›</button>
        {sheet}
      </div>
    )
  }

  if (variant === 'subheader') {
    const arrow = 'grid h-[40px] w-[40px] place-items-center text-[24px] leading-none disabled:opacity-25'
    return (
      <div role="group" aria-label={title}>
        <div className="flex items-center gap-[4px]">
          <button type="button" className={arrow} style={{ color: TEAL }} disabled={!prev} onClick={() => go(prev)} aria-label="Anterior">‹</button>
          <span className="w-[62px] overflow-hidden whitespace-nowrap text-right text-[15px] text-gray-400" aria-hidden>{prev?.label ?? ''}</span>
          <button
            ref={labelRef}
            type="button"
            className="flex-1 text-center text-[20px] font-bold"
            style={{ color: INK }}
            aria-label={openLabel}
            onClick={() => setOpen(true)}
          >
            {cur.label}
            {cur.mine && tag('a tua')}
          </button>
          <span className="w-[62px] overflow-hidden whitespace-nowrap text-left text-[15px] text-gray-400" aria-hidden>{next?.label ?? ''}</span>
          <button type="button" className={arrow} style={{ color: TEAL }} disabled={!next} onClick={() => go(next)} aria-label="Seguinte">›</button>
        </div>
        <div className="mt-[2px] flex justify-center gap-[6px]" aria-hidden>
          {options.map(o => (
            <i
              key={o.key}
              className="block h-[6px] rounded-full"
              style={{
                width: o.key === cur.key ? 18 : 6,
                background: o.mine ? TEAL : o.key === cur.key ? INK : '#cdd4d9',
                boxShadow: o.mine ? `0 0 0 2px ${TEAL_LIGHT}` : undefined,
              }}
            />
          ))}
        </div>
        {sheet}
      </div>
    )
  }

  // pill: floating at the bottom. Hidden while a text field has the focus (iOS keyboard) and while the
  // sheet is open; rendered in a portal so no transformed ancestor can trap the fixed box.
  const arrow = 'grid h-[44px] w-[44px] place-items-center rounded-full text-[24px] leading-none disabled:opacity-30'
  const pill = (
    <div
      role="group"
      aria-label={title}
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full p-[4px] text-white"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        background: PILL,
        boxShadow: '0 8px 24px rgba(20,26,40,.28)',
        visibility: inputFocused || open ? 'hidden' : 'visible',
      }}
    >
      <button type="button" className={arrow} disabled={!prev} onClick={() => go(prev)} aria-label="Anterior">‹</button>
      <button
        ref={labelRef}
        type="button"
        className="min-w-[132px] px-[10px] text-center"
        aria-label={openLabel}
        onClick={() => setOpen(true)}
      >
        <b className="block text-[19px] font-semibold leading-none">{cur.label}</b>
        <small className="text-[12px] tracking-[0.04em] opacity-70">
          de {options.length}
          {cur.current && (
            <>
              {' · '}
              <em className="not-italic" style={{ color: '#7fd3d8' }}>atual</em>
            </>
          )}
        </small>
      </button>
      <button type="button" className={arrow} disabled={!next} onClick={() => go(next)} aria-label="Seguinte">›</button>
    </div>
  )
  return (
    <>
      {typeof document === 'undefined' ? pill : createPortal(pill, document.body)}
      {sheet}
    </>
  )
}
