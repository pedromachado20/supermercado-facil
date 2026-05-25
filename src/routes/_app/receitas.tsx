import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { recipes } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'
import { ChefHat, Plus, Trash2, X, Printer, ChevronDown, ChevronUp, FolderPlus, Check, Pencil } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── Server Functions ──────────────────────────────────────────────────────────

const listarReceitas = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(recipes).orderBy(desc(recipes.createdAt))
})

const criarReceita = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { name: string; instructions: string; category?: string } }) => {
  const [rec] = await db.insert(recipes).values({
    name: data.name,
    instructions: data.instructions || null,
    category: data.category || null,
  }).returning()
  return rec
})

const excluirReceita = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { id: string } }) => {
  await db.delete(recipes).where(eq(recipes.id, data.id))
  return { ok: true }
})

// ── Catálogo padrão ───────────────────────────────────────────────────────────

const CATALOG = [
  { emoji: '🍕', category: 'Massas e Lanches', recipes: ['Pizza caseira', 'Esfiha', 'Hambúrguer artesanal', 'Hot dog completo', 'Pastel', 'Panqueca', 'Lasanha', 'Macarrão ao molho branco', 'Torta salgada de liquidificador'] },
  { emoji: '🍞', category: 'Pães', recipes: ['Pão caseiro simples', 'Pão de leite', 'Pão recheado', 'Pão de alho', 'Bisnaguinha', 'Pão doce', 'Sonho recheado'] },
  { emoji: '🍰', category: 'Bolos', recipes: ['Bolo de chocolate', 'Bolo de cenoura', 'Bolo de fubá', 'Bolo de milho', 'Bolo simples fofinho', 'Bolo de laranja', 'Cupcake'] },
  { emoji: '🍫', category: 'Doces', recipes: ['Brigadeiro', 'Pudim', 'Mousse', 'Brownie', 'Cookies', 'Donuts', 'Beijinho', 'Palha italiana'] },
  { emoji: '🍗', category: 'Almoço/Janta', recipes: ['Arroz soltinho', 'Feijão simples', 'Frango empanado', 'Strogonoff', 'Macarronada', 'Purê de batata', 'Carne assada', 'Batata gratinada'] },
  { emoji: '🥤', category: 'Bebidas', recipes: ['Milkshake', 'Chocolate quente', 'Cappuccino caseiro', 'Vitamina de banana', 'Suco natural'] },
  { emoji: '🔥', category: 'Airfryer', recipes: ['Pizza na airfryer', 'Pão de queijo', 'Batata frita', 'Frango crocante', 'Cookies', 'Bolo simples'] },
  { emoji: '🍔', category: 'Receitas Rápidas', recipes: ['Omelete', 'Miojo melhorado', 'Sanduíche natural', 'Crepioca', 'Tapioca recheada'] },
]

// ── localStorage helpers ──────────────────────────────────────────────────────

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

// ── Categorias personalizadas ─────────────────────────────────────────────────

interface CustomCat { id: string; emoji: string; category: string; recipeNames: string[] }

function useCustomCats() {
  const [cats, setCats] = useState<CustomCat[]>([])
  useEffect(() => { setCats(ls('sf-custom-cats-v1', [])) }, [])

  const add = useCallback((cat: Omit<CustomCat, 'id'>) => {
    setCats(prev => { const next = [...prev, { ...cat, id: `cat_${Math.random().toString(36).slice(2, 10)}` }]; lsSet('sf-custom-cats-v1', next); return next })
  }, [])
  const remove = useCallback((id: string) => {
    setCats(prev => { const next = prev.filter(c => c.id !== id); lsSet('sf-custom-cats-v1', next); return next })
  }, [])
  const addName = useCallback((catId: string, name: string) => {
    setCats(prev => { const next = prev.map(c => c.id === catId ? { ...c, recipeNames: [...c.recipeNames, name] } : c); lsSet('sf-custom-cats-v1', next); return next })
  }, [])

  return { cats, add, remove, addName }
}

// ── Extras para categorias do catálogo ───────────────────────────────────────

function useCatalogExtras() {
  const [extras, setExtras] = useState<Record<string, string[]>>({})
  useEffect(() => { setExtras(ls('sf-catalog-extras-v1', {})) }, [])

  const add = useCallback((cat: string, name: string) => {
    setExtras(prev => { const next = { ...prev, [cat]: [...(prev[cat] ?? []), name] }; lsSet('sf-catalog-extras-v1', next); return next })
  }, [])

  return { extras, add }
}

// ── Renomeações de nomes de receitas no índice ────────────────────────────────

function useRenames() {
  const [renames, setRenames] = useState<Record<string, string>>({})
  useEffect(() => { setRenames(ls('sf-recipe-renames-v1', {})) }, [])

  const rename = useCallback((original: string, newName: string) => {
    setRenames(prev => { const next = { ...prev, [original]: newName }; lsSet('sf-recipe-renames-v1', next); return next })
  }, [])

  return { renames, rename }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

type RecipeItem = { id: string; name: string; instructions: string | null }

function findReg(displayName: string, list: RecipeItem[]) {
  return list.find(r => norm(r.name) === norm(displayName))
}

// ── Impressão ─────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
  body { font-family: Georgia, serif; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
  h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.25rem; color: #16a34a; }
  .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; }
  .receita { page-break-after: always; margin-bottom: 2rem; }
  .receita:last-child { page-break-after: auto; }
  .divider { border: none; border-top: 2px solid #e2e8f0; margin: 2rem 0; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 0.95rem; line-height: 1.8; margin: 0; }
`

function imprimirReceitas(lista: { name: string; instructions: string | null }[]) {
  const win = window.open('', '_blank')
  if (!win) return
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const corpo = lista.map(r => `<div class="receita"><h1>${r.name}</h1><div class="meta">Supermercado Fácil · ${data}</div><pre>${r.instructions ?? ''}</pre></div>`).join('<hr class="divider">')
  win.document.write(`<html><head><title>Receitas</title><style>${PRINT_STYLE}</style></head><body>${corpo}</body></html>`)
  win.document.close(); win.focus(); setTimeout(() => win.print(), 300)
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_app/receitas')({ component: ReceitasPage })

// ── Componente principal ──────────────────────────────────────────────────────

function ReceitasPage() {
  const qc = useQueryClient()
  const { cats: customCats, add: addCat, remove: removeCat, addName: addNameToCat } = useCustomCats()
  const { extras, add: addExtra } = useCatalogExtras()
  const { renames, rename } = useRenames()

  // Modal
  const [modal, setModal] = useState<'novo' | 'ver' | 'categoria' | null>(null)
  const [receitaSelecionada, setReceitaSelecionada] = useState<RecipeItem | null>(null)

  // Form receita
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('')

  // Form nova categoria
  const [catEmoji, setCatEmoji] = useState('🍴')
  const [catNome, setCatNome] = useState('')
  const [catRecipeInput, setCatRecipeInput] = useState('')
  const [catRecipeList, setCatRecipeList] = useState<string[]>([])

  // Adicionar receita a uma categoria (catKey = category name ou cat.id)
  const [addToCatKey, setAddToCatKey] = useState<string | null>(null)
  const [addToCatInput, setAddToCatInput] = useState('')

  // Edição inline de nome no índice (originalName = chave original antes de qualquer rename)
  const [editingRow, setEditingRow] = useState<{ originalName: string } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // Categorias expandidas
  const [expanded, setExpanded] = useState<Set<string>>(new Set(CATALOG.map(c => c.category)))

  // Seleção para impressão
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  const { data: receitas = [], isLoading } = useQuery({ queryKey: ['receitas'], queryFn: () => listarReceitas() })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['receitas'] })

  const criar = useMutation({
    mutationFn: () => criarReceita({ data: { name: nome, instructions: texto, category: categoria || undefined } }),
    onSuccess: () => { invalidate(); setModal(null); setNome(''); setTexto(''); setCategoria('') },
  })
  const excluir = useMutation({ mutationFn: (id: string) => excluirReceita({ data: { id } }), onSuccess: invalidate })

  function abrirNovo(nomePreenchido = '', catPreenchida = '') { setNome(nomePreenchido); setTexto(''); setCategoria(catPreenchida); setModal('novo') }
  function toggleExpand(key: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  function startEdit(originalName: string) {
    setEditingRow({ originalName })
    setEditingValue(renames[originalName] ?? originalName)
  }
  function confirmEdit() {
    if (editingRow && editingValue.trim()) rename(editingRow.originalName, editingValue.trim())
    setEditingRow(null)
  }

  function confirmarAddToCat(catKey: string, isCatalog: boolean) {
    const n = addToCatInput.trim()
    if (!n) return
    if (isCatalog) addExtra(catKey, n)
    else addNameToCat(catKey, n)
    setAddToCatInput(''); setAddToCatKey(null)
  }

  function salvarCategoria() {
    if (!catNome.trim()) return
    addCat({ emoji: catEmoji || '🍴', category: catNome.trim(), recipeNames: catRecipeList })
    setModal(null); setCatEmoji('🍴'); setCatNome(''); setCatRecipeList([]); setCatRecipeInput('')
  }

  // Nome efetivo (após rename) de uma receita no índice
  function dn(original: string) { return renames[original] ?? original }

  // Receitas fora de qualquer categoria
  const allCatNames = new Set([
    ...CATALOG.flatMap(c => [...c.recipes, ...(extras[c.category] ?? [])].map(n => norm(dn(n)))),
    ...customCats.flatMap(c => c.recipeNames.map(n => norm(dn(n)))),
  ])
  const receitasAvulsas = receitas.filter(r => !allCatNames.has(norm(r.name)))
  const cadastradasCount = receitas.filter(r => allCatNames.has(norm(r.name))).length

  // Render de cada linha do índice
  function renderIndexRow(originalName: string, catName = '') {
    const displayName = dn(originalName)
    const reg = findReg(displayName, receitas)
    const isEditing = editingRow?.originalName === originalName

    return (
      <div key={originalName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
        {isEditing ? (
          <>
            <input
              className="input"
              style={{ flex: 1, height: '2rem', fontSize: '0.875rem' }}
              value={editingValue}
              onChange={e => setEditingValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingRow(null) }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={confirmEdit}><Check size={13} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingRow(null)}><X size={13} /></button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>{displayName}</span>
            <button
              className="btn btn-ghost btn-sm"
              title="Renomear"
              style={{ padding: '0.2rem 0.4rem', color: 'var(--color-text-soft)' }}
              onClick={() => startEdit(originalName)}
            >
              <Pencil size={13} />
            </button>
            {reg ? (
              <>
                <span className="badge badge-green" style={{ gap: '0.25rem' }}><Check size={11} /> Cadastrada</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setReceitaSelecionada(reg); setModal('ver') }}>Ver</button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => abrirNovo(displayName, catName)}>
                <Plus size={13} /> Cadastrar
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // Rodapé "adicionar receita" comum a qualquer categoria
  function renderAddRow(catKey: string, isCatalog: boolean) {
    return (
      <div style={{ padding: '0.5rem 1rem' }}>
        {addToCatKey === catKey ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Nome da receita..."
              value={addToCatInput}
              onChange={e => setAddToCatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmarAddToCat(catKey, isCatalog); if (e.key === 'Escape') setAddToCatKey(null) }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={() => confirmarAddToCat(catKey, isCatalog)}><Check size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddToCatKey(null)}><X size={14} /></button>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-soft)' }}
            onClick={() => { setAddToCatKey(catKey); setAddToCatInput('') }}
          >
            <Plus size={14} /> Adicionar receita à categoria
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Cabeçalho */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Receitas</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {cadastradasCount} cadastrada{cadastradasCount !== 1 ? 's' : ''} · {receitas.length} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {selecionadas.size > 0 && (
            <button className="btn btn-secondary" onClick={() => { const l = receitas.filter(r => selecionadas.has(r.id)); if (l.length) imprimirReceitas(l) }}>
              <Printer size={15} /> Imprimir {selecionadas.size}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setModal('categoria')}>
            <FolderPlus size={15} /> Nova categoria
          </button>
          <button className="btn btn-primary" onClick={() => abrirNovo()}>
            <Plus size={16} /> Adicionar outras
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Receitas avulsas */}
          {receitasAvulsas.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                Minhas receitas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {receitasAvulsas.map(r => (
                  <ReceitaRow
                    key={r.id} receita={r} marcada={selecionadas.has(r.id)}
                    onToggle={() => setSelecionadas(prev => { const s = new Set(prev); s.has(r.id) ? s.delete(r.id) : s.add(r.id); return s })}
                    onVer={() => { setReceitaSelecionada(r); setModal('ver') }}
                    onImprimir={() => imprimirReceitas([r])}
                    onExcluir={() => { if (confirm(`Excluir "${r.name}"?`)) excluir.mutate(r.id) }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categorias do catálogo */}
          {CATALOG.map(({ emoji, category, recipes: catRecipes }) => {
            const isExp = expanded.has(category)
            const indexNames = [...catRecipes, ...(extras[category] ?? [])]
            const indexNamesNorm = new Set(indexNames.map(n => norm(dn(n))))
            // Receitas do DB com esta categoria que não aparecem no índice por nome
            const dbExtra = receitas.filter(r => r.category === category && !indexNamesNorm.has(norm(r.name)))
            const regCount = indexNames.filter(n => !!findReg(dn(n), receitas)).length + dbExtra.length
            const total = indexNames.length + dbExtra.length
            return (
              <div key={category} style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <button
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => toggleExpand(category)}
                >
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{category}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {regCount > 0 ? `${regCount}/${total} cadastradas` : `${total} receitas`}
                    </p>
                  </div>
                  {regCount > 0 && <span className="badge badge-green">{regCount}</span>}
                  {isExp ? <ChevronUp size={16} color="var(--color-text-soft)" /> : <ChevronDown size={16} color="var(--color-text-soft)" />}
                </button>
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--color-border)' }}>
                    {indexNames.map(n => renderIndexRow(n, category))}
                    {dbExtra.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ flex: 1, fontSize: '0.9rem' }}>{r.name}</span>
                        <span className="badge badge-green" style={{ gap: '0.25rem' }}><Check size={11} /> Cadastrada</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setReceitaSelecionada(r); setModal('ver') }}>Ver</button>
                      </div>
                    ))}
                    {renderAddRow(category, true)}
                  </div>
                )}
              </div>
            )
          })}

          {/* Categorias personalizadas */}
          {customCats.map(cat => {
            const isExp = expanded.has(cat.id)
            const indexNamesNorm = new Set(cat.recipeNames.map(n => norm(dn(n))))
            const dbExtra = receitas.filter(r => r.category === cat.category && !indexNamesNorm.has(norm(r.name)))
            const regCount = cat.recipeNames.filter(n => !!findReg(dn(n), receitas)).length + dbExtra.length
            const total = cat.recipeNames.length + dbExtra.length
            return (
              <div key={cat.id} style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <button
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => toggleExpand(cat.id)}
                >
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{cat.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.category}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {total === 0 ? 'Nenhuma receita ainda'
                        : regCount > 0 ? `${regCount}/${total} cadastradas`
                        : `${total} receita${total !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {regCount > 0 && <span className="badge badge-green">{regCount}</span>}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)', padding: '0.25rem' }}
                    onClick={e => { e.stopPropagation(); if (confirm(`Excluir categoria "${cat.category}"?`)) removeCat(cat.id) }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExp ? <ChevronUp size={16} color="var(--color-text-soft)" /> : <ChevronDown size={16} color="var(--color-text-soft)" />}
                </button>
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--color-border)' }}>
                    {cat.recipeNames.map(n => renderIndexRow(n, cat.category))}
                    {dbExtra.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ flex: 1, fontSize: '0.9rem' }}>{r.name}</span>
                        <span className="badge badge-green" style={{ gap: '0.25rem' }}><Check size={11} /> Cadastrada</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setReceitaSelecionada(r); setModal('ver') }}>Ver</button>
                      </div>
                    ))}
                    {renderAddRow(cat.id, false)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: ver receita */}
      {modal === 'ver' && receitaSelecionada && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{receitaSelecionada.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => imprimirReceitas([receitaSelecionada])}><Printer size={14} /> Imprimir</button>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Excluir "${receitaSelecionada.name}"?`)) { excluir.mutate(receitaSelecionada.id); setModal(null) } }}><Trash2 size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--color-text)', margin: 0 }}>
                {receitaSelecionada.instructions || 'Sem conteúdo.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nova receita */}
      {modal === 'novo' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Nova receita</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); criar.mutate() }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Nome da receita *</label>
                  <input className="input" placeholder="Ex: Pizza Caseira Fácil" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="label">Categoria</label>
                  <select className="input" value={categoria} onChange={e => setCategoria(e.target.value)}>
                    <option value="">— Sem categoria —</option>
                    {CATALOG.map(c => (
                      <option key={c.category} value={c.category}>{c.emoji} {c.category}</option>
                    ))}
                    {customCats.map(c => (
                      <option key={c.id} value={c.category}>{c.emoji} {c.category}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Receita (cole o texto aqui)</label>
                  <textarea className="input" placeholder="Cole aqui o texto completo da sua receita..." value={texto} onChange={e => setTexto(e.target.value)} rows={14} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.6 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={criar.isPending}>{criar.isPending ? 'Salvando...' : 'Salvar receita'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: nova categoria */}
      {modal === 'categoria' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Nova categoria</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ width: '5rem' }}>
                  <label className="label">Emoji</label>
                  <input className="input" style={{ textAlign: 'center', fontSize: '1.25rem' }} value={catEmoji} onChange={e => setCatEmoji(e.target.value)} maxLength={4} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Nome *</label>
                  <input className="input" placeholder="Ex: Fitness, Festas..." value={catNome} onChange={e => setCatNome(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Receitas (opcional)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input" placeholder="Nome de uma receita..." value={catRecipeInput} onChange={e => setCatRecipeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const n = catRecipeInput.trim(); if (n && !catRecipeList.includes(n)) { setCatRecipeList(p => [...p, n]) } setCatRecipeInput('') } }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const n = catRecipeInput.trim(); if (n && !catRecipeList.includes(n)) setCatRecipeList(p => [...p, n]); setCatRecipeInput('') }}><Plus size={14} /></button>
                </div>
                {catRecipeList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                    {catRecipeList.map(n => (
                      <span key={n} className="badge badge-gray" style={{ gap: '0.375rem' }}>
                        {n}
                        <button onClick={() => setCatRecipeList(p => p.filter(x => x !== n))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCategoria}><Check size={15} /> Criar categoria</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ReceitaRow (receitas avulsas) ─────────────────────────────────────────────

function ReceitaRow({ receita, marcada, onToggle, onVer, onImprimir, onExcluir }: {
  receita: RecipeItem; marcada: boolean
  onToggle: () => void; onVer: () => void; onImprimir: () => void; onExcluir: () => void
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', border: marcada ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: marcada ? 'var(--color-primary-bg)' : '#fff' }}>
      <input type="checkbox" checked={marcada} onChange={onToggle} style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }} onClick={onVer}>
        <ChefHat size={17} color="var(--color-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{receita.name}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" title="Imprimir" onClick={onImprimir}><Printer size={14} /></button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} title="Excluir" onClick={onExcluir}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
