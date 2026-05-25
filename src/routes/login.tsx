import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { signIn } from '#/lib/auth-client'
import { useState } from 'react'
import { ShoppingBag, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn.email({ email, password })
      if (res.error) {
        setError('E-mail ou senha incorretos.')
      } else {
        navigate({ to: '/' })
      }
    } catch {
      setError('Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px', padding: '1rem' }}>
      {/* Logo */}
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
        <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>Economize nas suas compras</p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Entrar na conta</h2>

        {error && (
          <div style={{
            padding: '0.75rem', borderRadius: '0.5rem',
            background: '#fef2f2', border: '1px solid #fecaca',
            color: 'var(--color-danger)', fontSize: '0.875rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <div className="form-group">
            <label className="label" htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-soft)' }} />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} /> : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-soft)' }}>
          Não tem conta?{' '}
          <Link to="/registro" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
