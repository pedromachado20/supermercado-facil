import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssinaturaInfo, getPublicPricing, iniciarAssinatura, verificarPagamento } from '#/server/functions/billing'
import { CreditCard, CheckCircle2, Clock, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_app/assinatura')({
  component: AssinaturaPage,
})

function fmt(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

function diasRestantes(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

const BADGE: Record<string, { class: string; label: string }> = {
  ativa: { class: 'badge-green', label: 'Assinatura ativa' },
  trial: { class: 'badge-blue', label: 'Trial' },
  expirada: { class: 'badge-red', label: 'Expirada' },
}

function AssinaturaPage() {
  const qc = useQueryClient()
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro' | 'info'; texto: string } | null>(null)
  const { data: info, isLoading } = useQuery({ queryKey: ['assinatura-info'], queryFn: () => getAssinaturaInfo() })
  const { data: pricing } = useQuery({ queryKey: ['public-pricing'], queryFn: () => getPublicPricing(), staleTime: 60_000 })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['assinatura-info'] })

  const assinar = useMutation({
    mutationFn: () => iniciarAssinatura(),
    onSuccess: (res) => {
      invalidate()
      if (res.checkoutUrl) {
        setFeedback({ tipo: 'ok', texto: 'Assinatura criada! Abrindo o checkout de pagamento...' })
        window.open(res.checkoutUrl, '_blank')
      } else {
        setFeedback({ tipo: 'info', texto: 'Assinatura criada! O link de pagamento vai aparecer aqui em instantes.' })
      }
    },
    onError: (e: any) => setFeedback({ tipo: 'erro', texto: e?.message ?? 'Erro ao criar assinatura' }),
  })

  const verificar = useMutation({
    mutationFn: () => verificarPagamento(),
    onSuccess: (res) => {
      if (res.pago) {
        invalidate()
        setFeedback({ tipo: 'ok', texto: 'Pagamento confirmado! Acesso liberado.' })
      } else {
        setFeedback({ tipo: 'info', texto: 'Pagamento ainda não confirmado — tente de novo em alguns instantes.' })
      }
    },
    onError: (e: any) => setFeedback({ tipo: 'erro', texto: e?.message ?? 'Erro ao verificar pagamento' }),
  })

  const dias = diasRestantes(info?.trialEndsAt ?? null)
  const badge = info?.status ? BADGE[info.status] : null

  return (
    <div style={{ maxWidth: '560px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assinatura</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Acompanhe o status do seu plano e o pagamento do Supermercado Fácil.
          </p>
        </div>
      </div>

      {/* Benefícios do plano */}
      <div style={{ borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Plano Supermercado Fácil</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            '7 dias de teste grátis, sem cartão de crédito',
            <>Depois, apenas <strong>{fmt(pricing?.price ?? 19.9)}</strong> por mês</>,
            'Importação de encartes por foto, PDF ou link, com IA',
            'Comparação de preços entre todos os mercados cadastrados',
            'Lista de compras agrupada por mercado, com total geral',
            'Sem fidelidade — seus dados continuam guardados mesmo se a assinatura ficar em atraso',
          ].map((texto, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
              <CheckCircle2 size={15} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <span>{texto}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <CreditCard size={16} /> Assinatura
            </div>
            {badge && <span className={`badge ${badge.class}`}>{badge.label}</span>}
          </div>

          {info?.status === 'trial' && (
            <div style={{ display: 'flex', gap: '0.75rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe', background: '#eff6ff', padding: '0.875rem', marginBottom: '1rem' }}>
              <Clock size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600 }}>
                  {dias !== null ? `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''} no período de teste` : 'Período de teste em andamento'}
                </div>
                <div style={{ color: 'var(--color-text-soft)', marginTop: '0.15rem' }}>Sem cartão de crédito necessário durante o trial.</div>
              </div>
            </div>
          )}

          {info?.status === 'ativa' && (
            <div style={{ display: 'flex', gap: '0.75rem', borderRadius: '0.5rem', border: '1px solid #86efac', background: 'var(--color-primary-bg)', padding: '0.875rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>Sua assinatura está em dia. Obrigado por confiar no Supermercado Fácil!</p>
            </div>
          )}

          {info?.status === 'expirada' && (
            <div style={{ display: 'flex', gap: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fecaca', background: '#fef2f2', padding: '0.875rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>Sua assinatura está com pagamento pendente. Regularize pra recuperar o acesso.</p>
            </div>
          )}

          {feedback && (
            <div style={{
              fontSize: '0.8125rem', marginBottom: '1rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
              background: feedback.tipo === 'erro' ? '#fef2f2' : feedback.tipo === 'ok' ? 'var(--color-primary-bg)' : '#eff6ff',
              border: `1px solid ${feedback.tipo === 'erro' ? '#fecaca' : feedback.tipo === 'ok' ? '#86efac' : '#bfdbfe'}`,
              color: feedback.tipo === 'erro' ? 'var(--color-danger)' : 'var(--color-text)',
            }}>
              {feedback.texto}
            </div>
          )}

          {info?.checkoutUrl && info.status !== 'ativa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href={info.checkoutUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <ExternalLink size={15} /> Ir para pagamento
                </button>
              </a>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} disabled={verificar.isPending} onClick={() => verificar.mutate()}>
                <RefreshCw size={14} /> {verificar.isPending ? 'Verificando...' : 'Verificar pagamento'}
              </button>
            </div>
          )}

          {!info?.checkoutUrl && info?.status !== 'ativa' && (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={assinar.isPending} onClick={() => assinar.mutate()}>
              <CreditCard size={15} /> {assinar.isPending ? 'Criando assinatura...' : 'Quero assinar agora'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
