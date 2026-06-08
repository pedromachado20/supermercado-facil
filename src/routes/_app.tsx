import { createFileRoute, Outlet, Link, redirect, useRouterState } from '@tanstack/react-router'
import { signOut } from '#/lib/auth-client'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { useQuery } from '@tanstack/react-query'
import {
  Store, Package, Tag, UploadCloud,
  LayoutDashboard, BarChart2, LogOut, ChefHat,
  Menu, X, ShoppingBag, ShoppingCart, Sun, Moon
} from 'lucide-react'
import { useState, useEffect } from 'react'

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const s = await auth.api.getSession({ headers: request.headers })
  return s ? { name: s.user.name, email: s.user.email } : null
})

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const s = await auth.api.getSession({ headers: request.headers })
  if (!s) throw redirect({ to: '/login' })
  return null
})

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    await checkAuth()
  },
  component: AppLayout,
})

const NAV = [
  { to: '/',           label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/mercados',   label: 'Supermercados',   icon: Store },
  { to: '/produtos',   label: 'Produtos',        icon: Package },
  { to: '/categorias', label: 'Categorias',      icon: Tag },
  { to: '/lista',      label: 'Lista de Compras',icon: ShoppingCart },
  { to: '/importar',   label: 'Importar Dados',  icon: UploadCloud },
  { to: '/receitas',   label: 'Receitas',        icon: ChefHat },
  { to: '/relatorios', label: 'Relatórios',      icon: BarChart2 },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark] as const
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { data: session } = useQuery({ queryKey: ['session'], queryFn: () => getSession(), staleTime: 60_000 })
  const routerState = useRouterState()
  const path = routerState.location.pathname
  const [dark, setDark] = useDarkMode()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 0.75rem' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.5rem', marginBottom: '2rem' }}>
        <div style={{
          width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem',
          background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShoppingBag size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9375rem', lineHeight: 1.15 }}>Supermercado</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)', lineHeight: 1.15 }}>Fácil</div>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? path === '/' : path.startsWith(to)
          return (
            <Link key={to} to={to} className={`sidebar-link${active ? ' active' : ''}`} onClick={onClose}>
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Dark mode + Sair */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.5rem 0.75rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: 'var(--color-primary-bg)', border: '2px solid var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primary)', flexShrink: 0,
            }}>
              {session.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.email}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm tooltip"
              data-tip={dark ? 'Modo claro' : 'Modo escuro'}
              onClick={() => setDark(d => !d)}
              style={{ flexShrink: 0, padding: '0.3rem' }}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        )}
        <button
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
          onClick={async () => {
            try { await signOut() } catch { /* ignore */ }
            window.location.href = '/login'
          }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  )
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar desktop */}
      <aside style={{
        width: '240px', flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'none',
        flexDirection: 'column',
      }} id="sidebar-desktop">
        <style>{`@media (min-width: 768px) { #sidebar-desktop { display: flex !important; } }`}</style>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
      }}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <header id="mobile-topbar" style={{
          display: 'none', alignItems: 'center', gap: '1rem',
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}>
          <style>{`@media (max-width: 767px) { #mobile-topbar { display: flex !important; } }`}</style>
          <button className="btn btn-ghost btn-sm" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Supermercado Fácil</span>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
