import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { listarProdutos } from '#/server/functions/produtos'
import { listarCategorias } from '#/server/functions/categorias'
import { Store, Package, Tag, TrendingDown, UploadCloud, ShoppingCart, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  component: Dashboard,
})

function Dashboard() {
  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })
  const { data: produtos = [] } = useQuery({ queryKey: ['produtos'], queryFn: () => listarProdutos({ data: {} }) })
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })

  const stats = [
    { label: 'Supermercados', value: mercados.length, icon: Store, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Produtos', value: produtos.length, icon: Package, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Categorias', value: categorias.length, icon: Tag, color: '#9333ea', bg: '#faf5ff' },
    { label: 'Economia potencial', value: 'Ver lista', icon: TrendingDown, color: '#f59e0b', bg: '#fffbeb' },
  ]

  const atalhos = [
    { to: '/importar', label: 'Importar encarte', desc: 'PDF, foto ou link', icon: UploadCloud, color: '#16a34a' },
    { to: '/produtos', label: 'Comparar preços', desc: 'Buscar produto', icon: TrendingDown, color: '#2563eb' },
    { to: '/lista', label: 'Lista de compras', desc: 'Montar sua lista', icon: ShoppingCart, color: '#f59e0b' },
    { to: '/mercados', label: 'Mercados', desc: 'Gerenciar mercados', icon: Store, color: '#9333ea' },
  ]

  return (
    <div style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bom dia! 👋</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Compare preços e economize nas suas compras
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
        Acesso rápido
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {atalhos.map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to} to={to}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div className="card" style={{
              cursor: 'pointer', transition: 'all 0.15s', padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
                background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>{desc}</div>
              </div>
              <ArrowRight size={16} color="var(--color-text-soft)" />
            </div>
          </Link>
        ))}
      </div>

      {/* Mercados cadastrados */}
      {mercados.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Supermercados cadastrados</h3>
            <Link to="/mercados" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {mercados.slice(0, 5).map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem 1.5rem',
              }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                  background: 'var(--color-primary-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', flexShrink: 0,
                }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.name}</div>
                  {m.city && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>{m.city}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio - primeiro acesso */}
      {mercados.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Store size={40} color="var(--color-text-soft)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Comece cadastrando um mercado</h3>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Adicione os supermercados que você frequenta para começar a comparar preços.
          </p>
          <Link to="/mercados" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            <Store size={16} />
            Cadastrar mercado
          </Link>
        </div>
      )}
    </div>
  )
}
