// Shown instead of the whole site, so it needs nothing the site needs: no router, no
// session, no Layout. The same court as the 404 page (Pedro, 2026-11-04).
import PageHeader from '@/components/v2/PageHeader'
import PadelPong from '@/features/notfound/PadelPong'

const TEAL = '#006A71' // $color-primary

const TechnicalProblems = () => (
  <div className="l-grid">
    <PageHeader
      title="Problemas técnicos"
      subtitle="O Pedro e o Claude estão-se a matar para resolver isto como se estivessem a ser pagos para o fazer e para garantir que não há nenhum incomodozinho. Entretanto, por favor, divirtam-se."
    />
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[16px] px-[16px] py-[16px]">
      <PadelPong courtText="" />
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] px-[20px] text-[15px] font-bold uppercase tracking-[0.05em] text-white"
        style={{ background: TEAL }}
      >
        Tentar outra vez
      </button>
    </div>
  </div>
)

export default TechnicalProblems
