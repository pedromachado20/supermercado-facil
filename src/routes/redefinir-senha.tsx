import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ShoppingBag, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/redefinir-senha')({
  component: RedefinirSenhaPage,
})

function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token') ?? ''
    : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (newPassword !== confirmPassword) {
      setErro('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!token) {
      setErro('Token inválido ou expirado. Solicite um novo link de redefinição.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, token }),
      })
      if (res.ok) {
        setSucesso(true)
        setTimeout(() => navigate({ to: '/login' }), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setErro(data?.message ?? 'Token inválido ou expirado. Solicite um novo link.')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px', padding: '1rem' }}>
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
        {sucesso ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Senha redefinida!</h2>
            <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Redefinir senha</h2>
            <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Escolha uma nova senha para sua conta.
            </p>

            {!token && (
              <div style={{
                padding: '0.75rem', borderRadius: '0.5rem',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: 'var(--color-danger)', fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>
                Token não encontrado na URL. Solicite um novo link de redefinição.
              </div>
            )}

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
                <label className="label" htmlFor="newPassword">Nova senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-soft)' }} />
                  <input
                    id="newPassword"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-soft)' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="label" htmlFor="confirmPassword">Confirmar nova senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-soft)' }} />
                  <input
                    id="confirmPassword"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading || !token}>
                {loading ? <span className="spinner" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} /> : 'Redefinir senha'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link to="/esqueci-senha" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Solicitar novo link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
