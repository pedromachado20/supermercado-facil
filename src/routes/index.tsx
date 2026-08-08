import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { getPublicPricing } from '#/server/functions/billing'
import { ShoppingBag, UploadCloud, TrendingDown, ShoppingCart, Store, Check } from 'lucide-react'

const checkGuest = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const s = await auth.api.getSession({ headers: request.headers })
  if (s) throw redirect({ to: '/dashboard' })
  return null
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => { await checkGuest() },
  component: LandingPage,
})

const PASSOS = [
  { icon: UploadCloud, titulo: 'Importe os encartes', desc: 'Foto, PDF ou link do site do supermercado — a IA extrai os produtos e preços automaticamente.' },
  { icon: TrendingDown, titulo: 'Compare os preços', desc: 'Veja cada produto ordenado do mais barato pro mais caro, com o nome do mercado ao lado.' },
  { icon: ShoppingCart, titulo: 'Monte sua lista', desc: 'Gere a lista de compras já separada por mercado, com o total de cada um e o total geral.' },
]

function LandingPage() {
  const { data: pricing } = useQuery({ queryKey: ['public-pricing'], queryFn: () => getPublicPricing(), staleTime: 60_000 })
  const price = pricing?.price ?? 19.9
  const trialDays = pricing?.trialDays ?? 7

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-2)' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={18} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem' }}>Supermercado <span style={{ color: 'var(--color-primary)' }}>Fácil</span></span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/login" className="btn btn-secondary btn-sm">Entrar</Link>
          <Link to="/registro" className="btn btn-primary btn-sm">Criar conta grátis</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', padding: '3rem 1.5rem 2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem' }}>
          Compare preços entre supermercados e economize em toda compra
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-soft)', lineHeight: 1.6, marginBottom: '2rem' }}>
          Importe os encartes dos mercados que você usa, veja o menor preço de cada produto e monte
          sua lista de compras já separada por mercado — sem abrir mil abas pra comparar preço.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/registro" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}>
            Começar teste grátis de {trialDays} dias
          </Link>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)', marginTop: '0.75rem' }}>
          Sem cartão de crédito pra testar. Cancele quando quiser.
        </p>
      </section>

      {/* Como funciona */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {PASSOS.map(({ icon: Icon, titulo, desc }) => (
            <div key={titulo} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Icon size={20} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{titulo}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preço */}
      <section style={{ maxWidth: '420px', margin: '0 auto', padding: '1rem 1.5rem 4rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '2px solid var(--color-primary)' }}>
          <Store size={28} color="var(--color-primary)" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            R$ {price.toFixed(2).replace('.', ',')}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-soft)' }}>/mês</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', margin: '0.5rem 0 1.5rem' }}>
            {trialDays} dias grátis pra testar, depois um valor fixo — sem taxa de adesão.
          </p>
          <ul style={{ listStyle: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
            {[
              'Importação de encartes por foto, PDF ou link',
              'Comparação de preço entre todos os mercados cadastrados',
              'Lista de compras agrupada por mercado, com total geral',
              'Alerta de preço e controle de orçamento mensal',
            ].map(item => (
              <li key={item} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Check size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/registro" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Começar agora
          </Link>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
        <p>Supermercado Fácil — dúvidas em <a href="mailto:nexusteckbr@gmail.com" style={{ color: 'var(--color-primary)' }}>nexusteckbr@gmail.com</a></p>
        <p style={{ marginTop: '0.375rem' }}>
          <Link to="/termos" style={{ color: 'var(--color-text-soft)' }}>Termos de Uso</Link>
          {' · '}
          <Link to="/privacidade" style={{ color: 'var(--color-text-soft)' }}>Política de Privacidade</Link>
        </p>
      </footer>
    </div>
  )
}
