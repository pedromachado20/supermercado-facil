import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getAssinaturaInfo, iniciarAssinatura } from '#/server/functions/billing'
import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/_app/assinatura')({
  component: AssinaturaPage,
})

function diasRestantes(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function AssinaturaPage() {
  const { data: info, isLoading } = useQuery({ queryKey: ['assinatura-info'], queryFn: () => getAssinaturaInfo() })
  const assinar = useMutation({
    mutationFn: () => iniciarAssinatura(),
    onSuccess: (res) => { if (res.checkoutUrl) window.open(res.checkoutUrl, '_blank') },
  })

  const dias = diasRestantes(info?.trialEndsAt ?? null)

  return (
    <div style={{ maxWidth: '560px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assinatura</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Plano Supermercado Fácil — R$ 19,90/mês
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          {info?.status === 'ativa' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={22} color="var(--color-primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Assinatura ativa</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>Sem limite de uso — obrigado por assinar!</div>
              </div>
            </div>
          )}

          {info?.status === 'trial' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Clock size={22} color="var(--color-warning)" />
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {dias !== null ? `${dias} dia${dias !== 1 ? 's' : ''} de teste grátis restante${dias !== 1 ? 's' : ''}` : 'Em teste grátis'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
                    Assine a qualquer momento pra continuar sem interrupção depois do teste.
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => assinar.mutate()} disabled={assinar.isPending}>
                <CreditCard size={15} /> {assinar.isPending ? 'Abrindo checkout...' : 'Assinar agora'}
              </button>
            </div>
          )}

          {info?.status === 'expirada' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={22} color="var(--color-danger)" />
                <div style={{ fontWeight: 700 }}>Assinatura expirada</div>
              </div>
              <button className="btn btn-primary" onClick={() => assinar.mutate()} disabled={assinar.isPending}>
                <CreditCard size={15} /> {assinar.isPending ? 'Abrindo checkout...' : 'Assinar agora'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
