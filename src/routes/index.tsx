import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { getPublicPricing } from '#/server/functions/billing'
import {
  ShoppingBag, UploadCloud, TrendingDown, TrendingUp, ShoppingCart, Store, Check, X,
  List, Bell, Wallet, ChefHat, BarChart2, Tag, ArrowRight, CheckCircle2,
} from 'lucide-react'

const checkGuest = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const s = await auth.api.getSession({ headers: request.headers })
  if (s) throw redirect({ to: '/dashboard' })
  return null
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => { await checkGuest() },
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Supermercado Fácil — compare preços e economize em toda compra' },
      { property: 'og:description', content: 'Importe o encarte, compare o preço entre mercados e monte sua lista de compras já organizada. 7 dias grátis, sem cartão de crédito.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: LandingPage,
})

const DOR = [
  'Você compra sem saber se está pagando mais caro do que pagaria no mercado do lado.',
  'Fica pulando de encarte em encarte, anotando preço no caderno ou no bloco de notas do celular.',
  'Não tem ideia de quanto vai gastar até chegar no caixa — e o orçamento do mês sempre estoura.',
]

const BENEFICIOS = [
  'Nunca mais pague mais caro por não ter comparado antes',
  'Sem digitar preço à mão — a IA lê o encarte por você',
  'Lista de compras já separada por mercado, com o total certo',
  'Saiba na hora se a compra vai estourar o orçamento do mês',
  'Alerta automático quando o preço que você quer aparecer',
  'Histórico de preço pra saber se a promoção é real',
  'Receitas prontas com o que você já tem cadastrado',
  'Um preço só, tudo incluso, sem pegadinha',
]

const FUNCIONALIDADES = [
  { icon: UploadCloud, titulo: 'Importação de encartes por IA', desc: 'Envie uma foto, um PDF ou o link do encarte — a Inteligência Artificial lê os produtos e preços sozinha, sem digitação manual.' },
  { icon: TrendingDown, titulo: 'Comparação de preços', desc: 'Veja o menor preço de cada produto entre todos os mercados que você cadastrou, lado a lado.' },
  { icon: ShoppingCart, titulo: 'Lista de compras inteligente', desc: 'Monte a lista já separada por mercado, com o total de cada um e o total geral da compra.' },
  { icon: List, titulo: 'Múltiplas listas', desc: 'Crie quantas listas quiser — compra do mês, uma ocasião específica — sem misturar tudo.' },
  { icon: Bell, titulo: 'Alerta de preço', desc: 'Defina o preço que você quer pagar por um produto e receba aviso quando ele chegar nesse valor.' },
  { icon: Wallet, titulo: 'Orçamento mensal', desc: 'Acompanhe o total da lista contra um orçamento definido por você, com aviso antes de estourar.' },
  { icon: TrendingUp, titulo: 'Histórico de preços', desc: 'Veja como o preço de cada produto variou ao longo do tempo, mercado por mercado.' },
  { icon: ChefHat, titulo: 'Receitas', desc: 'Descubra receitas com base nos produtos que você já tem cadastrados.' },
  { icon: BarChart2, titulo: 'Relatórios', desc: 'Acompanhe quanto você gastou e quanto economizou comparando preços entre mercados.' },
]

const PUBLICO = [
  'Quem faz a compra do mês', 'Famílias com orçamento apertado', 'Quem compara preço entre mercados',
  'Quem quer economizar sem esforço', 'Quem cozinha com o que já tem em casa',
]

const FAQS = [
  { p: 'Preciso de cartão de crédito para testar?', r: 'Não. Você usa o Supermercado Fácil de graça durante o período de teste, sem informar cartão. Só assina se quiser continuar depois.' },
  { p: 'Tem fidelidade ou multa de cancelamento?', r: 'Não. Sem fidelidade — você pode cancelar quando quiser, direto na tela de assinatura.' },
  { p: 'Como funciona a importação por Inteligência Artificial?', r: 'Você envia uma foto, um PDF ou o link do encarte do mercado, e a IA identifica cada produto e preço automaticamente, sem digitação manual.' },
  { p: 'Funciona com qualquer supermercado?', r: 'Sim. Você cadastra os mercados que costuma frequentar e importa o encarte de cada um — a comparação é sempre entre os mercados que você mesmo cadastrou.' },
  { p: 'Meus dados ficam seguros?', r: 'Sim. Cada conta só acessa seus próprios dados — mercados, produtos, listas e preços cadastrados por você não ficam visíveis para outras contas.' },
  { p: 'Posso ter mais de uma lista de compras?', r: 'Sim. Você pode criar quantas listas quiser, cada uma com seu próprio orçamento e itens.' },
]

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function LandingPage() {
  const { data: pricing } = useQuery({ queryKey: ['public-pricing'], queryFn: () => getPublicPricing(), staleTime: 60_000 })
  const price = pricing?.price ?? 19.9
  const trialDays = pricing?.trialDays ?? 7

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-2)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', rowGap: '0.625rem', padding: '1rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Supermercado <span style={{ color: 'var(--color-primary)' }}>Fácil</span></span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-soft)' }} className="landing-nav">
            <a href="#funcionalidades" style={{ color: 'inherit', textDecoration: 'none' }}>Funcionalidades</a>
            <a href="#precos" style={{ color: 'inherit', textDecoration: 'none' }}>Preço</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>Perguntas frequentes</a>
          </nav>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">Entrar</Link>
            <Link to="/registro" className="btn btn-primary btn-sm">Criar conta grátis</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '3.5rem 1.5rem 4rem' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              <CheckCircle2 size={13} style={{ marginRight: '0.3rem' }} /> {trialDays} dias grátis, sem cartão de crédito
            </span>
            <h1 style={{ fontSize: 'clamp(1.75rem, 5.5vw + 1rem, 2.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '1.1rem 0 1rem' }}>
              Compare preços entre supermercados e economize em toda compra
            </h1>
            <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-soft)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Importe os encartes dos mercados que você usa, veja o menor preço de cada produto e monte
              sua lista de compras já separada por mercado — sem abrir mil abas pra comparar preço.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/registro" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}>
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <a href="#funcionalidades" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}>
                Ver funcionalidades
              </a>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)', marginTop: '1rem' }}>
              Já é cliente? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Entrar na sua conta</Link>
            </p>
          </div>

          {/* Preview estilizado do painel */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Bem-vindo ao Supermercado Fácil</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-soft)' }}>Resumo da sua economia</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Mercados cadastrados', value: '4', icon: Store, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Produtos comparados', value: '128', icon: Tag, color: '#2563eb', bg: '#eff6ff' },
                { label: 'Economia do mês', value: fmt(87.4), icon: TrendingDown, color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Itens na lista', value: '23', icon: ShoppingCart, color: '#9333ea', bg: '#faf5ff' },
              ].map(k => (
                <div key={k.label} style={{ border: '1px solid var(--color-border)', borderRadius: '0.625rem', padding: '0.75rem' }}>
                  <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <k.icon size={14} color={k.color} />
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{k.value}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-soft)', lineHeight: 1.3 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.875rem', border: '1px solid var(--color-border)', borderRadius: '0.625rem', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-soft)', marginBottom: '0.5rem' }}>
                Comparação de preço
              </p>
              {[
                { nome: 'Arroz 5kg', info: 'Mercado Extra · R$ 24,90', tag: 'Mais barato', badge: 'badge-green' },
                { nome: 'Óleo de soja 900ml', info: 'Mercado Center · R$ 7,49', tag: '+R$ 1,20', badge: 'badge-orange' },
              ].map(item => (
                <div key={item.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.nome}</div>
                    <div style={{ color: 'var(--color-text-soft)' }}>{item.info}</div>
                  </div>
                  <span className={`badge ${item.badge}`} style={{ fontSize: '0.65rem' }}>{item.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dor */}
      <section style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.625rem', fontWeight: 800 }}>Reconhece essa rotina?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
            {DOR.map(d => (
              <div key={d} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem' }}>
                <X size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', lineHeight: 1.5 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800 }}>O Supermercado Fácil resolve tudo isso</h2>
          <p style={{ color: 'var(--color-text-soft)', marginTop: '0.75rem' }}>
            Um sistema único no lugar do caderno de anotações, das abas abertas e do preço decorado.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '2.5rem' }}>
          {BENEFICIOS.map(b => (
            <div key={b} className="card" style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '1rem' }}>
              <Check size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <p style={{ fontSize: '0.875rem' }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.625rem', fontWeight: 800 }}>Tudo que você precisa pra economizar</h2>
            <p style={{ color: 'var(--color-text-soft)', marginTop: '0.75rem' }}>Cada funcionalidade pensada pra sua compra sair mais barata.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '2.5rem' }}>
            {FUNCIONALIDADES.map(f => (
              <div key={f.titulo} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                  <f.icon size={18} color="var(--color-primary)" />
                </div>
                <p style={{ fontWeight: 700, marginBottom: '0.375rem' }}>{f.titulo}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.625rem', fontWeight: 800 }}>Para quem é o Supermercado Fácil</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
          {PUBLICO.map(p => (
            <span key={p} className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>{p}</span>
          ))}
        </div>
      </section>

      {/* Preço */}
      <section id="precos" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.625rem', fontWeight: 800 }}>Um preço só, tudo incluso</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-soft)', marginTop: '0.75rem' }}>Sem plano capado, sem taxa por mercado cadastrado, sem letra miúda.</p>
          <div className="card" style={{ maxWidth: '440px', margin: '2.5rem auto 0', padding: '2rem', textAlign: 'center', border: '2px solid var(--color-primary)' }}>
            <Store size={28} color="var(--color-primary)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>Plano Supermercado Fácil</p>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '0.5rem' }}>
              {fmt(price)}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-soft)' }}>/mês</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', margin: '0.5rem 0 1.5rem' }}>
              {trialDays} dias grátis pra testar, sem cartão de crédito
            </p>
            <ul style={{ listStyle: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.75rem' }}>
              {[
                'Importação de encartes por foto, PDF ou link',
                'Comparação de preço entre todos os mercados cadastrados',
                'Lista de compras agrupada por mercado, com total geral',
                'Alerta de preço e controle de orçamento mensal',
                'Histórico de preços e receitas com base nos produtos',
                'Sem fidelidade — cancele quando quiser',
              ].map(item => (
                <li key={item} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/registro" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Criar conta grátis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.625rem', fontWeight: 800 }}>Perguntas frequentes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
          {FAQS.map(f => (
            <details key={f.p} className="card" style={{ padding: '1rem 1.25rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>{f.p}</summary>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', marginTop: '0.625rem', lineHeight: 1.6 }}>{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800 }}>Pronto pra parar de pagar mais caro?</h2>
          <p style={{ color: 'var(--color-text-soft)', marginTop: '0.75rem' }}>
            Crie sua conta agora e use o Supermercado Fácil por {trialDays} dias sem custo, sem cartão de crédito.
          </p>
          <Link to="/registro" className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem' }}>
            Criar conta grátis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={16} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Supermercado Fácil</span>
          </div>
          <p>Dúvidas em <a href="mailto:nexusteckbr@gmail.com" style={{ color: 'var(--color-primary)' }}>nexusteckbr@gmail.com</a></p>
          <p>
            <Link to="/termos" style={{ color: 'var(--color-text-soft)' }}>Termos de Uso</Link>
            {' · '}
            <Link to="/privacidade" style={{ color: 'var(--color-text-soft)' }}>Política de Privacidade</Link>
          </p>
        </div>
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', marginBottom: '0.5rem' }}>um produto</p>
          <a
            href="https://nexusteck.com.br" target="_blank" rel="noopener"
            style={{ display: 'inline-flex', borderRadius: '0.75rem', background: '#0a0a0a', padding: '0.5rem 1.25rem' }}
          >
            <img src="/logo-nexusteck.png" alt="NexusTeck" style={{ height: '2.5rem', width: 'auto' }} />
          </a>
        </div>
      </footer>

      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .landing-nav { display: none !important; }
        }
      `}</style>
    </div>
  )
}
