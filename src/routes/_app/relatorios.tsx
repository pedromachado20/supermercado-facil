import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { listarCategorias } from '#/server/functions/categorias'
import { listarProdutosComPrecos } from '#/server/functions/produtos'
import { Store, Tag, Package, SlidersHorizontal, Printer } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_app/relatorios')({
  component: RelatoriosPage,
})

function fmt(v: string | number) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

type Row = Awaited<ReturnType<typeof listarProdutosComPrecos>>[number]

function groupByMercCat(rows: Row[]) {
  const map = new Map<string, { name: string; cats: Map<string, { name: string; items: Row[] }> }>()
  for (const row of rows) {
    if (!map.has(row.supermarketId)) map.set(row.supermarketId, { name: row.supermarketName, cats: new Map() })
    const merc = map.get(row.supermarketId)!
    const catKey = row.categoryId ?? '__sem__'
    const catName = row.categoryName ?? 'Sem categoria'
    if (!merc.cats.has(catKey)) merc.cats.set(catKey, { name: catName, items: [] })
    merc.cats.get(catKey)!.items.push(row)
  }
  return Array.from(map.values()).map(m => ({
    name: m.name,
    cats: Array.from(m.cats.values()),
    total: Array.from(m.cats.values()).reduce((s, c) => s + c.items.length, 0),
  }))
}

const BASE_STYLE = `body{font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto;color:#1e293b}
h1{font-size:1.3rem;margin-bottom:.25rem}.sub{color:#64748b;font-size:.85rem;margin-bottom:2rem}
h2{font-size:1rem;font-weight:700;color:#16a34a;border-bottom:2px solid #16a34a;padding-bottom:.3rem;margin:1.5rem 0 .5rem}
h3{font-size:.85rem;font-weight:700;color:#374151;margin:.75rem 0 .25rem;padding-left:.5rem;border-left:2px solid #d1fae5}
table{width:100%;border-collapse:collapse;margin-bottom:.25rem}
th{text-align:left;padding:.35rem .5rem;background:#f0fdf4;font-size:.72rem;text-transform:uppercase;color:#64748b}
td{padding:.45rem .5rem;border-bottom:1px solid #f1f5f9;font-size:.8rem}
.right{text-align:right}.green{font-weight:700;color:#16a34a}.red{font-weight:700;color:#c2410c}
.promo-tag{display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:4px;padding:1px 5px;font-size:.7rem;font-weight:700;margin-left:4px}
.strike{text-decoration:line-through;color:#94a3b8;font-size:.75rem}
a{color:#16a34a}@media print{body{padding:1rem}}`

function printWindow(title: string, body: string) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<html><head><title>${title}</title><style>${BASE_STYLE}</style></head><body>${body}</body></html>`)
  win.print()
}

function imprimirSupermercados(mercados: Awaited<ReturnType<typeof listarMercados>>) {
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  printWindow('Relatório — Supermercados', `
    <h1>Supermercados Cadastrados</h1>
    <div class="sub">Gerado em ${date} · ${mercados.length} supermercado${mercados.length !== 1 ? 's' : ''}</div>
    <table>
      <tr><th>#</th><th>Nome</th><th>Cidade</th><th>Endereço</th><th>Site</th></tr>
      ${mercados.map((m, i) => `<tr>
        <td style="color:#94a3b8">${i + 1}</td>
        <td><strong>${m.name}</strong></td>
        <td>${m.city ?? '—'}</td>
        <td style="color:#64748b">${m.address ?? '—'}</td>
        <td>${m.websiteUrl ? `<a href="${m.websiteUrl}">${m.websiteUrl}</a>` : '—'}</td>
      </tr>`).join('')}
    </table>`)
}

function imprimirCategorias(
  cats: Awaited<ReturnType<typeof listarCategorias>>,
  prodPorCat: Map<string, number>,
) {
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  printWindow('Relatório — Categorias', `
    <h1>Categorias Cadastradas</h1>
    <div class="sub">Gerado em ${date} · ${cats.length} categoria${cats.length !== 1 ? 's' : ''}</div>
    <table>
      <tr><th>#</th><th>Categoria</th><th class="right">Produtos</th></tr>
      ${cats.map((c, i) => `<tr>
        <td style="color:#94a3b8">${i + 1}</td>
        <td>${c.icon ?? ''} <strong>${c.name}</strong></td>
        <td class="right green">${prodPorCat.get(c.id) ?? 0}</td>
      </tr>`).join('')}
    </table>`)
}

function imprimirProdutos(rows: Row[], titulo: string, subtitulo: string, soPromo: boolean) {
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const grupos = groupByMercCat(rows)
  printWindow(`Relatório — ${titulo}`, `
    <h1>${titulo}</h1>
    <div class="sub">Gerado em ${date}${subtitulo ? ' · ' + subtitulo : ''} · ${rows.length} produto${rows.length !== 1 ? 's' : ''}</div>
    ${grupos.map(g => `
      <h2>${g.name} (${g.total} produto${g.total !== 1 ? 's' : ''})</h2>
      ${g.cats.map(c => `
        <h3>${c.name} — ${c.items.length} item${c.items.length !== 1 ? 's' : ''}</h3>
        <table>
          <tr><th>Produto</th><th>Marca</th><th>Unidade</th><th class="right">Preço</th></tr>
          ${c.items.map(i => {
            const preco = soPromo && i.promoPrice
              ? `<span class="strike">${i.normalPrice ? fmt(i.normalPrice) : ''}</span> <span class="red">${fmt(i.promoPrice!)}</span> <span class="promo-tag">PROMOÇÃO</span>`
              : i.promoPrice
                ? `<span class="strike">${i.normalPrice ? fmt(i.normalPrice) : ''}</span> <span class="red">${fmt(i.promoPrice)}</span> <span class="promo-tag">PROMOÇÃO</span>`
                : `<span class="green">${fmt(i.normalPrice ?? 0)}</span>`
            return `<tr>
              <td><strong>${i.name}</strong></td>
              <td style="color:#64748b">${i.brand ?? '—'}</td>
              <td style="color:#64748b">${i.unit ?? '—'}</td>
              <td class="right">${preco}</td>
            </tr>`
          }).join('')}
        </table>
      `).join('')}
    `).join('')}`)
}

function RelatoriosPage() {
  const [mercFiltro, setMercFiltro] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [soPromo, setSoPromo] = useState(false)
  const [gerando, setGerando] = useState<string | null>(null)

  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })
  const { data: cats = [] } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })

  async function handleGerar(tipo: string) {
    setGerando(tipo)
    try {
      if (tipo === 'supermercados') {
        imprimirSupermercados(mercados)
      } else if (tipo === 'categorias') {
        const rows = await listarProdutosComPrecos({ data: {} })
        const map = new Map<string, number>()
        for (const r of rows) {
          const k = r.categoryId ?? '__sem__'
          map.set(k, (map.get(k) ?? 0) + 1)
        }
        imprimirCategorias(cats, map)
      } else if (tipo === 'geral') {
        const rows = await listarProdutosComPrecos({ data: {} })
        imprimirProdutos(rows, 'Produtos Geral', '', false)
      } else if (tipo === 'filtrado') {
        const rows = await listarProdutosComPrecos({ data: {
          supermarketId: mercFiltro || undefined,
          categoriaId: catFiltro || undefined,
        }})
        const filtered = soPromo ? rows.filter(r => r.promoPrice !== null) : rows
        const mercNome = mercFiltro ? (mercados.find(m => m.id === mercFiltro)?.name ?? '') : 'Todos os supermercados'
        const catNome = catFiltro ? (cats.find(c => c.id === catFiltro)?.name ?? '') : 'Todas as categorias'
        const sub = [mercNome, catNome, soPromo ? 'Só promoções' : ''].filter(Boolean).join(' · ')
        imprimirProdutos(filtered, 'Produtos Filtrado', sub, soPromo)
      }
    } finally {
      setGerando(null)
    }
  }

  const cards = [
    {
      id: 'supermercados',
      icon: Store,
      title: 'Supermercados Cadastrados',
      desc: 'Lista todos os supermercados com endereço e site',
      count: mercados.length,
    },
    {
      id: 'categorias',
      icon: Tag,
      title: 'Categorias Cadastradas',
      desc: 'Lista todas as categorias com contagem de produtos',
      count: cats.length,
    },
    {
      id: 'geral',
      icon: Package,
      title: 'Produtos Geral',
      desc: 'Todos os produtos com preços, organizados por supermercado e categoria',
    },
  ]

  return (
    <div style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Clique em Gerar para abrir o relatório para impressão
          </p>
        </div>
      </div>

      {/* Cards dos relatórios simples */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {cards.map(card => (
          <div key={card.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon size={17} color="var(--color-primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>{card.title}</div>
                {card.count !== undefined && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', marginTop: '0.1rem' }}>
                    {card.count} registro{card.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)', margin: 0, flex: 1, lineHeight: 1.5 }}>
              {card.desc}
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              disabled={gerando === card.id}
              onClick={() => handleGerar(card.id)}
            >
              <Printer size={13} /> {gerando === card.id ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        ))}
      </div>

      {/* Card de produtos com filtros */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SlidersHorizontal size={17} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Produtos com Filtros</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', marginTop: '0.1rem' }}>
              Filtre por supermercado, categoria ou somente promoções
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="input"
            style={{ flex: '1 1 200px' }}
            value={mercFiltro}
            onChange={e => setMercFiltro(e.target.value)}
          >
            <option value="">Todos os supermercados</option>
            {mercados.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            className="input"
            style={{ flex: '1 1 200px' }}
            value={catFiltro}
            onChange={e => setCatFiltro(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={soPromo}
              onChange={e => setSoPromo(e.target.checked)}
              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
            />
            Só promoções
          </label>
          <button
            className="btn btn-primary"
            disabled={gerando === 'filtrado'}
            onClick={() => handleGerar('filtrado')}
          >
            <Printer size={14} /> {gerando === 'filtrado' ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>
    </div>
  )
}
