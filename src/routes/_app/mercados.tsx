import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarMercados, criarMercado, atualizarMercado, excluirMercado } from '#/server/functions/mercados'
import { Store, Plus, Pencil, Trash2, Globe, MapPin, X } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_app/mercados')({
  component: MercadosPage,
})

type Mercado = { id: string; name: string; websiteUrl: string | null; address: string | null; city: string | null; logoUrl: string | null; active: boolean }
type Form = { name: string; websiteUrl: string; address: string; city: string }

const FORM_VAZIO: Form = { name: '', websiteUrl: '', address: '', city: '' }

function MercadosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'novo' | Mercado>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [confirmDel, setConfirmDel] = useState<Mercado | null>(null)

  const { data: mercados = [], isLoading } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['mercados'] })

  const criar = useMutation({
    mutationFn: () => criarMercado({ data: form }),
    onSuccess: () => { invalidate(); fecharModal() },
  })
  const atualizar = useMutation({
    mutationFn: (id: string) => atualizarMercado({ data: { id, ...form } }),
    onSuccess: () => { invalidate(); fecharModal() },
  })
  const excluir = useMutation({
    mutationFn: (id: string) => excluirMercado({ data: { id } }),
    onSuccess: () => { invalidate(); setConfirmDel(null) },
  })

  function abrirNovo() { setForm(FORM_VAZIO); setModal('novo') }
  function abrirEditar(m: Mercado) {
    setForm({ name: m.name, websiteUrl: m.websiteUrl ?? '', address: m.address ?? '', city: m.city ?? '' })
    setModal(m)
  }
  function fecharModal() { setModal(null); setForm(FORM_VAZIO) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (modal === 'novo') criar.mutate()
    else if (modal && typeof modal === 'object') atualizar.mutate(modal.id)
  }

  const saving = criar.isPending || atualizar.isPending

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supermercados</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {mercados.length} mercado{mercados.length !== 1 ? 's' : ''} cadastrado{mercados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={16} /> Novo mercado
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : mercados.length === 0 ? (
        <div className="empty-state">
          <Store size={40} color="var(--color-text-soft)" />
          <p style={{ fontWeight: 600 }}>Nenhum mercado cadastrado</p>
          <p style={{ fontSize: '0.875rem' }}>Adicione os supermercados que você frequenta.</p>
          <button className="btn btn-primary" onClick={abrirNovo}><Plus size={16} /> Adicionar mercado</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mercados.map(m => (
            <div key={m.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '3rem', height: '3rem', borderRadius: '0.75rem', flexShrink: 0,
                background: 'var(--color-primary-bg)', border: '1px solid #bbf7d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-primary)',
              }}>
                {m.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{m.name}</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {m.city && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
                      <MapPin size={13} /> {m.city}
                    </span>
                  )}
                  {m.websiteUrl && (
                    <a href={m.websiteUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                      <Globe size={13} /> Site
                    </a>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(m)}><Pencil size={14} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(m)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo/editar */}
      {modal !== null && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
                {modal === 'novo' ? 'Novo supermercado' : `Editar ${(modal as Mercado).name}`}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={fecharModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Nome *</label>
                  <input className="input" placeholder="Ex: Supermercado Mundial" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Cidade</label>
                    <input className="input" placeholder="Ex: Rio de Janeiro" value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="label">Endereço</label>
                    <input className="input" placeholder="Rua, número..." value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Site do mercado</label>
                  <input className="input" type="url" placeholder="https://www.mercado.com.br" value={form.websiteUrl}
                    onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : modal === 'novo' ? 'Cadastrar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <Trash2 size={36} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Excluir {confirmDel.name}?</h3>
              <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>
                Todos os preços vinculados a este mercado também serão excluídos.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => excluir.mutate(confirmDel.id)} disabled={excluir.isPending}>
                {excluir.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
