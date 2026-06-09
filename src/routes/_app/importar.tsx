import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { importarLink, importarArquivo, listarJobs, verificarProvedores, excluirJob } from '#/server/functions/importar'
import { UploadCloud, Link2, Image, FileText, CheckCircle, XCircle, Clock, AlertCircle, Zap, Trash2 } from 'lucide-react'
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
    failed:    { class: 'badge-red',   icon: XCircle,     label: 'Erro' },
    running:   { class: 'badge-blue',  icon: Clock,       label: 'Processando' },
    pending:   { class: 'badge-gray',  icon: Clock,       label: 'Aguardando' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className={`badge ${s.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <s.icon size={11} /> {s.label}
    </span>
  )
}

function ProvedoresStatus({ provedores }: { provedores: { gemini: boolean; claude: boolean; playwright: boolean } }) {
  const nenhum = !provedores.gemini && !provedores.claude

  if (nenhum) {
    return (
      <div style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
            Nenhuma chave de IA configurada
          </div>
          <div style={{ fontSize: '0.8375rem', color: '#b91c1c', lineHeight: '1.6' }}>
            Configure ao menos uma opção no <code style={{ background: '#fee2e2', padding: '0 4px', borderRadius: 3 }}>.env</code> e reinicie o servidor:
            <br />
            <strong>Gratuito:</strong> <code style={{ background: '#fee2e2', padding: '0 4px', borderRadius: 3 }}>GOOGLE_AI_API_KEY</code> — obtenha em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#dc2626' }}>aistudio.google.com</a>
            <br />
            <strong>Pago:</strong> <code style={{ background: '#fee2e2', padding: '0 4px', borderRadius: 3 }}>ANTHROPIC_API_KEY</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0.875rem 1.125rem', borderRadius: '0.75rem', background: '#f0fdf4', border: '1px solid #86efac', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 700, fontSize: '0.875rem' }}>
        <Zap size={15} /> IA pronta
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <ProviderChip label="Gemini Flash" active={provedores.gemini} badge="gratuito" />
        <ProviderChip label="Claude"       active={provedores.claude} badge="pago" />
        <ProviderChip label="Playwright"   active={provedores.playwright} badge="JS rendering" />
      </div>
    </div>
  )
}

function ProviderChip({ label, active, badge }: { label: string; active: boolean; badge: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
      background: active ? '#dcfce7' : '#f3f4f6',
      color: active ? '#15803d' : '#9ca3af',
      border: `1px solid ${active ? '#86efac' : '#e5e7eb'}`,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#16a34a' : '#d1d5db', flexShrink: 0 }} />
      {label}
      <span style={{ opacity: 0.7, fontWeight: 400 }}>· {badge}</span>
    </span>
  )
}

function ImportarPage() {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<Tipo>('link')
  const [mercadoId, setMercadoId] = useState('')
  const [url, setUrl] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [isPromo, setIsPromo] = useState(false)
  const [resultado, setResultado] = useState<{ found: number; imported: number } | null>(null)
  const [erro, setErro] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: mercados = [] } = useQuery({ queryKey: ['mercados'], queryFn: () => listarMercados() })
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => listarJobs(), refetchInterval: 3000 })
  const { data: provedores } = useQuery({ queryKey: ['provedores'], queryFn: () => verificarProvedores(), staleTime: 30000 })

  const deletarJob = useMutation({
    mutationFn: (id: string) => excluirJob({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const mercadoSelecionado = mercados.find(m => m.id === mercadoId)
  const iaDisponivel = provedores ? (provedores.gemini || provedores.claude) : false

  const importLink = useMutation({
    mutationFn: () => importarLink({ data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, url, isPromo } }),
    onSuccess: (res) => { setResultado({ found: res.found, imported: res.imported }); qc.invalidateQueries({ queryKey: ['jobs', 'produtos'] }) },
    onError: (e: any) => setErro(e.message || 'Erro ao importar'),
  })

  const importImg = useMutation({
    mutationFn: async () => {
      if (!arquivo) return
      const { base64, mimeType } = await comprimirArquivo(arquivo)
      return importarArquivo({ data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, base64, mimeType, isPromo } })
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
      if (arquivo.size > 20 * 1024 * 1024) { setErro('Arquivo muito grande. Máximo 20 MB.'); return }
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

      {/* Status dos provedores */}
      {provedores && <ProvedoresStatus provedores={provedores} />}

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
                    padding: '0.875rem', borderRadius: '0.625rem', cursor: 'pointer',
                    textAlign: 'center', transition: 'all 0.15s',
                    border: `2px solid ${tipo === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: tipo === key ? 'var(--color-primary-bg)' : '#fff',
                  }}
                >
                  <val.icon size={20} color={tipo === key ? 'var(--color-primary)' : 'var(--color-text-soft)'} style={{ margin: '0 auto 0.375rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: tipo === key ? 'var(--color-primary)' : 'var(--color-text)' }}>{val.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', marginTop: '0.125rem' }}>{val.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input por tipo */}
          {tipo === 'link' && (
            <div className="form-group">
              <label className="label">URL da página de produtos</label>
              <input
                className="input" type="url"
                placeholder="https://www.supermercado.com.br/departamentos/acougue"
                value={url} onChange={e => setUrl(e.target.value)}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)', marginTop: '0.375rem' }}>
                {provedores?.playwright
                  ? '✓ Playwright ativo — renderiza JavaScript para capturar produtos carregados dinamicamente'
                  : 'Dica: use links de categorias específicas para resultados mais precisos'}
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                      {arquivo.size > 15 * 1024 * 1024 && <span style={{ color: '#d97706', marginLeft: '0.5rem' }}>⚠ arquivo grande, pode demorar</span>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={28} color="var(--color-text-soft)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Arraste ou clique para selecionar</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {tipo === 'foto' ? 'JPG, PNG ou WebP · máx. 20 MB' : 'PDF ou imagem · máx. 20 MB'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggle promoção */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
            padding: '0.875rem 1rem', borderRadius: '0.625rem',
            border: `2px solid ${isPromo ? '#f97316' : 'var(--color-border)'}`,
            background: isPromo ? '#fff7ed' : 'var(--color-surface)',
            transition: 'all 0.15s',
          }}>
            <input
              type="checkbox"
              checked={isPromo}
              onChange={e => setIsPromo(e.target.checked)}
              style={{ width: '1.1rem', height: '1.1rem', accentColor: '#f97316', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isPromo ? '#c2410c' : 'var(--color-text)' }}>
                🏷️ Este encarte contém preços promocionais
              </div>
              <div style={{ fontSize: '0.8rem', color: isPromo ? '#ea580c' : 'var(--color-text-soft)', marginTop: '0.125rem' }}>
                {isPromo
                  ? 'Os preços serão marcados como PROMOÇÃO e exibidos junto ao preço normal'
                  : 'Marque se os preços são de uma promoção ou encarte especial'}
              </div>
            </div>
          </label>

          {/* Resultado */}
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

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}
            disabled={loading || mercados.length === 0 || !iaDisponivel}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                {provedores?.gemini ? 'Gemini está extraindo os produtos...' : 'Claude está extraindo os produtos...'}
              </>
            ) : (
              <><UploadCloud size={16} /> Importar agora</>
            )}
          </button>
        </form>
      </div>

      {/* Histórico */}
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
                  <th style={{ width: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td><span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>{j.sourceType}</span></td>
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
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)' }}
                        disabled={deletarJob.isPending}
                        onClick={() => deletarJob.mutate(j.id)}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
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

async function comprimirArquivo(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    const reader = new FileReader()
    const base64 = await new Promise<string>((res, rej) => {
      reader.onload = e => res((e.target?.result as string).split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(file)
    })
    return { base64, mimeType: 'application/pdf' }
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 1920
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}
