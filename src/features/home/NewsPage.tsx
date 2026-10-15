// News article (/news/:id) on GET /api/v2/news/{id}.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Schemas } from '@/api/v2'
import { V2NotFound, v2get } from '@/features/competitions/v2http'
import { sanitizeHtml } from './sanitizeHtml'

export default function NewsPage() {
  const id = Number(useParams().id)
  const { data: n, isLoading, error } = useQuery({
    queryKey: ['v2', 'news', id],
    queryFn: () => v2get<Schemas['NewsDetail']>(`/news/${id}`),
    enabled: Number.isFinite(id),
    retry: (count, err) => !(err instanceof V2NotFound) && count < 2,
  })
  const body = useMemo(() => (n?.text ? sanitizeHtml(n.text) : ''), [n?.text])

  if (isLoading) return <div className="loader" />
  if (error || !n) {
    return (
      <p className="text-center text-[15px] py-[40px] px-[16px]">
        {error instanceof V2NotFound ? 'Notícia não encontrada.' : 'Não foi possível carregar a notícia.'}{' '}
        <Link to="/" className="underline">Voltar ao início</Link>
      </p>
    )
  }

  return (
    <div className="l-grid">
      <article className="max-w-[760px] mx-auto w-full px-[16px] py-[24px] box-border">
        {n.coverImage?.url && (
          <img src={n.coverImage.url} alt="" className="w-full max-h-[420px] object-cover rounded-[12px] mb-[20px]" />
        )}
        <h1 className="text-[26px] sm:text-[32px] font-bold leading-tight mb-[8px]">{n.title}</h1>
        {n.author && <p className="text-[14px] text-gray-500 mb-[20px]">{n.author}</p>}
        <div className="news-article-body text-[16px] leading-[1.6] break-words" dangerouslySetInnerHTML={{ __html: body }} />
        <p className="mt-[32px]"><Link to="/" className="underline text-[14px]" style={{ color: '#006A71' }}>← Voltar ao início</Link></p>
      </article>
    </div>
  )
}
