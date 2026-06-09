import { createFileRoute } from '@tanstack/react-router'
import { Printer, BookOpen, Info, Lightbulb, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/_app/manual')({
  component: ManualPage,
})

const s = {
  chapterCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.875rem',
    overflow: 'hidden',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  chapterHeader: (color = 'var(--color-primary)') => ({
    background: color,
    color: 'white',
    padding: '0.875rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  } as React.CSSProperties),
  chapterNum: {
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.9375rem',
    flexShrink: 0,
  } as React.CSSProperties,
  chapterTitle: {
    fontWeight: 700,
    fontSize: '1.0625rem',
    margin: 0,
  } as React.CSSProperties,
  body: {
    padding: '1.5rem',
  } as React.CSSProperties,
  h3: {
    fontWeight: 700,
    fontSize: '0.9375rem',
    marginBottom: '0.75rem',
    marginTop: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--color-primary)',
  } as React.CSSProperties,
  ol: {
    paddingLeft: '1.5rem',
    margin: '0.5rem 0',
    lineHeight: 1.75,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  ul: {
    paddingLeft: '1.5rem',
    margin: '0.5rem 0',
    lineHeight: 1.75,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  tip: {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '0.5rem',
    padding: '0.875rem 1rem',
    marginTop: '0.875rem',
    display: 'flex',
    gap: '0.625rem',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  } as React.CSSProperties,
  example: {
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '0.5rem',
    padding: '0.875rem 1rem',
    marginTop: '0.875rem',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  } as React.CSSProperties,
  warn: {
    background: 'rgba(251,146,60,0.1)',
    border: '1px solid rgba(251,146,60,0.25)',
    borderRadius: '0.5rem',
    padding: '0.875rem 1rem',
    marginTop: '0.875rem',
    display: 'flex',
    gap: '0.625rem',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: '1px solid var(--color-border)',
    margin: '1rem 0',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    background: color,
    color: 'white',
    borderRadius: '0.25rem',
    padding: '0.1rem 0.4rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    verticalAlign: 'middle',
    margin: '0 0.2rem',
  } as React.CSSProperties),
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  } as React.CSSProperties,
  th: {
    background: 'var(--color-primary-bg)',
    color: 'var(--color-primary)',
    fontWeight: 700,
    padding: '0.5rem 0.75rem',
    textAlign: 'left' as const,
    border: '1px solid var(--color-border)',
  } as React.CSSProperties,
  td: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border)',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,
  p: {
    margin: '0.625rem 0',
    lineHeight: 1.7,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={s.tip}>
      <Lightbulb size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
      <span>{children}</span>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div style={s.warn}>
      <AlertTriangle size={16} color="#f97316" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
      <span>{children}</span>
    </div>
  )
}

function Example({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={s.example}>
      {title && <strong style={{ display: 'block', marginBottom: '0.25rem' }}>📋 {title}</strong>}
      {children}
    </div>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={s.h3}><ChevronRight size={15} />{children}</h3>
}

export default function ManualPage() {
  return (
    <>
      <style>{`
        @media print {
          #sidebar-desktop, aside, header#mobile-topbar, .print-hide {
            display: none !important;
          }
          main {
            padding: 0.5rem 1rem !important;
            overflow: visible !important;
          }
          body, html { background: white !important; }
          .manual-wrapper { max-width: 100% !important; }
          .manual-chapter { break-inside: avoid; }
          .manual-chapter + .manual-chapter { margin-top: 1rem !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="manual-wrapper" style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '4rem' }}>

        {/* ── Cabeçalho ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <BookOpen size={26} color="var(--color-primary)" />
              <h1 style={{ fontSize: '1.625rem', fontWeight: 800, margin: 0 }}>Manual do Usuário</h1>
            </div>
            <p style={{ color: 'var(--color-text-soft)', margin: 0, fontSize: '0.9375rem' }}>
              Guia completo do Supermercado Fácil — aprenda tudo do zero, passo a passo
            </p>
          </div>
          <button
            className="btn btn-primary print-hide"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
          >
            <Printer size={16} />
            Imprimir / Salvar PDF
          </button>
        </div>

        {/* ── Sumário ── */}
        <div style={{ ...s.chapterCard, marginBottom: '2rem' }} className="print-hide">
          <div style={{ ...s.chapterHeader(), padding: '0.75rem 1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>📋 Sumário — Clique para ir direto ao capítulo</span>
          </div>
          <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.25rem 2rem' }}>
            {[
              ['cap1', '1. Bem-vindo ao Supermercado Fácil'],
              ['cap2', '2. Como Entrar no Sistema (Login)'],
              ['cap3', '3. A Tela Principal (Dashboard)'],
              ['cap4', '4. Supermercados'],
              ['cap5', '5. Categorias'],
              ['cap6', '6. Produtos e Preços'],
              ['cap7', '7. Importar Dados com IA'],
              ['cap8', '8. Lista de Compras'],
              ['cap9', '9. Receitas'],
              ['cap10', '10. Relatórios'],
              ['cap11', '11. Imprimir / Salvar PDF'],
              ['capDicas', '✨ Dicas Finais'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`}
                style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.875rem', padding: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ChevronRight size={12} />{label}
              </a>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 1 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap1" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader()}>
            <div style={s.chapterNum}>1</div>
            <h2 style={s.chapterTitle}>Bem-vindo ao Supermercado Fácil</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              O <strong>Supermercado Fácil</strong> é um programa que funciona pelo navegador de internet
              (o mesmo que você usa para ver vídeos ou acessar redes sociais). Ele foi criado para te ajudar a:
            </p>
            <ul style={s.ul}>
              <li>📊 <strong>Comparar preços</strong> de produtos em diferentes supermercados</li>
              <li>🛒 <strong>Montar sua lista de compras</strong> de forma organizada</li>
              <li>💰 <strong>Economizar dinheiro</strong> sabendo onde está mais barato</li>
              <li>📷 <strong>Importar preços automaticamente</strong> usando Inteligência Artificial</li>
              <li>👨‍🍳 <strong>Guardar suas receitas</strong> favoritas com os ingredientes</li>
            </ul>

            <Tip>
              Pense no Supermercado Fácil como um <strong>caderninho de preços digital</strong> —
              mas que faz cálculos, compara mercados e ainda aprende sozinho com fotos de encartes!
            </Tip>

            <H3>O que você precisa para usar</H3>
            <ul style={s.ul}>
              <li>Um computador, notebook, tablet ou celular com acesso à internet</li>
              <li>Um navegador de internet (Chrome, Firefox, Edge ou Safari)</li>
              <li>Uma conta no sistema (e-mail + senha, ou conta Google/Gmail)</li>
            </ul>

            <H3>O sistema fica salvo automaticamente</H3>
            <p style={s.p}>
              Tudo que você digitar ou cadastrar é salvo automaticamente na nuvem (na internet).
              Isso significa que você pode fechar o programa e abrir de novo sem perder nada.
              Pode usar no celular e no computador — os dados são os mesmos!
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 2 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap2" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#4f46e5')}>
            <div style={s.chapterNum}>2</div>
            <h2 style={s.chapterTitle}>Como Entrar no Sistema (Login)</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Para usar o sistema, você precisa <strong>"fazer login"</strong> — ou seja, identificar quem você é.
              É como digitar sua senha no banco: só você acessa seus dados.
            </p>

            <H3>Opção A — Entrar com E-mail e Senha</H3>
            <ol style={s.ol}>
              <li>Abra o sistema no navegador</li>
              <li>Você verá a tela de <strong>Login</strong> com dois campos em branco</li>
              <li>No campo <strong>"E-mail"</strong>, digite seu endereço de e-mail
                <br /><span style={{ color: 'var(--color-text-soft)', fontSize: '0.85rem' }}>Exemplo: <code>meunome@gmail.com</code></span>
              </li>
              <li>No campo <strong>"Senha"</strong>, digite sua senha
                <br /><span style={{ color: 'var(--color-text-soft)', fontSize: '0.85rem' }}>Os caracteres ficam ocultos com "●●●●" — isso é normal, é para sua segurança!</span>
              </li>
              <li>Clique no botão verde <strong>"Entrar"</strong></li>
            </ol>

            <Example title="Resultado esperado">
              Ao entrar com sucesso, o sistema abre a tela principal (Dashboard) automaticamente.
              Se aparecer mensagem de erro, verifique se o e-mail e a senha estão corretos —
              letras maiúsculas e minúsculas fazem diferença!
            </Example>

            <div style={s.hr} />

            <H3>Opção B — Entrar com Google (mais fácil!)</H3>
            <p style={s.p}>Se você tem uma conta do Gmail ou Google, pode entrar com um clique só:</p>
            <ol style={s.ol}>
              <li>Na tela de Login, clique no botão <strong>"Entrar com Google"</strong></li>
              <li>Uma janela nova vai abrir mostrando suas contas do Google</li>
              <li>Clique na sua conta (com seu nome e e-mail)</li>
              <li>Pronto! O sistema entra automaticamente</li>
            </ol>

            <Tip>
              Se você já tem uma conta no sistema (criada com e-mail e senha) e entrar com
              o Google usando o mesmo e-mail, o sistema vai reconhecer você e unir as duas
              formas de acesso automaticamente.
            </Tip>

            <div style={s.hr} />

            <H3>Criar uma Conta Nova</H3>
            <p style={s.p}>Se é a primeira vez que você usa o sistema:</p>
            <ol style={s.ol}>
              <li>Na tela de Login, clique em <strong>"Criar conta"</strong></li>
              <li>Preencha seu <strong>nome completo</strong></li>
              <li>Preencha seu <strong>e-mail</strong></li>
              <li>Crie uma <strong>senha</strong> (mínimo 8 caracteres)</li>
              <li>Clique em <strong>"Criar conta"</strong></li>
            </ol>

            <div style={s.hr} />

            <H3>Esqueci Minha Senha</H3>
            <ol style={s.ol}>
              <li>Na tela de Login, clique em <strong>"Esqueci minha senha"</strong></li>
              <li>Digite seu e-mail e clique em <strong>"Enviar link"</strong></li>
              <li>Abra seu e-mail e procure a mensagem do Supermercado Fácil</li>
              <li>Clique no link que chegou no e-mail</li>
              <li>Crie e confirme sua nova senha</li>
            </ol>

            <Tip>
              Verifique também a pasta de <strong>Spam</strong> ou <strong>Lixo eletrônico</strong> do
              seu e-mail caso não encontre a mensagem na caixa de entrada.
            </Tip>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 3 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap3" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#0891b2')}>
            <div style={s.chapterNum}>3</div>
            <h2 style={s.chapterTitle}>A Tela Principal (Dashboard)</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Após entrar no sistema, você verá o <strong>Dashboard</strong> — a tela principal.
              Pense nela como um <em>painel de controle</em> com um resumo rápido de tudo.
            </p>

            <H3>O que você vê no Dashboard</H3>
            <ul style={s.ul}>
              <li>📦 <strong>Total de produtos</strong> cadastrados no sistema</li>
              <li>🏪 <strong>Total de supermercados</strong> que você registrou</li>
              <li>🛒 <strong>Itens na lista</strong> de compras atual</li>
              <li>🏆 <strong>Produtos com menor preço</strong> — onde cada produto está mais barato</li>
            </ul>

            <H3>O Menu Lateral (navegação)</H3>
            <p style={s.p}>
              À <strong>esquerda da tela</strong> (no computador) ou clicando no ícone <strong>☰</strong> (no celular),
              você verá o menu com todas as seções do sistema:
            </p>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Seção</th>
                  <th style={s.th}>O que você encontra lá</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['🏠 Dashboard', 'Tela inicial com resumo geral'],
                  ['🏪 Supermercados', 'Cadastrar os mercados que você frequenta'],
                  ['📦 Produtos', 'Cadastrar produtos e os preços em cada mercado'],
                  ['🏷️ Categorias', 'Organizar produtos por tipo (carnes, bebidas, etc.)'],
                  ['🛒 Lista de Compras', 'Sua lista do mercado digital'],
                  ['📤 Importar Dados', 'Importar preços automaticamente por foto, PDF ou link'],
                  ['👨‍🍳 Receitas', 'Guardar e consultar receitas com ingredientes'],
                  ['📊 Relatórios', 'Ver gráficos de gastos e comparativos'],
                  ['📖 Manual', 'Este manual que você está lendo agora'],
                ].map(([sec, desc]) => (
                  <tr key={sec}>
                    <td style={s.td}><strong>{sec}</strong></td>
                    <td style={s.td}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <H3>Modo Escuro / Modo Claro</H3>
            <p style={s.p}>
              No canto inferior esquerdo do menu, ao lado do seu nome, há um botão com ícone de
              <strong> Lua 🌙</strong> ou <strong>Sol ☀️</strong>. Clique nele para alternar entre tela
              clara (branca) e tela escura (cinza/preta). Útil para usar à noite!
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 4 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap4" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#059669')}>
            <div style={s.chapterNum}>4</div>
            <h2 style={s.chapterTitle}>Supermercados</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Antes de cadastrar produtos e preços, você precisa dizer ao sistema
              <strong> quais supermercados você frequenta</strong>. Cada produto poderá ter
              um preço diferente em cada mercado, e o sistema sempre mostrará o mais barato.
            </p>

            <H3>Como Cadastrar um Supermercado</H3>
            <ol style={s.ol}>
              <li>Clique em <strong>"Supermercados"</strong> no menu lateral</li>
              <li>Clique no botão <strong>"+ Novo Supermercado"</strong></li>
              <li>Preencha o formulário:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li><strong>Nome:</strong> O nome do mercado (ex: "Supermercado Real", "Atacadão")</li>
                  <li><strong>Endereço:</strong> O endereço físico (opcional)</li>
                  <li><strong>Cidade:</strong> A cidade onde fica (opcional)</li>
                  <li><strong>Site:</strong> O endereço do site na internet (opcional — útil para importar preços)</li>
                </ul>
              </li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <Example title="Exemplo prático">
              Você vai com frequência ao <em>Supermercado Real</em>, ao <em>Mundial</em> e ao
              <em> Atacadão</em>. Cadastre os três! Assim o sistema vai comparar os preços nos
              três e te dizer onde cada produto está mais barato.
            </Example>

            <Tip>
              Se o supermercado tem um site com produtos e preços online, anote o endereço
              do site — você vai usar isso depois na função de <strong>Importar Dados</strong>!
            </Tip>

            <H3>Como Editar ou Excluir um Supermercado</H3>
            <ol style={s.ol}>
              <li>Na lista de supermercados, localize o que deseja alterar</li>
              <li>Clique nos três pontinhos <strong>(...)</strong> ou no ícone de lápis ao lado do nome</li>
              <li>Escolha <strong>"Editar"</strong> para alterar as informações</li>
              <li>Ou escolha <strong>"Excluir"</strong> para remover</li>
            </ol>

            <Warn>
              Se você excluir um supermercado, <strong>todos os preços</strong> cadastrados para
              aquele mercado também serão removidos permanentemente. Faça isso com cuidado!
            </Warn>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 5 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap5" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#7c3aed')}>
            <div style={s.chapterNum}>5</div>
            <h2 style={s.chapterTitle}>Categorias</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Categorias são como <strong>gavetas de armário</strong> — você organiza os produtos
              por tipo para ficar mais fácil de encontrar e comparar. Exemplos: <em>Carnes, Laticínios,
              Bebidas, Limpeza, Higiene Pessoal</em>...
            </p>

            <H3>O sistema já vem com categorias prontas</H3>
            <p style={s.p}>
              O Supermercado Fácil já tem várias categorias pré-cadastradas (Frutas, Verduras,
              Carnes, Bebidas, etc.). Na maioria dos casos, você não precisa criar novas categorias.
            </p>

            <H3>Como Criar uma Nova Categoria (se precisar)</H3>
            <ol style={s.ol}>
              <li>Clique em <strong>"Categorias"</strong> no menu</li>
              <li>Clique em <strong>"+ Nova Categoria"</strong></li>
              <li>Preencha:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li><strong>Nome:</strong> Ex: "Produtos de Festa"</li>
                  <li><strong>Ícone:</strong> Um emoji ou símbolo para representar</li>
                  <li><strong>Cor:</strong> Uma cor para identificar visualmente na lista</li>
                </ul>
              </li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <Tip>
              Use categorias para agrupar produtos da mesma prateleira do mercado.
              Isso ajuda a não esquecer nada quando você estiver fazendo as compras!
            </Tip>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 6 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap6" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#dc2626')}>
            <div style={s.chapterNum}>6</div>
            <h2 style={s.chapterTitle}>Produtos e Preços</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Aqui você cadastra os produtos que compra e <strong>quanto custam em cada supermercado</strong>.
              Esta é a base de todo o sistema — quanto mais produtos e preços você cadastrar,
              melhor o sistema vai te ajudar a economizar!
            </p>

            <H3>Como Cadastrar um Produto</H3>
            <ol style={s.ol}>
              <li>Clique em <strong>"Produtos"</strong> no menu</li>
              <li>Clique em <strong>"+ Novo Produto"</strong></li>
              <li>Preencha:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li><strong>Nome:</strong> O nome do produto (ex: "Arroz Tio João")</li>
                  <li><strong>Marca:</strong> A marca (ex: "Tio João")</li>
                  <li><strong>Categoria:</strong> Escolha na lista (ex: "Cereais e Grãos")</li>
                  <li><strong>Unidade:</strong> Como é vendido (ex: "5kg", "1L", "por kg", "un")</li>
                </ul>
              </li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <H3>Como Cadastrar o Preço de um Produto</H3>
            <ol style={s.ol}>
              <li>Na lista de produtos, clique no produto que deseja adicionar preço</li>
              <li>Clique em <strong>"+ Adicionar Preço"</strong></li>
              <li>Preencha:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li><strong>Supermercado:</strong> Escolha o mercado onde você viu o preço</li>
                  <li><strong>Preço:</strong> O valor (ex: 18,90)</li>
                  <li><strong>É promoção?</strong> Marque se for um preço temporário de oferta</li>
                </ul>
              </li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <Example title="Exemplo prático">
              Você foi ao <em>Supermercado Real</em> e viu o Arroz Tio João 5kg por <strong>R$ 18,90</strong>.
              Depois foi ao <em>Mundial</em> e estava por <strong>R$ 21,50</strong>.
              Cadastre os dois preços — o sistema mostrará automaticamente que o Real está
              R$ 2,60 mais barato para este produto!
            </Example>

            <Tip>
              Sempre que for ao mercado, atualize os preços no sistema. Com o tempo, você
              terá um histórico completo e o sistema ficará cada vez mais preciso!
            </Tip>

            <Warn>
              Antes de cadastrar um produto manualmente, verifique se ele já não existe no sistema —
              procure pelo nome na lista de produtos para evitar duplicatas.
            </Warn>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 7 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap7" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#0f766e')}>
            <div style={s.chapterNum}>7</div>
            <h2 style={s.chapterTitle}>Importar Dados com Inteligência Artificial</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Esta é a função mais poderosa do Supermercado Fácil! Em vez de digitar produto
              por produto, você pode deixar o sistema <strong>ler automaticamente</strong> o site,
              o folheto ou o PDF do supermercado e importar tudo de uma vez.
            </p>

            <div style={{ ...s.tip, marginBottom: '0.5rem' }}>
              <Info size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <span>
                <strong>O que é Inteligência Artificial?</strong> É uma tecnologia que faz o
                computador "entender" textos e imagens quase como uma pessoa faz. O sistema usa
                essa tecnologia para ler os preços dos produtos sem você precisar digitar nada!
              </span>
            </div>

            <H3>Opção 1 — Importar por Link (endereço do site)</H3>
            <p style={s.p}>Use quando o supermercado tem um site com produtos e preços online.</p>
            <ol style={s.ol}>
              <li>Abra o site do supermercado no navegador</li>
              <li>Vá até a página de <em>"Ofertas"</em> ou <em>"Produtos"</em></li>
              <li>Copie o endereço da página:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li>Clique na barra de endereço (onde aparece algo como <code>www.supermercado.com.br/ofertas</code>)</li>
                  <li>Pressione <strong>Ctrl + A</strong> para selecionar tudo</li>
                  <li>Pressione <strong>Ctrl + C</strong> para copiar</li>
                </ul>
              </li>
              <li>Volte ao Supermercado Fácil e clique em <strong>"Importar Dados"</strong></li>
              <li>Clique no campo de <strong>"Links"</strong></li>
              <li>Pressione <strong>Ctrl + V</strong> para colar o endereço</li>
              <li>Você pode adicionar vários links — coloque um em cada linha</li>
              <li>Clique em <strong>"Importar"</strong> e aguarde</li>
            </ol>

            <Example title="Atalhos de teclado (ctrl = a tecla 'Ctrl' do teclado)">
              <strong>Ctrl + C</strong> = Copiar &nbsp;|&nbsp; <strong>Ctrl + V</strong> = Colar &nbsp;|&nbsp; <strong>Ctrl + A</strong> = Selecionar tudo
            </Example>

            <div style={s.hr} />

            <H3>Opção 2 — Importar por Foto do Folheto</H3>
            <p style={s.p}>Ideal quando você tem um encarte (folheto de ofertas) em papel.</p>
            <ol style={s.ol}>
              <li>Tire uma foto do encarte com seu celular ou câmera</li>
              <li>Copie a foto para o computador (ou use diretamente no celular)</li>
              <li>No Importar Dados, clique em <strong>"Escolher Foto"</strong></li>
              <li>Selecione a foto salva no seu dispositivo</li>
              <li>Clique em <strong>"Importar"</strong></li>
            </ol>

            <Tip>
              Para melhores resultados: tire a foto com boa iluminação, sem sombras e
              com o papel reto (não torto). Quanto mais clara e nítida a imagem, mais
              produtos o sistema consegue reconhecer!
            </Tip>

            <div style={s.hr} />

            <H3>Opção 3 — Importar por PDF</H3>
            <p style={s.p}>Se o supermercado disponibiliza o folheto em formato PDF para baixar.</p>
            <ol style={s.ol}>
              <li>Salve o PDF do folheto no seu computador</li>
              <li>No Importar Dados, clique em <strong>"Escolher PDF"</strong></li>
              <li>Selecione o arquivo PDF</li>
              <li>Clique em <strong>"Importar"</strong></li>
            </ol>

            <div style={s.hr} />

            <H3>Acompanhando o Processamento</H3>
            <p style={s.p}>
              Após clicar em "Importar", uma barra de progresso aparecerá. O processo pode
              demorar de <strong>30 segundos a 2 minutos</strong>, dependendo da quantidade de produtos.
              Ao terminar, você verá:
            </p>
            <ul style={s.ul}>
              <li>✅ Quantos produtos foram encontrados</li>
              <li>✅ Quantos foram importados com sucesso</li>
              <li>O histórico das últimas importações fica salvo na parte inferior da tela</li>
            </ul>

            <Warn>
              Não feche nem recarregue a página enquanto a importação estiver em andamento,
              para não interromper o processo!
            </Warn>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 8 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap8" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#ea580c')}>
            <div style={s.chapterNum}>8</div>
            <h2 style={s.chapterTitle}>Lista de Compras</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Esta é a seção que você vai usar <strong>toda semana</strong>! É a sua lista do
              mercado digital — só que muito mais inteligente do que um papel.
            </p>

            <H3>8.1 — Criando e Gerenciando Listas</H3>
            <p style={s.p}>
              Você pode ter <strong>várias listas ao mesmo tempo</strong> — uma para as compras
              do mês, outra para o churrasco do domingo, outra para a festa de aniversário...
            </p>
            <ol style={s.ol}>
              <li>Clique em <strong>"Lista de Compras"</strong> no menu</li>
              <li>Para criar uma nova lista: clique no botão <strong>"+"</strong> ao lado do nome da lista atual</li>
              <li>Digite o nome da nova lista (ex: "Churrasco")</li>
              <li>Clique em <strong>"Criar"</strong></li>
              <li>Para trocar de lista: clique no nome da lista atual e escolha outra</li>
            </ol>

            <div style={s.hr} />

            <H3>8.2 — Adicionando Itens à Lista</H3>
            <p style={s.p}><strong>Para adicionar um produto já cadastrado no sistema:</strong></p>
            <ol style={s.ol}>
              <li>Clique no botão <strong>"+ Adicionar Item"</strong> (ou no ícone de +)</li>
              <li>No campo de busca, comece a digitar o nome do produto</li>
              <li>Uma lista vai aparecer — clique no produto desejado</li>
              <li>Configure a quantidade (veja o próximo tópico)</li>
              <li>Clique em <strong>"Adicionar"</strong></li>
            </ol>

            <p style={{ ...s.p, marginTop: '0.75rem' }}><strong>Para adicionar um item sem cadastro (item avulso):</strong></p>
            <ol style={s.ol}>
              <li>Clique em <strong>"+ Adicionar Item"</strong></li>
              <li>Digite o nome do item no campo de texto (ex: "Pão de queijo")</li>
              <li>Se não aparecer na lista, clique em <strong>"Adicionar como item avulso"</strong></li>
              <li>Configure a quantidade e clique em <strong>"Adicionar"</strong></li>
            </ol>

            <Tip>
              Items avulsos são práticos para produtos que você não tem cadastrado. Eles ficam
              na lista mas não mostram comparativo de preços. Para ter comparativo de preços,
              o produto precisa estar cadastrado com preços na seção Produtos.
            </Tip>

            <div style={s.hr} />

            <H3>8.3 — Quantidades: Unidade ou Quilo</H3>
            <p style={s.p}>
              Ao adicionar um item, você escolhe como medir a quantidade:
            </p>

            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Modo</th>
                  <th style={s.th}>Quando usar</th>
                  <th style={s.th}>Exemplos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={s.td}><span style={s.badge('#4f46e5')}>Un</span> Unidade</td>
                  <td style={s.td}>Produtos que você conta (caixas, garrafas, pacotes, unidades)</td>
                  <td style={s.td}>2 pacotes de macarrão, 1 garrafa de azeite, 6 ovos</td>
                </tr>
                <tr>
                  <td style={s.td}><span style={s.badge('#059669')}>Kg</span> Quilo</td>
                  <td style={s.td}>Produtos pesados no açougue, peixaria ou frios</td>
                  <td style={s.td}>2,500 kg de carne moída, 0,300 kg de presunto fatiado</td>
                </tr>
              </tbody>
            </table>

            <p style={{ ...s.p, marginTop: '0.875rem' }}>
              <strong>Como usar o modo Kg com frações:</strong>
            </p>
            <ul style={s.ul}>
              <li>Clique no botão <span style={s.badge('#059669')}>Kg</span> para ativar o modo quilo</li>
              <li>Digite a quantidade usando <strong>vírgula</strong> para separar os decimais</li>
              <li>Use os botões <strong>+</strong> e <strong>−</strong> para ajustar em 0,1 kg por vez</li>
            </ul>

            <Example title="Como escrever quantidades em Kg">
              <ul style={{ ...s.ul, margin: 0 }}>
                <li><strong>2,500</strong> → 2 quilos e 500 gramas (dois e meio quilos)</li>
                <li><strong>0,300</strong> → 300 gramas</li>
                <li><strong>1,200</strong> → 1 quilo e 200 gramas</li>
                <li><strong>0,750</strong> → 750 gramas (três quartos de quilo)</li>
              </ul>
            </Example>

            <div style={s.hr} />

            <H3>8.4 — Alterando a Quantidade de um Item</H3>
            <p style={s.p}>
              Se você colocou a quantidade errada, não precisa remover e adicionar de novo:
            </p>
            <ol style={s.ol}>
              <li>Localize o item na lista</li>
              <li>Clique no ícone <strong>#</strong> (parece um jogo da velha) ao lado do item</li>
              <li>Uma janela vai abrir com a quantidade atual já preenchida</li>
              <li>Altere a quantidade e a unidade (Un ou Kg) se necessário</li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <div style={s.hr} />

            <H3>8.5 — Marcando Itens como Comprados</H3>
            <p style={s.p}>
              Quando você colocar o produto no carrinho no mercado, marque na lista:
            </p>
            <ol style={s.ol}>
              <li>Clique na <strong>caixa de seleção</strong> (quadradinho) à esquerda do item</li>
              <li>O item ficará com uma cor mais fraca e riscado — indicando que já pegou</li>
              <li>Para desmarcar, clique novamente na caixinha</li>
            </ol>

            <p style={{ ...s.p, marginTop: '0.625rem' }}><strong>Limpar itens já comprados após a compra:</strong></p>
            <ol style={s.ol}>
              <li>Após terminar as compras, clique em <strong>"Limpar Marcados"</strong></li>
              <li>Confirme a ação na janela que aparecer</li>
              <li>Apenas os itens marcados são removidos — os não marcados ficam na lista</li>
            </ol>

            <div style={s.hr} />

            <H3>8.6 — Alerta de Preço</H3>
            <p style={s.p}>
              Defina o <strong>preço máximo</strong> que você quer pagar por um produto.
              O sistema te avisa quando o preço está acima do que você quer gastar.
            </p>
            <ol style={s.ol}>
              <li>Localize o item na lista</li>
              <li>Clique no ícone de <strong>sino 🔔</strong> ao lado do item</li>
              <li>Digite o preço máximo que você aceita pagar</li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <table style={{ ...s.table, marginTop: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ ...s.td, background: 'rgba(34,197,94,0.1)' }}>
                    <strong style={{ color: '#16a34a' }}>Badge Verde ✅</strong>
                  </td>
                  <td style={s.td}>O preço atual está <strong>abaixo</strong> do seu alerta — boa compra!</td>
                </tr>
                <tr>
                  <td style={{ ...s.td, background: 'rgba(251,146,60,0.1)' }}>
                    <strong style={{ color: '#ea580c' }}>Badge Laranja ⚠️</strong>
                  </td>
                  <td style={s.td}>O preço atual está <strong>acima</strong> do seu alerta — está caro!</td>
                </tr>
              </tbody>
            </table>

            <div style={s.hr} />

            <H3>8.7 — Orçamento Mensal</H3>
            <p style={s.p}>
              Defina quanto você quer gastar por mês no supermercado.
              O sistema exibe uma barra colorida mostrando quanto você já usou do orçamento.
            </p>
            <ol style={s.ol}>
              <li>Na tela de Lista, localize o widget de <strong>"Orçamento Mensal"</strong> no topo</li>
              <li>Clique no ícone de <strong>lápis ✏️</strong> ao lado do valor</li>
              <li>Digite o valor do orçamento (ex: <code>800,00</code>)</li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <table style={s.table}>
              <tbody>
                <tr>
                  <td style={{ ...s.td, background: 'rgba(34,197,94,0.1)' }}>
                    <strong style={{ color: '#16a34a' }}>Barra Verde</strong>
                  </td>
                  <td style={s.td}>Gastos dentro do orçamento — você está bem!</td>
                </tr>
                <tr>
                  <td style={{ ...s.td, background: 'rgba(251,191,36,0.1)' }}>
                    <strong style={{ color: '#d97706' }}>Barra Amarela</strong>
                  </td>
                  <td style={s.td}>Atenção — você está chegando perto do limite!</td>
                </tr>
                <tr>
                  <td style={{ ...s.td, background: 'rgba(220,38,38,0.1)' }}>
                    <strong style={{ color: '#dc2626' }}>Barra Vermelha</strong>
                  </td>
                  <td style={s.td}>Orçamento ultrapassado — hora de controlar os gastos!</td>
                </tr>
              </tbody>
            </table>

            <div style={s.hr} />

            <H3>8.8 — Vendo o Melhor Preço</H3>
            <p style={s.p}>
              Para cada produto cadastrado na lista, o sistema mostra automaticamente:
            </p>
            <ul style={s.ul}>
              <li>🏷️ O <strong>menor preço</strong> encontrado entre os supermercados cadastrados</li>
              <li>🏪 Em qual <strong>supermercado</strong> está mais barato</li>
              <li>💰 O <strong>total estimado</strong> para a quantidade que você quer</li>
            </ul>

            <Tip>
              Quanto mais preços você cadastrar (ou importar), mais precisas serão as
              comparações. Com o tempo, o sistema aprende quais mercados são mais baratos
              para cada tipo de produto!
            </Tip>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 9 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap9" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#b45309')}>
            <div style={s.chapterNum}>9</div>
            <h2 style={s.chapterTitle}>Receitas</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Guarde suas receitas favoritas e veja quanto custam os ingredientes
              nos supermercados da sua lista!
            </p>

            <H3>Como Adicionar uma Receita</H3>
            <ol style={s.ol}>
              <li>Clique em <strong>"Receitas"</strong> no menu</li>
              <li>Clique em <strong>"+ Nova Receita"</strong></li>
              <li>Preencha as informações:
                <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                  <li><strong>Nome:</strong> O nome da receita (ex: "Frango Grelhado com Limão")</li>
                  <li><strong>Descrição:</strong> Uma breve descrição do prato</li>
                  <li><strong>Instruções:</strong> Como preparar, passo a passo</li>
                  <li><strong>Porções:</strong> Para quantas pessoas rende</li>
                  <li><strong>Tempo de preparo:</strong> Quantos minutos para preparar</li>
                  <li><strong>Tempo de cozimento:</strong> Quantos minutos para cozinhar</li>
                </ul>
              </li>
              <li>Adicione os ingredientes clicando em <strong>"+ Ingrediente"</strong></li>
              <li>Para cada ingrediente, informe nome, quantidade e unidade</li>
              <li>Clique em <strong>"Salvar"</strong></li>
            </ol>

            <H3>Adicionar Ingredientes à Lista de Compras</H3>
            <p style={s.p}>
              Com um clique só, você pode enviar todos os ingredientes de uma receita
              direto para a sua lista de compras:
            </p>
            <ol style={s.ol}>
              <li>Abra a receita desejada</li>
              <li>Clique em <strong>"Adicionar à Lista"</strong></li>
              <li>Todos os ingredientes serão adicionados automaticamente!</li>
            </ol>

            <Example title="Exemplo prático">
              Você vai fazer um churrasco no final de semana. Abra a receita "Churrasco Completo",
              clique em "Adicionar à Lista" e todos os ingredientes (carnes, temperos, carvão...)
              vão automaticamente para a sua lista de compras com as quantidades certas!
            </Example>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 10 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap10" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#1d4ed8')}>
            <div style={s.chapterNum}>10</div>
            <h2 style={s.chapterTitle}>Relatórios</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Os Relatórios mostram <strong>gráficos e análises</strong> para te ajudar a
              entender melhor seus gastos e economizar ainda mais.
            </p>

            <H3>O que você encontra nos Relatórios</H3>
            <ul style={s.ul}>
              <li>📊 <strong>Comparativo de preços:</strong> Qual supermercado é mais barato em média</li>
              <li>📈 <strong>Evolução de preços:</strong> Como os preços subiram ou caíram ao longo do tempo</li>
              <li>🛒 <strong>Produtos mais comprados:</strong> O que aparece mais na sua lista</li>
              <li>💰 <strong>Gastos por categoria:</strong> Quanto você gasta em carnes, bebidas, limpeza, etc.</li>
            </ul>

            <H3>Como Gerar um Relatório</H3>
            <ol style={s.ol}>
              <li>Clique em <strong>"Relatórios"</strong> no menu</li>
              <li>Escolha o tipo de relatório que quer ver</li>
              <li>Defina o período (semana, mês, ano)</li>
              <li>O gráfico aparecerá automaticamente</li>
            </ol>

            <Tip>
              Use os relatórios para descobrir quais produtos estão encarecendo mais rápido
              e quais supermercados estão valendo mais a pena visitar no momento.
            </Tip>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CAPÍTULO 11 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="cap11" className="manual-chapter" style={s.chapterCard}>
          <div style={s.chapterHeader('#6b7280')}>
            <div style={s.chapterNum}>11</div>
            <h2 style={s.chapterTitle}>Imprimir Este Manual / Salvar como PDF</h2>
          </div>
          <div style={s.body}>
            <p style={s.p}>
              Você pode imprimir este manual em papel ou salvá-lo como arquivo PDF para
              consultar depois, mesmo sem internet.
            </p>

            <H3>Como Imprimir em Papel</H3>
            <ol style={s.ol}>
              <li>Clique no botão <strong>"🖨️ Imprimir / Salvar PDF"</strong> no topo desta página</li>
              <li>A janela de impressão do seu computador vai abrir</li>
              <li>Certifique-se de que a impressora correta está selecionada</li>
              <li>Clique em <strong>"Imprimir"</strong></li>
            </ol>

            <H3>Como Salvar como Arquivo PDF</H3>
            <ol style={s.ol}>
              <li>Clique no botão <strong>"🖨️ Imprimir / Salvar PDF"</strong> no topo desta página</li>
              <li>Na janela de impressão, onde aparece o nome da impressora, clique e procure:</li>
              <ul style={{ ...s.ul, marginTop: '0.25rem' }}>
                <li>No <strong>Chrome:</strong> "Salvar como PDF"</li>
                <li>No <strong>Windows:</strong> "Microsoft Print to PDF"</li>
                <li>No <strong>Mac:</strong> clique em "PDF" no canto inferior esquerdo</li>
              </ul>
              <li>Clique em <strong>"Salvar"</strong> e escolha onde guardar o arquivo no seu computador</li>
            </ol>

            <Tip>
              O PDF gerado terá apenas o conteúdo do manual, sem o menu lateral do sistema —
              perfeito para compartilhar com outros usuários ou guardar para referência!
            </Tip>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DICAS FINAIS */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div id="capDicas" className="manual-chapter" style={s.chapterCard}>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)', color: 'white', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✨</span>
            <h2 style={s.chapterTitle}>Dicas Finais para Aproveitar ao Máximo</h2>
          </div>
          <div style={s.body}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.875rem' }}>
              {[
                ['💡 Dica 1 — Mantenha os preços atualizados',
                  'Sempre que for ao mercado, atualize os preços que mudam. Com preços frescos, as comparações ficam cada vez mais precisas e confiáveis.'],
                ['📷 Dica 2 — Use a importação por foto',
                  'Se seu supermercado distribui encartes em papel, tire fotos deles e importe. Você economiza muito tempo comparado a digitar produto por produto!'],
                ['💰 Dica 3 — Configure o orçamento mensal',
                  'Definindo um orçamento, você tem controle visual dos seus gastos. A barra colorida te alerta antes de ultrapassar o limite.'],
                ['📝 Dica 4 — Crie listas separadas',
                  'Use listas diferentes para ocasiões diferentes: "Semana", "Festa de Aniversário", "Churrasco de Domingo". Fica muito mais organizado!'],
                ['🔔 Dica 5 — Use alertas de preço',
                  'Configure alertas para os produtos que você compra com frequência. Quando o preço estiver bom, o sistema mostra verde — hora de comprar!'],
                ['🌙 Dica 6 — Modo escuro para à noite',
                  'Clique na lua 🌙 no menu lateral para ativar o modo escuro. É mais confortável para os olhos quando você usa o sistema à noite.'],
                ['📱 Dica 7 — Use no celular no mercado',
                  'Leve o sistema com você nas compras! Abra no celular, consulte sua lista e marque os itens conforme vai colocando no carrinho.'],
                ['🤝 Dica 8 — Comece devagar',
                  'Não precisa cadastrar tudo de uma vez. Comece pelos produtos que você compra toda semana. Com o tempo, o sistema vai ficando mais completo.'],
              ].map(([title, desc]) => (
                <div key={title} style={{
                  background: 'var(--color-primary-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.625rem',
                  padding: '0.875rem',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.375rem', color: 'var(--color-primary)' }}>{title}</div>
                  <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-soft)' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ textAlign: 'center', color: 'var(--color-text-soft)', fontSize: '0.8125rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0.25rem 0' }}>
            <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem', color: 'var(--color-primary)' }} />
            Manual do Supermercado Fácil — Versão 1.0
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.
          </p>
        </div>

      </div>
    </>
  )
}
