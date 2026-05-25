import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarProdutos, buscarProdutosComPrecos, criarProduto, excluirProduto } from '#/server/functions/produtos'
import { listarMercados } from '#/server/functions/mercados'
import { listarCategorias } from '#/server/functions/categorias'
import { Package, Search, Plus, Trash2, X, TrendingDown } from 'lucide-react'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_app/produtos')({
  component: ProdutosPage,
})

function fmt(v: string | number) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function ProdutosPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [tab, setTab] = useState<'catalogo' | 'comparar'>('catalogo')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', brand: '', categoryId: '', unit: '' })

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos', buscaAtiva],
    queryFn: () => listarProdutos({ data: { busca: buscaAtiva || undefined } }),
  })
  const { data: cats = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })
  const { data: comparacao = [], isFetching: comparando } = useQuery({
    queryKey: ['comparar', buscaAtiva],
    queryFn: () => buscaAtiva ? buscarProdutosComPrecos({ data: { busca: buscaAtiva } }) : [],
    enabled: !!buscaAtiva && tab === 'comparar',
  })

  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca), 400)
    return () => clearTimeout(t)
  }, [busca])

  const criar = useMutation({
    mutationFn: () => criarProduto({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); setModal(false); setForm({ name: '', brand: '', categoryId: '', unit: '' }) },
  })
  const excluir = useMutation({
    mutationFn: (id: string) => excluirProduto({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos & Preços</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Busque produtos e compare preços entre mercados
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Novo produto</button>
      </div>

      {/* Busca */}
      <div style={{ marginBottom: '1rem' }}>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            className="input"
            placeholder='Buscar produto... Ex: "Arroz", "Arroz Tio João 5kg"'
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab${tab === 'catalogo' ? ' active' : ''}`} onClick={() => setTab('catalogo')}>
          <Package size={14} style={{ display: 'inline', marginRight: '0.375rem' }} />
          Catálogo ({produtos.length})
        </button>
        <button className={`tab${tab === 'comparar' ? ' active' : ''}`} onClick={() => setTab('comparar')}>
          <TrendingDown size={14} style={{ display: 'inline', marginRight: '0.375rem' }} />
          Comparar preços
        </button>
      </div>

      {/* Catálogo */}
      {tab === 'catalogo' && (
        isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : produtos.length === 0 ? (
          <div className="empty-state">
            <Package size={40} color="var(--color-text-soft)" />
            <p style={{ fontWeight: 600 }}>{buscaAtiva ? `Nenhum produto para "${buscaAtiva}"` : 'Nenhum produto cadastrado'}</p>
            <p style={{ fontSize: '0.875rem' }}>Importe um encarte ou adicione manualmente.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                      {p.brand && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>{p.brand}</div>}
                    </td>
                    <td>
                      {p.categoryName
                        ? <span className="badge badge-green">{p.categoryName}</span>
                        : <span className="badge badge-gray">Sem categoria</span>
                      }
                    </td>
                    <td style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>{p.unit ?? '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                        onClick={() => { if (confirm(`Excluir "${p.name}"?`)) excluir.mutate(p.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Comparar */}
      {tab === 'comparar' && (
        !buscaAtiva ? (
          <div className="empty-state">
            <Search size={40} color="var(--color-text-soft)" />
            <p style={{ fontWeight: 600 }}>Digite um produto para comparar</p>
            <p style={{ fontSize: '0.875rem' }}>Ex: "Arroz" mostra todos os arroz. "Arroz Tio João" filtra pela marca.</p>
          </div>
        ) : comparando ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : comparacao.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontWeight: 600 }}>Nenhum resultado para "{buscaAtiva}"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comparacao.map(p => {
              const prices = p.prices ?? []
              const menorPreco = prices.length ? Math.min(...prices.map(pr => Number(pr.price))) : null
              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Package size={18} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
                        {[p.brand, p.unit, p.categoryName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {menorPreco && (
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>Menor preço</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{fmt(menorPreco)}</div>
                      </div>
                    )}
                  </div>
                  {prices.length === 0 ? (
                    <div style={{ padding: '1rem 1.25rem', color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>
                      Nenhum preço cadastrado ainda
                    </div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Supermercado</th>
                          <th style={{ textAlign: 'right' }}>Preço</th>
                          <th style={{ textAlign: 'right' }}>Atualizado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...prices].sort((a, b) => Number(a.price) - Number(b.price)).map((pr, i) => (
                          <tr key={pr.supermarketId + i}>
                            <td style={{ fontWeight: 500 }}>{pr.supermarketName}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={Number(pr.price) === menorPreco ? 'price-best' : ''}>
                                {fmt(pr.price)}
                              </span>
                              {Number(pr.price) === menorPreco && (
                                <span className="badge badge-green" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Menor</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--color-text-soft)', fontSize: '0.8125rem' }}>
                              {pr.validFrom ? new Date(pr.validFrom).toLocaleDateString('pt-BR') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal novo produto */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Novo produto</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); criar.mutate() }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Nome do produto *</label>
                  <input className="input" placeholder="Ex: Arroz Agulhinha" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Marca</label>
                    <input className="input" placeholder="Ex: Tio João" value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Unidade</label>
                    <input className="input" placeholder="Ex: 5kg, 1L, un" value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Categoria</label>
                  <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Selecionar categoria</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={criar.isPending}>
                  {criar.isPending ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
