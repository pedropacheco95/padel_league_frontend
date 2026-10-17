import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { PasswordCode } from '@/api/v2'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from '@/features/results/api'
import { passwordCodesApi, passwordCodesKey, whatsappText, whatsappUrl } from './api'

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function CodeCard({ c, onDismiss, highlight }: { c: PasswordCode; onDismiss: () => void; highlight?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText(c))
      toast.success('Mensagem copiada.')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }
  return (
    <li className={`rounded-lg border bg-white p-[14px] ${highlight ? 'border-emerald-600' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-gray-900">{c.player?.name ?? c.username}</p>
          <p className="truncate text-[13px] text-gray-600">username: {c.username}</p>
        </div>
        <span className="shrink-0 rounded bg-gray-100 px-[10px] py-[4px] font-mono text-[18px] font-semibold tracking-[2px] text-gray-900">{c.code}</span>
      </div>
      <div className="mt-[12px] flex flex-wrap gap-[8px]">
        <a
          href={whatsappUrl(c)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded bg-[#25D366] px-[14px] text-[14px] font-semibold text-white"
        >
          Enviar por WhatsApp
        </a>
        <button className="min-h-[44px] rounded border border-gray-300 px-[14px] text-[14px]" onClick={copy}>Copiar</button>
        <button className="min-h-[44px] px-[10px] text-[14px] text-gray-600 underline" onClick={onDismiss}>Descartar</button>
      </div>
    </li>
  )
}

export default function PasswordCodesPage() {
  const { user, loading } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [justMade, setJustMade] = useState<number | null>(null)

  const codes = useQuery({ queryKey: passwordCodesKey, queryFn: passwordCodesApi.list, enabled: isAdmin })
  const players = useQuery({ queryKey: ['v2', 'players'], queryFn: resultsApi.players, enabled: isAdmin })

  const make = useMutation({
    mutationFn: passwordCodesApi.make,
    onSuccess: c => {
      qc.setQueryData<PasswordCode[]>(passwordCodesKey, old => [c, ...(old ?? []).filter(o => o.userId !== c.userId)])
      setJustMade(c.userId)
      setQuery('')
    },
    onError: err => toast.error(errorMessage(err, 'Não foi possível gerar o código.')),
  })
  const dismiss = useMutation({
    mutationFn: passwordCodesApi.dismiss,
    onSuccess: (_v, userId) => qc.setQueryData<PasswordCode[]>(passwordCodesKey, old => (old ?? []).filter(o => o.userId !== userId)),
    onError: err => toast.error(errorMessage(err)),
  })

  const matches = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return []
    return (players.data ?? []).filter(p => fold(p.name).includes(q)).slice(0, 8)
  }, [players.data, query])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/login" replace />

  return (
    <main className="mx-auto w-full max-w-[560px] px-[16px] py-[24px] text-gray-900">
      <h1 className="text-[24px] font-bold">Passwords</h1>
      <p className="mt-[6px] text-[14px] text-gray-600">
        Quem se esquece da password pede um código no site, ou pede-te diretamente. Envia-lhe o código por WhatsApp: o link já o
        preenche e o jogador define a nova password.
      </p>

      <section className="mt-[20px]">
        <h2 className="text-[16px] font-semibold">Gerar código para um jogador</h2>
        <input
          className="mt-[8px] h-[44px] w-full rounded border border-gray-300 px-[12px] text-[16px]"
          placeholder="Procurar jogador"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {matches.length > 0 && (
          <ul className="mt-[6px] divide-y divide-gray-100 rounded border border-gray-200 bg-white">
            {matches.map(p => (
              <li key={p.id}>
                <button
                  className="flex min-h-[44px] w-full items-center justify-between px-[12px] text-left text-[15px] disabled:opacity-50"
                  disabled={make.isPending}
                  onClick={() => make.mutate(p.id)}
                >
                  {p.name}
                  <span className="text-[13px] text-gray-500">Gerar código</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-[24px]">
        <h2 className="text-[16px] font-semibold">Pedidos e códigos por enviar</h2>
        {codes.isLoading && <p className="mt-[8px] text-[14px] text-gray-500">A carregar…</p>}
        {codes.data?.length === 0 && <p className="mt-[8px] text-[14px] text-gray-500">Nenhum pedido pendente.</p>}
        <ul className="mt-[8px] flex flex-col gap-[10px]">
          {codes.data?.map(c => (
            <CodeCard key={c.userId} c={c} highlight={c.userId === justMade} onDismiss={() => dismiss.mutate(c.userId)} />
          ))}
        </ul>
      </section>
    </main>
  )
}
