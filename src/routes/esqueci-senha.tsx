import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ShoppingBag, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/esqueci-senha')({
  component: EsqueciSenhaPage,
})

function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: '/redefinir-senha' }),
      })
      if (res.ok) {
        setEnviado(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setErro(data?.message ?? 'Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Supermercado Fácil</h1>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {enviado ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>E-mail enviado!</h2>
            <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Esqueceu sua senha?</h2>
            <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            {erro && (
              <div style={{
                padding: '0.75rem', borderRadius: '0.5rem',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: 'var(--color-danger)', fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label" htmlFor="email">E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-soft)' }} />
                  <input
                    id="email"
                    type="email"
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} /> : 'Enviar link de redefinição'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-text-soft)', textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
