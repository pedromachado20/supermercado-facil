import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarProdutosComPrecos, atualizarProduto, excluirProduto, excluirProdutosEmLote, mesclarDuplicatas } from '#/server/functions/produtos'
import { listarMercados } from '#/server/functions/mercados'
import { listarCategorias } from '#/server/functions/categorias'
import { Package, Search, Pencil, Trash2, X, Printer, ShoppingCart, GitMerge } from 'lucide-react'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/_app/produtos')({
  component: ProdutosPage,
})

function fmt(v: string | number) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

type ProdutoRow = {
  productId: string
  name: string
  brand: string | null
  unit: string | null
  categoryId: string | null
  categoryName: string | null
  supermarketId: string
  supermarketName: string
  normalPrice: string | null
  normalEntryId: string | null
  promoPrice: string | null
  promoEntryId: string | null
}

// Retorna o melhor preço (promo se disponível) e o entryId correspondente
function bestPrice(row: ProdutoRow): { price: string; entryId: string; isPromo: boolean } | null {
  if (row.promoPrice && row.promoEntryId) return { price: row.promoPrice, entryId: row.promoEntryId, isPromo: true }
  if (row.normalPrice && row.normalEntryId) return { price: row.normalPrice, entryId: row.normalEntryId, isPromo: false }
  return null
}

function ProdutosPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [mercFiltro, setMercFiltro] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [quantidades, setQuantidades] = useState<Map<string, string>>(new Map())
  const [modalEditar, setModalEditar] = useState<{ productId: string; name: string; brand: string; categoryId: string; unit: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<ProdutoRow | null>(null)

  function getQtd(id: string) {
    const v = quantidades.get(id)
    return v !== undefined && v !== '' ? parseFloat(v.replace(',', '.')) : 1
  }
  function setQtd(id: string, val: string) {
    setQuantidades(m => new Map(m).set(id, val))
  }

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['produtos-precos', busca, catFiltro, mercFiltro],
    queryFn: () => listarProdutosComPrecos({ data: { busca: busca || undefined, categoriaId: catFiltro || undefined, supermarketId: mercFiltro || undefined } }),
  })
  const { data: cats = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })
  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })

  const editar = useMutation({
    mutationFn: () => atualizarProduto({ data: { id: modalEditar!.productId, name: modalEditar!.name, brand: modalEditar!.brand || undefined, categoryId: modalEditar!.categoryId || undefined, unit: modalEditar!.unit || undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos-precos'] }); setModalEditar(null) },
  })
  const excluir = useMutation({
    mutationFn: (id: string) => excluirProduto({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos-precos'] }); if (confirmDel) { const b = bestPrice(confirmDel); if (b) setSelecionados(s => { const n = new Set(s); n.delete(b.entryId); return n }) } setConfirmDel(null) },
  })
  const excluirLote = useMutation({
    mutationFn: (ids: string[]) => excluirProdutosEmLote({ data: { ids } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos-precos'] }); setSelecionados(new Set()) },
  })
  const mesclar = useMutation({
    mutationFn: () => mesclarDuplicatas(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['produtos-precos'] })
      alert(res.merged > 0 ? `${res.merged} produto${res.merged !== 1 ? 's' : ''} duplicado${res.merged !== 1 ? 's' : ''} mesclado${res.merged !== 1 ? 's' : ''} com sucesso!` : 'Nenhum duplicado encontrado.')
    },
  })

  // Agrupa: supermercado → categoria → produtos
  const grupos = useMemo(() => {
    const mercMap = new Map<string, { name: string; cats: Map<string, { name: string; items: ProdutoRow[] }> }>()
    for (const row of rows) {
      if (!mercMap.has(row.supermarketId)) mercMap.set(row.supermarketId, { name: row.supermarketName, cats: new Map() })
      const merc = mercMap.get(row.supermarketId)!
      const catKey = row.categoryId ?? '__sem_cat__'
      const catName = row.categoryName ?? 'Sem categoria'
      if (!merc.cats.has(catKey)) merc.cats.set(catKey, { name: catName, items: [] })
      merc.cats.get(catKey)!.items.push(row)
    }
    return Array.from(mercMap.entries()).map(([mercId, merc]) => ({
      mercId, mercName: merc.name,
      cats: Array.from(merc.cats.entries()).map(([catId, cat]) => ({ catId, catName: cat.name, items: cat.items })),
    }))
  }, [rows])

  function toggleItem(id: string) {
    setSelecionados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleGrupo(ids: string[]) {
    const allSel = ids.every(id => selecionados.has(id))
    setSelecionados(s => {
      const n = new Set(s)
      ids.forEach(id => allSel ? n.delete(id) : n.add(id))
      return n
    })
  }

  function toggleTodos() {
    const allIds = rows.map(r => bestPrice(r)?.entryId).filter(Boolean) as string[]
    if (selecionados.size === allIds.length) setSelecionados(new Set())
    else setSelecionados(new Set(allIds))
  }

  const totalSelecionados = useMemo(() =>
    rows.filter(r => { const b = bestPrice(r); return b && selecionados.has(b.entryId) })
      .reduce((s, r) => { const b = bestPrice(r)!; return s + Number(b.price) * getQtd(b.entryId) }, 0)
  , [rows, selecionados, quantidades]) // eslint-disable-line react-hooks/exhaustive-deps

  function imprimirLista() {
    const itens = rows.map(r => ({ row: r, best: bestPrice(r) }))
      .filter(({ best }) => best && selecionados.has(best.entryId))
    if (!itens.length) return

    const porMerc = new Map<string, { name: string; itens: typeof itens }>()
    for (const item of itens) {
      const id = item.row.supermarketId
      if (!porMerc.has(id)) porMerc.set(id, { name: item.row.supermarketName, itens: [] })
      porMerc.get(id)!.itens.push(item)
    }

    const totalGeral = itens.reduce((s, { best }) => s + Number(best!.price) * getQtd(best!.entryId), 0)

    function fmtQtd(id: string, unit: string | null) {
      const q = getQtd(id)
      return q % 1 === 0 ? `${q} ${unit ?? 'un'}` : `${q.toFixed(3).replace('.', ',')} ${unit ?? 'un'}`
    }

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Lista de Compras</title>
    <style>
      body{font-family:sans-serif;padding:2rem;max-width:760px;margin:0 auto;color:#1e293b}
      h1{font-size:1.4rem;margin-bottom:0.25rem}
      .sub{color:#64748b;font-size:0.85rem;margin-bottom:2rem}
      h2{font-size:1rem;font-weight:700;color:#16a34a;border-bottom:2px solid #16a34a;padding-bottom:0.375rem;margin:1.5rem 0 0.75rem}
      table{width:100%;border-collapse:collapse;margin-bottom:0.5rem}
      th{text-align:left;padding:0.4rem 0.5rem;background:#f0fdf4;font-size:0.75rem;text-transform:uppercase;color:#64748b}
      td{padding:0.5rem;border-bottom:1px solid #e2e8f0;font-size:0.875rem}
      .num{text-align:right}.price{text-align:right;font-weight:600;color:#16a34a}
      .promo-tag{display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:4px;padding:1px 5px;font-size:0.7rem;font-weight:700;margin-left:4px}
      .strike{text-decoration:line-through;color:#94a3b8;font-size:0.8rem}
      .total-row td{font-weight:700;background:#f0fdf4}
      .grand-total{margin-top:1.5rem;padding:1rem;background:#f0fdf4;border-radius:0.5rem;display:flex;justify-content:space-between;font-size:1.15rem;font-weight:800}
      @media print{body{padding:1rem}}
    </style></head><body>
    <h1>🛒 Lista de Compras</h1>
    <div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · ${itens.length} produto${itens.length !== 1 ? 's' : ''}</div>
    ${Array.from(porMerc.values()).map(({ name, itens: its }) => {
      const subtotal = its.reduce((s, { best }) => s + Number(best!.price) * getQtd(best!.entryId), 0)
      return `
      <h2>${name}</h2>
      <table>
        <tr><th>Produto</th><th>Categoria</th><th class="num">Qtd</th><th class="num">Preço unit.</th><th class="num">Total</th></tr>
        ${its.map(({ row: i, best }) => {
          const qtd = getQtd(best!.entryId)
          const total = Number(best!.price) * qtd
          const precoUnitCell = best!.isPromo && i.normalPrice
            ? `<span class="strike">${fmt(i.normalPrice)}</span> <strong style="color:#c2410c">${fmt(best!.price)}</strong> <span class="promo-tag">PROMOÇÃO</span>`
            : `<strong>${fmt(best!.price)}</strong>`
          return `<tr>
            <td><strong>${i.name}</strong>${i.brand ? `<br><span style="color:#94a3b8;font-size:0.75rem">${i.brand}</span>` : ''}</td>
            <td style="color:#64748b;font-size:0.8rem">${i.categoryName ?? '—'}</td>
            <td class="num" style="color:#374151">${fmtQtd(best!.entryId, i.unit)}</td>
            <td class="num">${precoUnitCell}</td>
            <td class="price">${fmt(total)}</td>
          </tr>`
        }).join('')}
        <tr class="total-row"><td colspan="4" style="text-align:right;padding-right:0.5rem">Subtotal ${name}</td><td class="price">${fmt(subtotal)}</td></tr>
      </table>`
    }).join('')}
    <div class="grand-total"><span>Total geral</span><span>${fmt(totalGeral)}</span></div>
    </body></html>`)
    win.print()
  }

  const nSel = selecionados.size

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos & Preços</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {rows.length} produto{rows.length !== 1 ? 's' : ''} em {grupos.length} supermercado{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {nSel > 0 && (
            <button className="btn btn-primary" onClick={imprimirLista}>
              <Printer size={15} /> Imprimir lista ({nSel})
            </button>
          )}
          <button
            className="btn btn-secondary"
            disabled={mesclar.isPending}
            onClick={() => {
              if (confirm('Mesclar produtos duplicados? Produtos com o mesmo nome (ignorando LATA, LATÃO, GARRAFA, etc.) serão unificados.')) {
                mesclar.mutate()
              }
            }}
          >
            <GitMerge size={15} /> {mesclar.isPending ? 'Mesclando...' : 'Mesclar duplicatas'}
          </button>
          {rows.length > 0 && (
            <button
              className="btn btn-danger"
              disabled={excluirLote.isPending}
              onClick={() => {
                if (confirm(`Excluir TODOS os ${rows.length} produtos? Esta ação não pode ser desfeita.`)) {
                  excluirLote.mutate([...new Set(rows.map(r => r.productId))])
                }
              }}
            >
              <Trash2 size={15} /> Excluir todos
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: '1 1 240px' }}>
          <Search size={15} className="search-icon" />
          <input className="input" placeholder='Buscar produto...' value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="input" style={{ flex: '0 1 180px' }} value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="">Todas as categorias</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input" style={{ flex: '0 1 200px' }} value={mercFiltro} onChange={e => setMercFiltro(e.target.value)}>
          <option value="">Todos os supermercados</option>
          {mercados.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Barra seleção */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            <input type="checkbox" checked={nSel === rows.length && rows.length > 0} onChange={toggleTodos} style={{ width: '1rem', height: '1rem' }} />
            Selecionar todos ({rows.length})
          </label>
          {nSel > 0 && (
            <>
              <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                <ShoppingCart size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                {nSel} selecionado{nSel !== 1 ? 's' : ''}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>
                Total: {fmt(totalSelecionados)}
              </span>
              <button className="btn btn-primary btn-sm" onClick={imprimirLista}>
                <Printer size={13} /> Imprimir lista
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelecionados(new Set())}>
                Limpar seleção
              </button>
            </>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <Package size={40} color="var(--color-text-soft)" />
          <p style={{ fontWeight: 600 }}>Nenhum produto com preço cadastrado</p>
          <p style={{ fontSize: '0.875rem' }}>Importe um encarte ou link de supermercado na aba Importar Dados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {grupos.map(grupo => (
            <div key={grupo.mercId}>
              {/* Header supermercado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem', flexShrink: 0 }}>
                  {grupo.mercName[0].toUpperCase()}
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>{grupo.mercName}</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                  {grupo.cats.reduce((s, c) => s + c.items.length, 0)} produto{grupo.cats.reduce((s, c) => s + c.items.length, 0) !== 1 ? 's' : ''}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
                  onClick={() => toggleGrupo(grupo.cats.flatMap(c => c.items.map(i => bestPrice(i)?.entryId).filter(Boolean) as string[]))}
                >
                  {grupo.cats.flatMap(c => c.items).every(i => { const b = bestPrice(i); return b && selecionados.has(b.entryId) }) ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              {/* Por categoria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {grupo.cats.map(cat => (
                  <div key={cat.catId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={cat.items.every(i => { const b = bestPrice(i); return b && selecionados.has(b.entryId) })}
                        onChange={() => toggleGrupo(cat.items.map(i => bestPrice(i)?.entryId).filter(Boolean) as string[])}
                        style={{ width: '0.875rem', height: '0.875rem' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>{cat.catName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>{cat.items.length} item{cat.items.length !== 1 ? 's' : ''}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 'auto', color: 'var(--color-danger)', fontSize: '0.75rem' }}
                        disabled={excluirLote.isPending}
                        onClick={() => {
                          const ids = [...new Set(cat.items.map(i => i.productId))]
                          if (confirm(`Excluir todos os ${ids.length} produtos de "${cat.catName}"?`)) {
                            excluirLote.mutate(ids)
                          }
                        }}
                      >
                        <Trash2 size={12} /> Excluir categoria
                      </button>
                    </div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '2rem' }}></th>
                          <th>Produto</th>
                          <th style={{ width: '90px' }}>Unidade</th>
                          <th style={{ textAlign: 'right', width: '100px' }}>Preço unit.</th>
                          <th style={{ textAlign: 'center', width: '110px' }}>Quantidade</th>
                          <th style={{ textAlign: 'right', width: '110px' }}>Total</th>
                          <th style={{ width: '72px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map(item => {
                          const best = bestPrice(item)
                          if (!best) return null
                          const qtd = getQtd(best.entryId)
                          const total = Number(best.price) * qtd
                          const sel = selecionados.has(best.entryId)
                          return (
                            <tr key={item.productId + item.supermarketId} style={{ background: sel ? 'var(--color-primary-bg)' : undefined }}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => toggleItem(best.entryId)}
                                  style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                                {item.brand && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>{item.brand}</div>}
                              </td>
                              <td style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>{item.unit ?? '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                {best.isPromo ? (
                                  <div>
                                    {item.normalPrice && (
                                      <div style={{ textDecoration: 'line-through', color: 'var(--color-text-soft)', fontSize: '0.75rem' }}>{fmt(item.normalPrice)}</div>
                                    )}
                                    <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.875rem' }}>{fmt(best.price)}</div>
                                    <span style={{ display: 'inline-block', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700 }}>PROMOÇÃO</span>
                                  </div>
                                ) : (
                                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{fmt(best.price)}</span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={quantidades.get(best.entryId) ?? '1'}
                                  onChange={e => setQtd(best.entryId, e.target.value)}
                                  style={{
                                    width: '100%', textAlign: 'center', padding: '0.25rem 0.375rem',
                                    border: '1px solid var(--color-border)', borderRadius: '0.375rem',
                                    fontSize: '0.875rem', fontWeight: 600,
                                    background: sel ? 'white' : 'var(--color-surface)',
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: sel ? (best.isPromo ? '#c2410c' : 'var(--color-primary)') : 'var(--color-text-soft)', fontSize: '0.875rem' }}>
                                {fmt(total)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    title="Alterar"
                                    onClick={() => setModalEditar({ productId: item.productId, name: item.name, brand: item.brand ?? '', categoryId: item.categoryId ?? '', unit: item.unit ?? '' })}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--color-danger)' }}
                                    title="Excluir"
                                    onClick={() => setConfirmDel(item)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Alterar produto</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalEditar(null)}><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); editar.mutate() }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Nome *</label>
                  <input className="input" value={modalEditar.name} onChange={e => setModalEditar(m => m && ({ ...m, name: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Marca</label>
                    <input className="input" value={modalEditar.brand} onChange={e => setModalEditar(m => m && ({ ...m, brand: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Unidade</label>
                    <input className="input" placeholder="Ex: 5KG, 1L" value={modalEditar.unit} onChange={e => setModalEditar(m => m && ({ ...m, unit: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Categoria</label>
                  <select className="input" value={modalEditar.categoryId} onChange={e => setModalEditar(m => m && ({ ...m, categoryId: e.target.value }))}>
                    <option value="">Sem categoria</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalEditar(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={editar.isPending}>
                  {editar.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <Trash2 size={36} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Excluir produto?</h3>
              <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>
                <strong>{confirmDel.name}</strong> será removido junto com todos os preços cadastrados.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => excluir.mutate(confirmDel.productId)} disabled={excluir.isPending}>
                {excluir.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
