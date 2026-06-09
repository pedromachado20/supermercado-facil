import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarItensLista, adicionarItemLista, toggleItemLista, removerItemLista,
  limparListaMarcados, buscarMelhorPrecoLista, definirAlertaPreco,
  listarListas, criarLista, renomearLista, excluirLista, obterOuCriarListaDefault,
} from '#/server/functions/lista'
import { obterConfiguracoes, salvarConfiguracoes } from '#/server/functions/configuracoes'
import { buscarProdutosComPrecos } from '#/server/functions/produtos'
import { ShoppingCart, Plus, Trash2, X, TrendingDown, Printer, Share2, List, Pencil, Check, Bell, BellOff, Wallet } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/_app/lista')({
  component: ListaPage,
})

function fmt(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

function ListaPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [customName, setCustomName] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [unit, setUnit] = useState<'un' | 'kg'>('un')
  const [qtyInput, setQtyInput] = useState('1')
  const [produtoId, setProdutoId] = useState('')
  const [tab, setTab] = useState<'lista' | 'economia'>('lista')
  const [modalListas, setModalListas] = useState(false)
  const [novaLista, setNovaLista] = useState('')
  const [renomeando, setRenomeando] = useState<{ id: string; name: string } | null>(null)
  const [listaAtualId, setListaAtualId] = useState<string | null>(null)
  const [alertModal, setAlertModal] = useState<{ id: string; name: string; current: number | null } | null>(null)
  const [alertInput, setAlertInput] = useState('')
  const [editandoOrcamento, setEditandoOrcamento] = useState(false)
  const [orcamentoInput, setOrcamentoInput] = useState('')

  const { data: listaDefault } = useQuery({
    queryKey: ['lista-default'],
    queryFn: () => obterOuCriarListaDefault(),
    staleTime: 60_000,
  })
  const { data: listas = [] } = useQuery({
    queryKey: ['listas'],
    queryFn: () => listarListas(),
    staleTime: 0,
  })

  const listaId = listaAtualId ?? listaDefault?.id ?? null
  const listaNome = listas.find(l => l.id === listaId)?.name ?? listaDefault?.name ?? 'Minha Lista'

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['lista', listaId],
    queryFn: () => listarItensLista({ data: { listId: listaId ?? undefined } }),
    staleTime: 0,
    enabled: !!listaId,
  })
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-busca', busca],
    queryFn: () => buscarProdutosComPrecos({ data: { busca } }),
    enabled: modal && busca.length > 1,
  })
  const { data: economia = [], isFetching: calculando } = useQuery({
    queryKey: ['economia', listaId],
    queryFn: () => buscarMelhorPrecoLista(),
    enabled: tab === 'economia',
  })
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['config'],
    queryFn: () => obterConfiguracoes(),
    staleTime: 60_000,
  })
  const budget = config?.monthlyBudget != null ? Number(config.monthlyBudget) : null

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lista', listaId] })
  const invalidateListas = () => qc.invalidateQueries({ queryKey: ['listas'] })

  const adicionar = useMutation({
    mutationFn: () => adicionarItemLista({ data: { productId: produtoId || undefined, customName: customName || undefined, quantity: qty, unit: unit === 'kg' ? 'kg' : undefined, listId: listaId ?? undefined } }),
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
  const criarNova = useMutation({
    mutationFn: (name: string) => criarLista({ data: { name } }),
    onSuccess: (lista) => { invalidateListas(); setListaAtualId(lista.id); setNovaLista('') },
  })
  const renomear = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renomearLista({ data: { id, name } }),
    onSuccess: () => { invalidateListas(); setRenomeando(null) },
  })
  const deletarLista = useMutation({
    mutationFn: (id: string) => excluirLista({ data: { id } }),
    onSuccess: (_, id) => {
      invalidateListas()
      if (listaAtualId === id) setListaAtualId(null)
    },
  })
  const salvarAlerta = useMutation({
    mutationFn: ({ id, alertPrice }: { id: string; alertPrice: number | null }) =>
      definirAlertaPreco({ data: { id, alertPrice } }),
    onSuccess: () => { invalidate(); setAlertModal(null); setAlertInput('') },
  })
  const salvarOrcamento = useMutation({
    mutationFn: (monthlyBudget: number | null) => salvarConfiguracoes({ data: { monthlyBudget } }),
    onSuccess: () => { refetchConfig(); setEditandoOrcamento(false); setOrcamentoInput('') },
  })

  function resetForm() { setBusca(''); setProdutoId(''); setCustomName(''); setQty(1); setQtyInput('1'); setUnit('un') }

  const pendentes = itens.filter(i => !i.checked)
  const marcados  = itens.filter(i => i.checked)
  const totalEconomia = economia.reduce((sum, e) => sum + (e.totalItem ?? 0), 0)
  const totalLista = pendentes.reduce((sum, i) => i.bestPrice != null ? sum + i.bestPrice * (i.quantity ?? 1) : sum, 0)
  const temPrecos = pendentes.some(i => i.bestPrice != null)

  function compartilharWhatsApp() {
    const linhas = itens
      .filter(i => !i.checked)
      .map(i => {
        const nome = i.productName ?? i.customName ?? 'Item'
        const qtd = i.quantity && i.quantity > 1 ? `${i.quantity}x ` : ''
        const preco = i.bestPrice != null ? ` — ${fmt(i.bestPrice * (i.quantity ?? 1))}` : ''
        return `${qtd}${nome}${preco}`
      })
    const texto = `🛒 *${listaNome}*\n${new Date().toLocaleDateString('pt-BR')}\n\n${linhas.map(l => `• ${l}`).join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

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
      <html><head><title>${listaNome}</title>
      <style>body{font-family:sans-serif;padding:2rem}h1{font-size:1.25rem}table{width:100%;border-collapse:collapse}td{padding:0.4rem 0.5rem;border-bottom:1px solid #eee;font-size:0.9rem}</style>
      </head><body>
      <h1>🛒 ${listaNome} — ${new Date().toLocaleDateString('pt-BR')}</h1>
      <table>${linhas}</table>
      </body></html>
    `)
    win.print()
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 className="page-title">{listaNome}</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalListas(true)} style={{ color: 'var(--color-text-soft)' }}>
              <List size={15} />
            </button>
          </div>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {pendentes.length} item{pendentes.length !== 1 ? 'ns' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={compartilharWhatsApp} disabled={pendentes.length === 0}><Share2 size={15} /> WhatsApp</button>
          <button className="btn btn-secondary" onClick={imprimir}><Printer size={15} /> Imprimir</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Adicionar</button>
        </div>
      </div>

      {/* Seletor rápido de listas */}
      {listas.length > 1 && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {listas.map(l => (
            <button
              key={l.id}
              className={`btn btn-sm ${l.id === listaId ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setListaAtualId(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

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
            {pendentes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {pendentes.map(item => {
                  const alertPrice = item.alertPrice != null ? Number(item.alertPrice) : null
                  const alertAtivo = alertPrice !== null
                  const alertDisparado = alertAtivo && item.bestPrice != null && item.bestPrice <= alertPrice
                  return (
                  <div key={item.id} className="checkbox-item" onClick={() => toggle.mutate({ id: item.id, checked: true })}>
                    <input type="checkbox" checked={false} onChange={() => {}} onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {item.productName ?? item.customName ?? '—'}
                        {item.unit === 'kg'
                          ? <span className="badge badge-blue">{Number(item.quantity ?? 1).toFixed(3).replace('.', ',')} kg</span>
                          : item.quantity && Number(item.quantity) > 1 && <span className="badge badge-blue">×{item.quantity}</span>
                        }
                        {alertDisparado && (
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>🔔 Preço atingido!</span>
                        )}
                        {alertAtivo && !alertDisparado && (
                          <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--color-warning)', color: '#78350f' }}>
                            alerta {fmt(alertPrice!)}
                          </span>
                        )}
                      </div>
                      {(item.productBrand || item.categoryName || item.bestSupermarket) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                          {[item.bestSupermarket, item.productBrand, item.categoryName].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    {item.bestPrice != null && (
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: alertDisparado ? 'var(--color-primary)' : 'var(--color-text)', flexShrink: 0, marginRight: '0.25rem' }}>
                        {item.unit === 'kg'
                          ? `${fmt(item.bestPrice * Number(item.quantity ?? 1))} (${fmt(item.bestPrice)}/kg)`
                          : Number(item.quantity ?? 1) > 1
                            ? `${fmt(item.bestPrice * Number(item.quantity))} (${fmt(item.bestPrice)} un)`
                            : fmt(item.bestPrice)}
                      </span>
                    )}
                    {item.productId && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: alertDisparado ? 'var(--color-primary)' : alertAtivo ? 'var(--color-warning)' : 'var(--color-text-soft)' }}
                        title={alertAtivo ? `Alerta: ${fmt(alertPrice!)}` : 'Definir alerta de preço'}
                        onClick={e => {
                          e.stopPropagation()
                          setAlertInput(alertPrice !== null ? String(alertPrice) : '')
                          setAlertModal({ id: item.id, name: item.productName ?? item.customName ?? 'Item', current: alertPrice })
                        }}>
                        {alertAtivo ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={e => { e.stopPropagation(); remover.mutate(item.id) }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  )
                })}
              </div>
            )}

            {temPrecos && (
              <div style={{ padding: '0.875rem 1rem', background: 'var(--color-primary-bg)', border: '1px solid #86efac', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)' }}>Total estimado (menor preço)</span>
                  <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>{fmt(totalLista)}</span>
                </div>
                {budget !== null && (
                  <div style={{ marginTop: '0.625rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-soft)', marginBottom: '0.3rem' }}>
                      <span>Orçamento mensal</span>
                      <span style={{ fontWeight: 600, color: totalLista > budget ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {fmt(totalLista)} / {fmt(budget)}
                      </span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (totalLista / budget) * 100).toFixed(1)}%`,
                        background: totalLista > budget ? 'var(--color-danger)' : totalLista / budget > 0.8 ? 'var(--color-warning)' : 'var(--color-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                )}
                {budget === null && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.375rem', fontSize: '0.8rem', color: 'var(--color-text-soft)' }}
                    onClick={() => { setOrcamentoInput(''); setEditandoOrcamento(true) }}>
                    <Wallet size={12} /> Definir orçamento mensal
                  </button>
                )}
                {budget !== null && !editandoOrcamento && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.375rem', fontSize: '0.8rem', color: 'var(--color-text-soft)' }}
                    onClick={() => { setOrcamentoInput(String(budget)); setEditandoOrcamento(true) }}>
                    <Wallet size={12} /> Editar orçamento
                  </button>
                )}
                {editandoOrcamento && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', alignItems: 'center' }}>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="10"
                      placeholder="Ex: 500"
                      value={orcamentoInput}
                      onChange={e => setOrcamentoInput(e.target.value)}
                      style={{ height: '2rem', fontSize: '0.85rem', padding: '0 0.625rem' }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm"
                      disabled={!orcamentoInput || salvarOrcamento.isPending}
                      onClick={() => salvarOrcamento.mutate(parseFloat(orcamentoInput))}>
                      <Check size={13} />
                    </button>
                    {budget !== null && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                        onClick={() => salvarOrcamento.mutate(null)}>
                        <X size={13} />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditandoOrcamento(false)}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

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
                    <th>Produto</th><th>Qtd</th><th>Menor preço</th><th>Mercado</th><th style={{ textAlign: 'right' }}>Total</th>
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

      {/* Modal Alerta de Preço */}
      {alertModal && (
        <div className="modal-overlay" onClick={() => { setAlertModal(null); setAlertInput('') }}>
          <div className="modal" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Alerta de preço</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAlertModal(null); setAlertInput('') }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--color-text-soft)' }}>
                Avise quando <strong style={{ color: 'var(--color-text)' }}>{alertModal.name}</strong> atingir este preço:
              </p>
              <div className="form-group">
                <label className="label">Preço alvo (R$)</label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ex: 9,99"
                  value={alertInput}
                  onChange={e => setAlertInput(e.target.value)}
                  autoFocus
                />
              </div>
              {alertModal.current !== null && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                  Alerta atual: <strong>{fmt(alertModal.current)}</strong>
                </p>
              )}
            </div>
            <div className="modal-footer" style={{ gap: '0.5rem' }}>
              {alertModal.current !== null && (
                <button className="btn btn-ghost" style={{ color: 'var(--color-danger)', marginRight: 'auto' }}
                  onClick={() => salvarAlerta.mutate({ id: alertModal.id, alertPrice: null })}
                  disabled={salvarAlerta.isPending}>
                  <BellOff size={14} /> Remover alerta
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => { setAlertModal(null); setAlertInput('') }}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!alertInput || isNaN(parseFloat(alertInput)) || salvarAlerta.isPending}
                onClick={() => salvarAlerta.mutate({ id: alertModal.id, alertPrice: parseFloat(alertInput) })}>
                {salvarAlerta.isPending ? 'Salvando...' : 'Salvar alerta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Listas */}
      {modalListas && (
        <div className="modal-overlay" onClick={() => setModalListas(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Minhas listas</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalListas(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {listas.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0' }}>
                  {renomeando?.id === l.id ? (
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      value={renomeando.name}
                      onChange={e => setRenomeando(r => r && ({ ...r, name: e.target.value }))}
                      autoFocus
                    />
                  ) : (
                    <span style={{ flex: 1, fontWeight: l.id === listaId ? 700 : 400, cursor: 'pointer' }}
                      onClick={() => { setListaAtualId(l.id); setModalListas(false) }}>
                      {l.isDefault && <span className="badge badge-green" style={{ marginRight: '0.375rem', fontSize: '0.65rem' }}>padrão</span>}
                      {l.name}
                    </span>
                  )}
                  {renomeando?.id === l.id ? (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => renomear.mutate({ id: l.id, name: renomeando.name })}
                      disabled={renomear.isPending}>
                      <Check size={13} />
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setRenomeando({ id: l.id, name: l.name })}>
                      <Pencil size={13} />
                    </button>
                  )}
                  {!l.isDefault && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={() => { if (confirm(`Excluir "${l.name}"? Os itens da lista serão apagados.`)) deletarLista.mutate(l.id) }}
                      disabled={deletarLista.isPending}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Criar nova lista</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input" placeholder="Nome da lista..." value={novaLista} onChange={e => setNovaLista(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && novaLista.trim() && criarNova.mutate(novaLista.trim())} />
                  <button className="btn btn-primary" onClick={() => criarNova.mutate(novaLista.trim())}
                    disabled={!novaLista.trim() || criarNova.isPending}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar item */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Adicionar item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setModal(false); resetForm() }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="tab-bar" style={{ marginBottom: '1rem' }}>
                <button className={`tab${!customName ? ' active' : ''}`} onClick={() => setCustomName('')}>Do catálogo</button>
                <button className={`tab${customName ? ' active' : ''}`} onClick={() => setProdutoId('')}>Item livre</button>
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
                              background: produtoId === p.id ? 'var(--color-primary-bg)' : 'var(--color-surface)',
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
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {(['un', 'kg'] as const).map(u => (
                    <button key={u} type="button"
                      className={`btn btn-sm ${unit === u ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => {
                        setUnit(u)
                        const v = u === 'kg' ? 1 : 1
                        setQty(v)
                        setQtyInput(u === 'kg' ? '1,000' : '1')
                      }}>
                      {u === 'un' ? 'Unidade' : 'Kg'}
                    </button>
                  ))}
                </div>
                {unit === 'un' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => { const v = Math.max(1, qty - 1); setQty(v); setQtyInput(String(v)) }}>−</button>
                    <input type="number" className="input" min={1} value={qty}
                      onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); setQty(v); setQtyInput(String(v)) }}
                      style={{ textAlign: 'center' }} />
                    <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => { const v = qty + 1; setQty(v); setQtyInput(String(v)) }}>+</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => { const v = Math.max(0.1, parseFloat((qty - 0.1).toFixed(3))); setQty(v); setQtyInput(String(v).replace('.', ',')) }}>−</button>
                    <input type="text" className="input" placeholder="0,000"
                      value={qtyInput}
                      onChange={e => {
                        const raw = e.target.value.replace(',', '.')
                        setQtyInput(e.target.value)
                        const n = parseFloat(raw)
                        if (!isNaN(n) && n > 0) setQty(n)
                      }}
                      onBlur={() => {
                        const n = parseFloat(qtyInput.replace(',', '.'))
                        if (!isNaN(n) && n > 0) {
                          setQty(n)
                          setQtyInput(n.toFixed(3).replace('.', ','))
                        } else {
                          setQty(0.1)
                          setQtyInput('0,100')
                        }
                      }}
                      style={{ textAlign: 'center' }} />
                    <button type="button" className="btn btn-secondary" style={{ width: '2.5rem', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => { const v = parseFloat((qty + 0.1).toFixed(3)); setQty(v); setQtyInput(String(v).replace('.', ',')) }}>+</button>
                  </div>
                )}
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
