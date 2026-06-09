import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarMercados } from '#/server/functions/mercados'
import { importarLink, importarArquivo, listarJobs, verificarProvedores, excluirJob } from '#/server/functions/importar'
import { UploadCloud, Link2, Image as ImageIcon, FileText, CheckCircle, XCircle, Clock, AlertCircle, Zap, Trash2, X, Plus } from 'lucide-react'
import { useState, useRef } from 'react'

export const Route = createFileRoute('/_app/importar')({
  component: ImportarPage,
})

type Tipo = 'link' | 'foto' | 'pdf'
type Resultado = { label: string; found?: number; imported?: number; error?: string }

const TIPO_LABEL: Record<Tipo, { label: string; icon: typeof Link2; desc: string }> = {
  link: { label: 'Link do site', icon: Link2, desc: 'URL de uma página do supermercado' },
  foto: { label: 'Foto do encarte', icon: ImageIcon, desc: 'JPG ou PNG de um encarte impresso' },
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
  const [urls, setUrls] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isPromo, setIsPromo] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number; label: string } | null>(null)
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
  const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean)
  const itemCount = tipo === 'link' ? urlList.length : arquivos.length

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
    setArquivos(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const newFiles = Array.from(e.dataTransfer.files)
    setArquivos(prev => [...prev, ...newFiles])
  }

  function removerArquivo(index: number) {
    setArquivos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResultados([])
    setErro('')

    if (!mercadoId) { setErro('Selecione um supermercado.'); return }

    if (tipo === 'link') {
      if (urlList.length === 0) { setErro('Informe ao menos uma URL.'); return }
    } else {
      if (arquivos.length === 0) { setErro('Selecione ao menos um arquivo.'); return }
      for (const f of arquivos) {
        if (f.type === 'application/pdf' && f.size > 15 * 1024 * 1024) {
          setErro(`"${f.name}" é muito grande (${(f.size / 1024 / 1024).toFixed(1)} MB). PDFs devem ter até 15 MB — divida em partes menores.`)
          return
        }
        if (f.size > 20 * 1024 * 1024) {
          setErro(`"${f.name}" é muito grande. Máximo 20 MB por arquivo.`)
          return
        }
      }
    }

    setLoading(true)
    const novosResultados: Resultado[] = []
    const items = tipo === 'link' ? urlList : arquivos

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const label = tipo === 'link' ? (item as string) : (item as File).name
      setProgresso({ atual: i + 1, total: items.length, label })

      try {
        if (tipo === 'link') {
          const res = await importarLink({
            data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, url: item as string, isPromo },
          })
          novosResultados.push({ label, found: res.found, imported: res.imported })
        } else {
          const { base64, mimeType } = await comprimirArquivo(item as File)
          const res = await importarArquivo({
            data: { supermarketId: mercadoId, supermarketName: mercadoSelecionado!.name, base64, mimeType, isPromo },
          })
          if (res) novosResultados.push({ label, found: res.found, imported: res.imported })
        }
      } catch (err: any) {
        novosResultados.push({ label, error: err.message || 'Erro ao processar' })
      }

      setResultados([...novosResultados])
    }

    setLoading(false)
    setProgresso(null)
    qc.invalidateQueries({ queryKey: ['jobs', 'produtos'] })
  }

  const totalImportados = resultados.reduce((acc, r) => acc + (r.imported ?? 0), 0)
  const totalEncontrados = resultados.reduce((acc, r) => acc + (r.found ?? 0), 0)
  const temErros = resultados.some(r => r.error)

  function labelProgresso(label: string) {
    return label.length > 35 ? label.slice(0, 35) + '…' : label
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

      {provedores && <ProvedoresStatus provedores={provedores} />}

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
                  onClick={() => { setTipo(key); setArquivos([]); setUrls(''); setResultados([]); setErro('') }}
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

          {/* Links */}
          {tipo === 'link' && (
            <div className="form-group">
              <label className="label">URLs das páginas de produtos</label>
              <textarea
                className="input"
                placeholder={'https://www.supermercado.com.br/acougue\nhttps://www.supermercado.com.br/bebidas\nhttps://www.supermercado.com.br/limpeza'}
                value={urls}
                onChange={e => setUrls(e.target.value)}
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.7' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)', marginTop: '0.375rem' }}>
                {urlList.length > 0
                  ? `${urlList.length} URL${urlList.length > 1 ? 's' : ''} detectada${urlList.length > 1 ? 's' : ''} — processadas em sequência`
                  : provedores?.playwright
                    ? '✓ Playwright ativo — renderiza JavaScript · uma URL por linha'
                    : 'Uma URL por linha · use links de categorias específicas para melhores resultados'}
              </p>
            </div>
          )}

          {/* Arquivos */}
          {(tipo === 'foto' || tipo === 'pdf') && (
            <div className="form-group">
              <label className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{tipo === 'foto' ? 'Fotos do encarte' : 'PDFs do encarte'}</span>
                {arquivos.length > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-soft)', fontSize: '0.8125rem' }}>
                    {arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''}
                  </span>
                )}
              </label>

              {arquivos.length > 0 && (
                <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {arquivos.map((f, i) => {
                    const mb = f.size / 1024 / 1024
                    const warn = (f.type === 'application/pdf' && mb > 15) || mb > 20
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.45rem 0.75rem', borderRadius: '0.5rem',
                        background: warn ? '#fffbeb' : '#f9fafb',
                        border: `1px solid ${warn ? '#fde68a' : 'var(--color-border)'}`,
                        fontSize: '0.8375rem',
                      }}>
                        <FileText size={13} color={warn ? '#d97706' : 'var(--color-text-soft)'} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ color: warn ? '#d97706' : 'var(--color-text-soft)', flexShrink: 0, fontSize: '0.8rem' }}>
                          {mb.toFixed(2)} MB{warn ? ' ⚠' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removerArquivo(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-soft)', padding: '0.1rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div
                className="upload-zone"
                style={{ padding: arquivos.length > 0 ? '0.7rem' : undefined }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  ref={fileRef} type="file" style={{ display: 'none' }}
                  multiple
                  accept={tipo === 'foto' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png'}
                  onChange={handleFile}
                />
                {arquivos.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-text-soft)', fontSize: '0.875rem' }}>
                    <Plus size={15} /> Adicionar mais arquivos
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={28} color="var(--color-text-soft)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Arraste ou clique para selecionar</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)' }}>
                      {tipo === 'foto' ? 'JPG, PNG ou WebP · máx. 20 MB por foto' : 'PDF · máx. 15 MB por arquivo'}
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

          {/* Resultados por item */}
          {resultados.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {resultados.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                  background: r.error ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${r.error ? '#fecaca' : '#86efac'}`,
                  fontSize: '0.8375rem',
                }}>
                  {r.error
                    ? <XCircle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                    : <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-soft)' }}>
                    {r.label}
                  </span>
                  <span style={{ color: r.error ? '#dc2626' : '#15803d', fontWeight: 600, flexShrink: 0 }}>
                    {r.error ? r.error : `${r.found} encontrados · ${r.imported} importados`}
                  </span>
                </div>
              ))}
              {resultados.length > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
                  background: temErros ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${temErros ? '#fde68a' : '#86efac'}`,
                  fontSize: '0.875rem', fontWeight: 700,
                  color: temErros ? '#92400e' : '#15803d',
                }}>
                  <span>Total</span>
                  <span>
                    {totalEncontrados} encontrados · {totalImportados} importados
                    {temErros && ' · com erros'}
                  </span>
                </div>
              )}
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
            {loading && progresso ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                {`Processando ${labelProgresso(progresso.label)} (${progresso.atual} de ${progresso.total})`}
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                {itemCount > 0
                  ? `Importar ${itemCount} ${tipo === 'link'
                    ? (itemCount === 1 ? 'link' : 'links')
                    : (itemCount === 1 ? 'arquivo' : 'arquivos')}`
                  : 'Importar agora'}
              </>
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
    const img = new window.Image()
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
