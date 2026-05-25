import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarCategorias, criarCategoria, atualizarCategoria, excluirCategoria } from '#/server/functions/categorias'
import { Tag, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_app/categorias')({
  component: CategoriasPage,
})

const CATEGORIAS_PADRAO = [
  { name: 'Açougue', slug: 'acougue', icon: '🥩', color: '#ef4444' },
  { name: 'Aves e Ovos', slug: 'aves-ovos', icon: '🐔', color: '#f97316' },
  { name: 'Bebidas Alcoólicas', slug: 'bebidas-alcoolicas', icon: '🍺', color: '#eab308' },
  { name: 'Bebidas não Alcoólicas', slug: 'bebidas-nao-alcoolicas', icon: '🥤', color: '#06b6d4' },
  { name: 'Biscoitos e Chocolates', slug: 'biscoitos-chocolates', icon: '🍪', color: '#a78bfa' },
  { name: 'Congelados', slug: 'congelados', icon: '🧊', color: '#60a5fa' },
  { name: 'Frios e Laticínios', slug: 'frios-laticinios', icon: '🧀', color: '#fbbf24' },
  { name: 'Frutas e Verduras', slug: 'frutas-verduras', icon: '🥦', color: '#22c55e' },
  { name: 'Grãos, Cereais e Massas', slug: 'graos-cereais-massas', icon: '🌾', color: '#d97706' },
  { name: 'Higiene e Beleza', slug: 'higiene-beleza', icon: '🧴', color: '#ec4899' },
  { name: 'Limpeza', slug: 'limpeza', icon: '🧹', color: '#14b8a6' },
  { name: 'Mercearia', slug: 'mercearia', icon: '🥫', color: '#8b5cf6' },
  { name: 'Padaria e Confeitaria', slug: 'padaria-confeitaria', icon: '🍞', color: '#f59e0b' },
  { name: 'Pescados', slug: 'pescados', icon: '🐟', color: '#0ea5e9' },
  { name: 'Sucos e Águas', slug: 'sucos-aguas', icon: '🧃', color: '#10b981' },
]

type Cat = { id: string; name: string; slug: string; icon: string | null; color: string | null; sortOrder: number | null }
type Form = { name: string; slug: string; icon: string; color: string }

function CategoriasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'novo' | Cat>(null)
  const [form, setForm] = useState<Form>({ name: '', slug: '', icon: '', color: '#16a34a' })
  const [confirmDel, setConfirmDel] = useState<Cat | null>(null)
  const [importando, setImportando] = useState(false)

  const { data: cats = [], isLoading } = useQuery({ queryKey: ['categorias'], queryFn: () => listarCategorias() })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categorias'] })

  const criar = useMutation({ mutationFn: () => criarCategoria({ data: { ...form, sortOrder: cats.length } }), onSuccess: () => { invalidate(); fecharModal() } })
  const atualizar = useMutation({ mutationFn: (id: string) => atualizarCategoria({ data: { id, ...form } }), onSuccess: () => { invalidate(); fecharModal() } })
  const excluir = useMutation({ mutationFn: (id: string) => excluirCategoria({ data: { id } }), onSuccess: () => { invalidate(); setConfirmDel(null) } })

  function gerarSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function abrirNovo() { setForm({ name: '', slug: '', icon: '🏷️', color: '#16a34a' }); setModal('novo') }
  function abrirEditar(c: Cat) { setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', color: c.color ?? '#16a34a' }); setModal(c) }
  function fecharModal() { setModal(null) }

  async function importarPadrao() {
    setImportando(true)
    for (const c of CATEGORIAS_PADRAO) {
      const existe = cats.find(x => x.slug === c.slug)
      if (!existe) await criarCategoria({ data: { ...c, sortOrder: cats.length } })
    }
    invalidate()
    setImportando(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (modal === 'novo') criar.mutate()
    else if (modal && typeof modal === 'object') atualizar.mutate(modal.id)
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Categorias normalizadas — produtos de qualquer mercado são mapeados aqui
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {cats.length === 0 && (
            <button className="btn btn-secondary" onClick={importarPadrao} disabled={importando}>
              {importando ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : '⚡ Importar padrão'}
            </button>
          )}
          <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Nova categoria</button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : cats.length === 0 ? (
        <div className="empty-state">
          <Tag size={40} color="var(--color-text-soft)" />
          <p style={{ fontWeight: 600 }}>Nenhuma categoria cadastrada</p>
          <p style={{ fontSize: '0.875rem' }}>Use "Importar padrão" para adicionar as 15 categorias mais comuns.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {cats.map(c => (
            <div key={c.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', flexShrink: 0,
                background: (c.color ?? '#16a34a') + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                {c.icon ?? '🏷️'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>{c.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}><Pencil size={13} /></button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDel(c)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{modal === 'novo' ? 'Nova categoria' : 'Editar categoria'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={fecharModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Ícone (emoji)</label>
                    <input className="input" placeholder="🏷️" value={form.icon}
                      onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Cor</label>
                    <input type="color" className="input" style={{ padding: '0.25rem', height: '2.35rem' }}
                      value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Nome *</label>
                  <input className="input" placeholder="Ex: Açougue" value={form.name} required
                    onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: gerarSlug(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="label">Slug (identificador)</label>
                  <input className="input" placeholder="acougue" value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={criar.isPending || atualizar.isPending}>
                  {modal === 'novo' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Excluir "{confirmDel.name}"?</h3>
              <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>Os produtos vinculados perderão esta categoria.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => excluir.mutate(confirmDel.id)} disabled={excluir.isPending}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
