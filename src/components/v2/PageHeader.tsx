import type { ReactNode } from 'react'
import { HEADER_SLOT_ID } from './headerSlot'
import { blurAfterPointerClick } from '@/lib/focus'

export type HeaderTab<K extends string> = { key: K; label: string }

/** Teal title block for competition/group pages, with optional tabs underneath. */
export default function PageHeader<K extends string>({ image, kicker, title, subtitle, tabs, active, onTab }: {
  image?: string | null
  kicker?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  tabs?: HeaderTab<K>[]
  active?: K
  onTab?: (k: K) => void
}) {
  return (
    <header className="w-full">
      <div
        className="w-full flex flex-col items-center text-center gap-[8px] px-[16px] py-[24px] text-white"
        style={{
          background: image
            ? `linear-gradient(rgba(0,74,79,.75),rgba(0,74,79,.85)), url(${image}) center/cover`
            : 'linear-gradient(135deg,#006A71,#48A6A7)',
        }}
      >
        {kicker && <div className="flex items-center gap-[8px] flex-wrap justify-center text-[14px]">{kicker}</div>}
        <h1 className="text-[26px] sm:text-[32px] font-bold leading-tight m-0 text-white">{title}</h1>
        {subtitle && <p className="text-[14px] m-0 opacity-90 text-white">{subtitle}</p>}
        {/* Portal target for a page-level control (see headerSlot.ts); hidden while empty. */}
        <div id={HEADER_SLOT_ID} className="w-full max-w-[480px] empty:hidden" />
      </div>
      {tabs && tabs.length > 0 && (
        <nav className="flex justify-center gap-[4px] border-b border-gray-200 overflow-x-auto bg-white">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={e => {
                blurAfterPointerClick(e)
                onTab?.(t.key)
              }}
              className="px-[14px] py-[12px] text-[15px] font-semibold whitespace-nowrap bg-transparent"
              style={active === t.key ? { borderBottom: '3px solid #006A71', color: '#006A71' } : { borderBottom: '3px solid transparent', color: '#6b7280' }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
