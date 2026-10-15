import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, resultsApi } from './api'

/** Admin: freeze the group's standings, write its awards and refresh the ranking (POST /groups/{id}/close). */
export default function CloseGroupButton({ groupId, hasEnded }: { groupId: number; hasEnded?: boolean }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const close = useMutation({
    mutationFn: () => resultsApi.closeGroup(groupId),
    onSuccess: g => {
      qc.setQueryData(['v2', 'groups', groupId], g)
      qc.invalidateQueries({ queryKey: ['v2', 'competitions'] })
      toast.success('Grupo fechado.')
      setConfirm(false)
    },
    onError: err => toast.error(errorMessage(err, 'Não foi possível fechar o grupo.')),
  })
  if (!(user?.isAdmin || user?.superAdmin) || hasEnded) return null
  return confirm ? (
    <span className="flex flex-wrap items-center gap-[8px] text-[13px]">
      Fechar o grupo e atribuir os pontos de ranking?
      <button className="rounded bg-red-700 px-[10px] py-[4px] font-semibold text-white disabled:opacity-40" disabled={close.isPending} onClick={() => close.mutate()}>
        {close.isPending ? 'A fechar…' : 'Sim, fechar'}
      </button>
      <button className="underline" onClick={() => setConfirm(false)}>Cancelar</button>
    </span>
  ) : (
    <button className="rounded border border-red-700 px-[10px] py-[4px] text-[13px] text-red-700" onClick={() => setConfirm(true)}>
      Fechar grupo
    </button>
  )
}
