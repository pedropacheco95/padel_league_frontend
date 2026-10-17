import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { passwordCodesApi, passwordCodesKey } from './api'

/** Admins only: link to /admin/passwords with the number of pending codes. */
export default function AdminPasswordsLink({ className }: { className?: string }) {
  const { user } = useAuth()
  const isAdmin = !!(user?.isAdmin || user?.superAdmin)
  const codes = useQuery({ queryKey: passwordCodesKey, queryFn: passwordCodesApi.list, enabled: isAdmin, refetchInterval: 60_000 })
  if (!isAdmin) return null
  const n = codes.data?.length ?? 0
  return (
    <Link className={className} to="/admin/passwords">
      Passwords
      {n > 0 && (
        <span className="ml-[6px] inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-600 px-[6px] text-[12px] font-bold leading-[20px] text-white">
          {n}
        </span>
      )}
    </Link>
  )
}
