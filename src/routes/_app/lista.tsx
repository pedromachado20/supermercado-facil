import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarItensLista, adicionarItemLista, toggleItemLista, removerItemLista, limparListaMarcados, buscarMelhorPrecoLista } from '#/server/functions/lista'
import { buscarProdutosComPrecos } from '#/server/functions/produtos'
import { ShoppingCart, Plus, Trash2, X, TrendingDown, Printer, Check } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_app/lista')({
  component: ListaPage,
})

function fmt(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

function ListaPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [customName, setCustomName] = useState('')
  const [qty, setQty] = useState(1)
  const [produtoId, setProdutoId] = useState('')
  const [tab, setTab] = useState<'lista' | 'economia'>('lista')

  const { data: itens = [], isLoading } = useQuery({ queryKey: ['lista'], queryFn: () => listarItensLista(), staleTime: 0 })
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-busca', busca],
    queryFn: () => buscarProdutosComPrecos({ data: { busca } }),
    enabled: modal && busca.length > 1,
  })
  const { data: economia = [], isFetching: calculando } = useQuery({
    queryKey: ['economia'],
    queryFn: () => buscarMelhorPrecoLista(),
    enabled: tab === 'economia',
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lista'] })

  const adicionar = useMutation({
    mutationFn: () => adicionarItemLista({ data: { productId: produtoId || undefined, customName: customName || undefined, quantity: qty } }),
    onSuccess: () => { invalidate(); setModal(false); resetForm() },
  })
  const toggle = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) => toggleItemLista({ data: { id, checked } }),
    onSuccess: invalidate,
  })
  const remover = useMutation({
    mutationFn: (id: string) => removerItemLista({ data: { id } }),
    onSuccess: invalidate,
  })
  const limpar = useMutation({
    mutationFn: () => limparListaMarcados(),
    onSuccess: invalidate,
  })

  function resetForm() { setBusca(''); setProdutoId(''); setCustomName(''); setQty(1) }

  const pendentes = itens.filter(i => !i.checked)
  const marcados  = itens.filter(i => i.checked)
  const totalEconomia = economia.reduce((sum, e) => sum + (e.totalItem ?? 0), 0)
  const totalLista = pendentes.reduce((sum, i) => i.bestPrice != null ? sum + i.bestPrice * (i.quantity ?? 1) : sum, 0)
  const temPrecos = pendentes.some(i => i.bestPrice != null)

  function imprimir() {
    const win = window.open('', '_blank')
    if (!win) return
    const linhas = itens.map(i => {
      const nome = i.productName ?? i.customName ?? 'Item'
      const marca = i.productBrand ? ` (${i.productBrand})` : ''
      const qtd = `${i.quantity ?? 1}x`
      const cat = i.categoryName ? `[${i.categoryName}]` : ''
      const check = i.checked ? '✓' : '☐'
      return `<tr><td>${check}</td><td>${cat}</td><td>${nome}${marca}</td><td>${qtd}</td></tr>`
    }).join('')
    win.document.write(`
      <html><head><title>Lista de Compras</title>
      <style>body{font-family:sans-serif;padding:2rem}h1{font-size:1.25rem}table{width:100%;border-collapse:collapse}td{padding:0.4rem 0.5rem;border-bottom:1px solid #eee;font-size:0.9rem}</style>
      </head><body>
      <h1>🛒 Lista de Compras — ${new Date().toLocaleDateString('pt-BR')}</h1>
      <table>${linhas}</table>
      </body></html>
    `)
    win.print()
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lista de Compras</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {pendentes.length} item{pendentes.length !== 1 ? 'ns' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={imprimir}><Printer size={15} /> Imprimir</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Adicionar</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab${tab === 'lista' ? ' active' : ''}`} onClick={() => setTab('lista')}>
          <ShoppingCart size={13} style={{ display: 'inline', marginRight: '0.3rem' }} /> Lista ({itens.length})
        </button>
        <button className={`tab${tab === 'economia' ? ' active' : ''}`} onClick={() => setTab('economia')}>
          <TrendingDown size={13} style={{ display: 'inline', marginRight: '0.3rem' }} /> Melhor preço
        </button>
      </div>

      {/* Lista */}
      {tab === 'lista' && (
        isLoading ? <div className="empty-state"><div className="spinner" /></div> :
        itens.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={40} color="var(--color-text-soft)" />
            <p style={{ fontWeight: 600 }}>Lista vazia</p>
            <p style={{ fontSize: '0.875rem' }}>Adicione produtos para começar.</p>
            <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Adicionar item</button>
          </div>
        ) : (
          <div>
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {pendentes.map(item => (
                  <div key={item.id} className="checkbox-item" onClick={() => toggle.mutate({ id: item.id, checked: true })}>
                    <input type="checkbox" checked={false} onChange={() => {}} onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {item.productName ?? item.customName ?? '—'}
                        {item.quantity && item.quantity > 1 && (
                          <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>×{item.quantity}</span>
                        )}
                      </div>
                      {(item.productBrand || item.categoryName) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                          {[item.productBrand, item.categoryName].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    {item.bestPrice != null && (
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0, marginRight: '0.25rem' }}>
                        {item.quantity && item.quantity > 1
                          ? `${fmt(item.bestPrice * item.quantity)} (${fmt(item.bestPrice)} un)`
                          : fmt(item.bestPrice)}
                      </span>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={e => { e.stopPropagation(); remover.mutate(item.id) }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total estimado */}
            {temPrecos && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--color-primary-bg)', border: '1px solid #86efac', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)' }}>Total estimado (menor preço)</span>
                <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>{fmt(totalLista)}</span>
              </div>
            )}

            {/* Marcados */}
            {marcados.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Adicionados ao carrinho ({marcados.length})
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}
                    onClick={() => limpar.mutate()}>
                    <Trash2 size={13} /> Limpar
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.6 }}>
                  {marcados.map(item => (
                    <div key={item.id} className="checkbox-item checked" style={{ cursor: 'default' }}>
                      <input type="checkbox" checked readOnly style={{ accentColor: 'var(--color-primary)' }}
                        onClick={e => { e.stopPropagation(); toggle.mutate({ id: item.id, checked: false }) }} />
                      <div style={{ flex: 1, textDecoration: 'line-through' }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.productName ?? item.customName}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                        onClick={() => remover.mutate(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Melhor preço */}
      {tab === 'economia' && (
        calculando ? <div className="empty-state"><div className="spinner" /></div> :
        economia.length === 0 ? (
          <div className="empty-state">
            <TrendingDown size={40} color="var(--color-text-soft)" />
            <p style={{ fontWeight: 600 }}>Sem itens para calcular</p>
            <p style={{ fontSize: '0.875rem' }}>Adicione produtos vinculados ao catálogo para ver o melhor preço.</p>
          </div>
        ) : (
          <div>
            <div className="card" style={{ background: 'var(--color-primary-bg)', border: '1px solid #86efac', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingDown size={20} color="var(--color-primary)" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Total estimado (menor preço)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fmt(totalEconomia)}</div>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Menor preço</th>
                    <th>Mercado</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {economia.map(e => (
                    <tr key={e.itemId}>
                      <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>{e.productName}</td>
                      <td style={{ fontSize: '0.875rem' }}>{e.quantity}</td>
                      <td className="price-best">{e.melhorPreco ? fmt(e.melhorPreco) : '—'}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>{e.melhorMercado ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{e.totalItem ? fmt(e.totalItem) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal adicionar */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Adicionar item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setModal(false); resetForm() }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="tab-bar" style={{ marginBottom: '1rem' }}>
                <button className={`tab${!customName && !produtoId ? ' active' : produtoId ? ' active' : ''}`}
                  onClick={() => setCustomName('')}>Do catálogo</button>
                <button className={`tab${customName ? ' active' : ''}`}
                  onClick={() => setProdutoId('')}>Item livre</button>
              </div>

              {!customName ? (
                <div className="form-group">
                  <label className="label">Buscar produto</label>
                  <input className="input" placeholder="Digite o nome..." value={busca}
                    onChange={e => { setBusca(e.target.value); setProdutoId('') }} />
                  {busca.length > 1 && produtos.length > 0 && (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', marginTop: '0.375rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {produtos.map(p => {
                        const melhorPreco = p.prices.length > 0 ? Math.min(...p.prices.map(pr => Number(pr.price))) : null
                        return (
                          <div key={p.id}
                            onClick={() => { setProdutoId(p.id); setBusca(p.name + (p.brand ? ` (${p.brand})` : '')) }}
                            style={{
                              padding: '0.625rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem',
                              background: produtoId === p.id ? 'var(--color-primary-bg)' : 'white',
                              color: produtoId === p.id ? 'var(--color-primary)' : 'var(--color-text)',
                              borderBottom: '1px solid var(--color-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                            }}>
                            <div>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              {(p.brand || p.categoryName) && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>
                                  {[p.brand, p.categoryName].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            {melhorPreco !== null && (
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                                R$ {melhorPreco.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="label">Nome do item</label>
                  <input className="input" placeholder="Ex: Detergente, Pão francês..." value={customName}
                    onChange={e => setCustomName(e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label className="label">Quantidade</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                    onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input type="number" className="input" min={1} value={qty}
                    onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ textAlign: 'center' }} />
                  <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                    onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setModal(false); resetForm() }}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => adicionar.mutate()} disabled={adicionar.isPending || (!produtoId && !customName)}>
                {adicionar.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
