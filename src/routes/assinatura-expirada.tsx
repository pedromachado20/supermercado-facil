import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getAssinaturaInfo, iniciarAssinatura } from '#/server/functions/billing'
import { signOut } from '#/lib/auth-client'
import { ShoppingBag, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/assinatura-expirada')({
  component: AssinaturaExpiradaPage,
})

function AssinaturaExpiradaPage() {
  const [loading, setLoading] = useState(false)
  const { data: info } = useQuery({ queryKey: ['assinatura-info'], queryFn: () => getAssinaturaInfo() })

  async function assinar() {
    setLoading(true)
    try {
      const res = info?.checkoutUrl ? info : await iniciarAssinatura()
      if (res.checkoutUrl) window.open(res.checkoutUrl, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
          }}>
            <ShoppingBag size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Supermercado Fácil</h1>
        </div>

        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Seu teste grátis acabou</h2>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            O acesso ficou bloqueado até a assinatura ser confirmada. Seus dados continuam guardados — nada foi apagado.
          </p>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={assinar} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} /> : 'Assinar agora — R$ 19,90/mês'}
          </button>

          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', color: 'var(--color-text-soft)' }}
            onClick={async () => { await signOut().catch(() => {}); window.location.href = '/login' }}>
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
