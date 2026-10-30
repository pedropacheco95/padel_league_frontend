// 404: looks like any v2 page (teal PageHeader, white body, a match-style card) and
// offers a point of padel pong while the visitor is lost (Pedro, 2026-10-30).
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/v2/PageHeader'
import PadelPong from '@/features/notfound/PadelPong'

const TEAL = '#006A71' // $color-primary

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <Layout>
      <div className="l-grid">
        <PageHeader
          kicker={<span className="text-[14px] font-semibold uppercase tracking-[0.12em]">Erro 404</span>}
          title="Página não encontrada"
          subtitle="A bola saiu do court. Enquanto a vamos buscar, joga um ponto?"
        />
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[16px] px-[16px] py-[16px]">
          <PadelPong />
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] px-[20px] text-[15px] font-bold uppercase tracking-[0.05em] text-white"
            style={{ background: TEAL }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </Layout>
  )
}

export default NotFound
