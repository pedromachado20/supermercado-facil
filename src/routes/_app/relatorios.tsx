import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { listarProdutos } from '#/server/functions/produtos'
import { listarCategorias } from '#/server/functions/categorias'
import { listarJobs } from '#/server/functions/importar'
import { BarChart2, Store, Package, Tag, Download, TrendingDown, Clock } from 'lucide-react'

export const Route = createFileRoute('/_app/relatorios')({
  component: RelatoriosPage,
})

function RelatoriosPage() {
  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })
  const { data: produtos = [] } = useQuery({ queryKey: ['produtos'], queryFn: () => listarProdutos() })
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => listarJobs() })

  const jobsConcluidos = jobs.filter(j => j.status === 'completed')
  const totalProdutosImportados = jobsConcluidos.reduce((s, j) => s + (j.productsImported ?? 0), 0)

  function imprimirRelatorio() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Relatório — Supermercado Fácil</title>
      <style>
        body{font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto}
        h1{font-size:1.5rem;margin-bottom:0.5rem}
        h2{font-size:1.1rem;margin:1.5rem 0 0.75rem;border-bottom:2px solid #16a34a;padding-bottom:0.375rem;color:#16a34a}
        table{width:100%;border-collapse:collapse;margin-bottom:1rem}
        th{text-align:left;padding:0.5rem;background:#f0fdf4;font-size:0.8rem;text-transform:uppercase;color:#64748b}
        td{padding:0.5rem;border-bottom:1px solid #e2e8f0;font-size:0.875rem}
        .stat{display:inline-block;padding:1rem 1.5rem;margin:0.5rem;border:1px solid #e2e8f0;border-radius:0.75rem;text-align:center}
        .stat-value{font-size:2rem;font-weight:800;color:#16a34a}
        .stat-label{font-size:0.8rem;color:#64748b}
      </style></head>
      <body>
        <h1>📊 Relatório — Supermercado Fácil</h1>
        <p style="color:#64748b;font-size:0.875rem">Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div>
          <div class="stat"><div class="stat-value">${mercados.length}</div><div class="stat-label">Supermercados</div></div>
          <div class="stat"><div class="stat-value">${produtos.length}</div><div class="stat-label">Produtos</div></div>
          <div class="stat"><div class="stat-value">${categorias.length}</div><div class="stat-label">Categorias</div></div>
          <div class="stat"><div class="stat-value">${totalProdutosImportados}</div><div class="stat-label">Produtos importados via IA</div></div>
        </div>

        <h2>Supermercados Cadastrados</h2>
        <table>
          <tr><th>Nome</th><th>Cidade</th><th>Site</th></tr>
          ${mercados.map(m => `<tr><td>${m.name}</td><td>${m.city ?? '—'}</td><td>${m.websiteUrl ?? '—'}</td></tr>`).join('')}
        </table>

        <h2>Categorias</h2>
        <table>
          <tr><th>Categoria</th><th>Slug</th></tr>
          ${categorias.map(c => `<tr><td>${c.icon ?? ''} ${c.name}</td><td>${c.slug}</td></tr>`).join('')}
        </table>

        <h2>Histórico de Importações (últimas 20)</h2>
        <table>
          <tr><th>Tipo</th><th>Status</th><th>Encontrados</th><th>Importados</th><th>Data</th></tr>
          ${jobs.map(j => `<tr><td>${j.sourceType}</td><td>${j.status}</td><td>${j.productsFound ?? 0}</td><td>${j.productsImported ?? 0}</td><td>${new Date(j.createdAt).toLocaleDateString('pt-BR')}</td></tr>`).join('')}
        </table>
      </body></html>
    `)
    win.print()
  }

  const stats = [
    { label: 'Supermercados', value: mercados.length, icon: Store, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Produtos no catálogo', value: produtos.length, icon: Package, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Categorias', value: categorias.length, icon: Tag, color: '#9333ea', bg: '#faf5ff' },
    { label: 'Produtos via IA', value: totalProdutosImportados, icon: TrendingDown, color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Importações feitas', value: jobs.length, icon: Clock, color: '#06b6d4', bg: '#ecfeff' },
  ]

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Visão geral do sistema
          </p>
        </div>
        <button className="btn btn-secondary" onClick={imprimirRelatorio}>
          <Download size={15} /> Imprimir relatório
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Mercados */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={16} color="var(--color-primary)" />
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Supermercados</h3>
        </div>
        {mercados.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>Nenhum cadastrado</div>
        ) : (
          <table className="table">
            <thead><tr><th>Nome</th><th>Cidade</th><th>Site</th></tr></thead>
            <tbody>
              {mercados.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>{m.city ?? '—'}</td>
                  <td>
                    {m.websiteUrl
                      ? <a href={m.websiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}>Ver site →</a>
                      : <span style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico de importações */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={16} color="var(--color-primary)" />
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Histórico de importações</h3>
        </div>
        {jobs.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>Nenhuma importação realizada</div>
        ) : (
          <table className="table">
            <thead><tr><th>Tipo</th><th>Encontrados</th><th>Importados</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td><span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{j.sourceType}</span></td>
                  <td style={{ fontSize: '0.875rem' }}>{j.productsFound ?? 0}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{j.productsImported ?? 0}</td>
                  <td>
                    <span className={`badge ${j.status === 'completed' ? 'badge-green' : j.status === 'failed' ? 'badge-red' : 'badge-blue'}`}>
                      {j.status === 'completed' ? 'Concluído' : j.status === 'failed' ? 'Erro' : j.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
                    {new Date(j.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
