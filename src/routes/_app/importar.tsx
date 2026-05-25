import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { importarLink, importarImagem, listarJobs } from '#/server/functions/importar'
import { UploadCloud, Link2, Image, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'

export const Route = createFileRoute('/_app/importar')({
  component: ImportarPage,
})

type Tipo = 'link' | 'foto' | 'pdf'

const TIPO_LABEL: Record<Tipo, { label: string; icon: typeof Link2; desc: string }> = {
  link: { label: 'Link do site', icon: Link2, desc: 'URL de uma página do supermercado' },
  foto: { label: 'Foto do encarte', icon: Image, desc: 'JPG ou PNG de um encarte impresso' },
  pdf:  { label: 'PDF do encarte', icon: FileText, desc: 'Encarte digital em PDF' },
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { class: string; icon: typeof CheckCircle; label: string }> = {
    completed: { class: 'badge-green', icon: CheckCircle, label: 'Concluído' },
    failed: { class: 'badge-red', icon: XCircle, label: 'Erro' },
    running: { class: 'badge-blue', icon: Clock, label: 'Processando' },
    pending: { class: 'badge-gray', icon: Clock, label: 'Aguardando' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className={`badge ${s.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <s.icon size={11} /> {s.label}
    </span>
  )
}

function ImportarPage() {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<Tipo>('link')
  const [mercadoId, setMercadoId] = useState('')
  const [url, setUrl] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<{ found: number; imported: number } | null>(null)
  const [erro, setErro] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => listarJobs(), refetchInterval: 3000 })

  const mercadoSelecionado = mercados.find(m => m.id === mercadoId)

  const importLink = useMutation({
    mutationFn: () => importarLink({ data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, url } }),
    onSuccess: (res) => { setResultado({ found: res.found, imported: res.imported }); qc.invalidateQueries({ queryKey: ['jobs', 'produtos'] }) },
    onError: (e: any) => setErro(e.message || 'Erro ao importar'),
  })

  const importImg = useMutation({
    mutationFn: async () => {
      if (!arquivo) return
      const reader = new FileReader()
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = e => {
          const result = e.target?.result as string
          res(result.split(',')[1])
        }
        reader.onerror = rej
        reader.readAsDataURL(arquivo)
      })
      return importarImagem({ data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, base64, mimeType: arquivo.type } })
    },
    onSuccess: (res) => {
      if (res) setResultado({ found: res.found, imported: res.imported })
      qc.invalidateQueries({ queryKey: ['jobs', 'produtos'] })
    },
    onError: (e: any) => setErro(e.message || 'Erro ao importar'),
  })

  const loading = importLink.isPending || importImg.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResultado(null)
    setErro('')
    if (!mercadoId) { setErro('Selecione um supermercado.'); return }
    if (tipo === 'link') {
      if (!url) { setErro('Informe a URL.'); return }
      importLink.mutate()
    } else {
      if (!arquivo) { setErro('Selecione um arquivo.'); return }
      importImg.mutate()
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArquivo(f)
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Importar Dados</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            A IA extrai automaticamente todos os produtos e preços
          </p>
        </div>
      </div>

      {/* Aviso: chave IA pendente */}
      <div style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
            Importação por IA temporariamente indisponível
          </div>
          <div style={{ fontSize: '0.8375rem', color: '#b45309', lineHeight: '1.5' }}>
            A chave <code style={{ background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>ANTHROPIC_API_KEY</code> ainda não foi configurada no <code style={{ background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>.env</code>.
            Assim que você fornecer a chave, basta adicioná-la e reiniciar o servidor — tudo funcionará normalmente.
          </div>
        </div>
      </div>

      {/* Formulário de importação */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Selecionar mercado */}
          <div className="form-group">
            <label className="label">Supermercado *</label>
            {mercados.length === 0 ? (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.875rem', color: '#92400e' }}>
                ⚠️ Cadastre pelo menos um supermercado antes de importar.
              </div>
            ) : (
              <select className="input" value={mercadoId} onChange={e => setMercadoId(e.target.value)} required>
                <option value="">Selecionar supermercado...</option>
                {mercados.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>

          {/* Tipo de importação */}
          <div>
            <label className="label">Tipo de importação *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {(Object.entries(TIPO_LABEL) as [Tipo, typeof TIPO_LABEL[Tipo]][]).map(([key, val]) => (
                <button
                  key={key} type="button"
                  onClick={() => { setTipo(key); setArquivo(null); setUrl('') }}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.625rem',
                    border: `2px solid ${tipo === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: tipo === key ? 'var(--color-primary-bg)' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <val.icon size={20} color={tipo === key ? 'var(--color-primary)' : 'var(--color-text-soft)'} style={{ margin: '0 auto 0.375rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: tipo === key ? 'var(--color-primary)' : 'var(--color-text)' }}>{val.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', marginTop: '0.125rem' }}>{val.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input de acordo com o tipo */}
          {tipo === 'link' && (
            <div className="form-group">
              <label className="label">URL da página de produtos</label>
              <input
                className="input" type="url"
                placeholder="https://www.supermercado.com.br/departamentos/acougue"
                value={url} onChange={e => setUrl(e.target.value)}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)', marginTop: '0.375rem' }}>
                Dica: use links de categorias específicas para resultados mais precisos
              </p>
            </div>
          )}

          {(tipo === 'foto' || tipo === 'pdf') && (
            <div className="form-group">
              <label className="label">{tipo === 'foto' ? 'Foto do encarte' : 'PDF do encarte'}</label>
              <div
                className={`upload-zone${arquivo ? ' dragover' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setArquivo(f) }}
              >
                <input
                  ref={fileRef} type="file" style={{ display: 'none' }}
                  accept={tipo === 'foto' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png'}
                  onChange={handleFile}
                />
                {arquivo ? (
                  <div>
                    <CheckCircle size={28} color="var(--color-primary)" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{arquivo.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={28} color="var(--color-text-soft)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      Arraste ou clique para selecionar
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {tipo === 'foto' ? 'JPG, PNG ou WebP' : 'PDF ou imagem'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resultado / Erro */}
          {resultado && (
            <div style={{ padding: '1rem', borderRadius: '0.625rem', background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.25rem' }}>
                <CheckCircle size={18} /> Importação concluída!
              </div>
              <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                {resultado.found} produtos encontrados · {resultado.imported} cadastrados no banco
              </div>
            </div>
          )}

          {erro && (
            <div style={{ padding: '0.875rem', borderRadius: '0.625rem', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertCircle size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-danger)' }}>{erro}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={loading || mercados.length === 0}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                A IA está extraindo os produtos...
              </>
            ) : (
              <><UploadCloud size={16} /> Importar agora</>
            )}
          </button>
        </form>
      </div>

      {/* Histórico de importações */}
      {jobs.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem' }}>Histórico de importações</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Produtos</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>
                      <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{j.sourceType}</span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {j.sourceUrl ?? '(arquivo)'}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {j.status === 'completed' ? `${j.productsImported} / ${j.productsFound}` : '—'}
                    </td>
                    <td><StatusBadge status={j.status} /></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft)' }}>
                      {new Date(j.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
