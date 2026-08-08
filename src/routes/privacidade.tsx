import { createFileRoute, Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'

export const Route = createFileRoute('/privacidade')({
  head: () => ({ meta: [{ title: 'Política de Privacidade — Supermercado Fácil' }] }),
  component: PrivacidadePage,
})

function PrivacidadePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-2)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Política de Privacidade</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>Supermercado Fácil — última atualização: agosto de 2026</p>
          </div>
        </header>

        <div className="card" style={{ padding: '1.75rem', fontSize: '0.875rem', color: 'var(--color-text-soft)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '1.25rem' }}>
            Esta política explica quais dados coletamos, para que usamos e como você pode exercer seus direitos, em
            conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>1. Quem trata os seus dados</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            O Supermercado Fácil é o controlador dos dados coletados através do app. Você pode falar conosco pelo
            e-mail informado na seção 9.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>2. Dados que coletamos</h2>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li><strong style={{ color: 'var(--color-text)' }}>Cadastro:</strong> nome, e-mail e senha (armazenada com hash criptográfico, nunca em texto puro).</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Pagamento:</strong> processado diretamente pelo Mercado Pago — não temos acesso ao número do seu cartão.</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Dados que você cadastra:</strong> supermercados, produtos, preços, categorias, listas de compras, receitas e orçamento mensal.</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Encartes enviados pra importação:</strong> fotos, PDFs ou links que você envia são processados por um provedor de Inteligência Artificial (Google Gemini, Groq ou Anthropic, conforme disponibilidade) para extrair produtos e preços.</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Dados técnicos:</strong> endereço IP e cookie de sessão, usados para manter você conectado e prevenir abuso.</li>
          </ul>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>3. Para que usamos esses dados</h2>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Fornecer as funcionalidades do app (comparação de preços, lista de compras, relatórios);</li>
            <li>Processar sua assinatura e cobrança recorrente;</li>
            <li>Extrair produtos e preços dos encartes que você importa;</li>
            <li>Enviar e-mails transacionais (boas-vindas, redefinição de senha, avisos de cobrança);</li>
            <li>Prevenir fraude e uso abusivo do serviço.</li>
          </ul>
          <p style={{ marginBottom: '1.25rem' }}>Não vendemos seus dados a terceiros e não usamos suas informações pra publicidade.</p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>4. Com quem compartilhamos dados</h2>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li><strong style={{ color: 'var(--color-text)' }}>Mercado Pago</strong> — processamento de pagamentos (recebe e-mail e valores cobrados).</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Google Gemini / Groq / Anthropic</strong> — extração por IA dos encartes que você importa.</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Resend</strong> — envio de e-mails transacionais.</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Neon</strong> — hospedagem do banco de dados (criptografado em repouso).</li>
            <li><strong style={{ color: 'var(--color-text)' }}>Vercel</strong> — hospedagem da aplicação.</li>
          </ul>
          <p style={{ marginBottom: '1.25rem' }}>Todos são fornecedores contratados pra viabilizar o serviço, não terceiros de marketing.</p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>5. Cookies</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Usamos apenas um cookie de sessão (HttpOnly, necessário pra manter seu login), com validade de 30 dias.
            Não utilizamos cookies de rastreamento publicitário nem ferramentas de analytics de terceiros.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>6. Seus direitos (LGPD)</h2>
          <p style={{ marginBottom: '0.75rem' }}>
            Você pode solicitar pelo e-mail informado na seção 9:
          </p>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>Correção de dados incompletos ou desatualizados;</li>
            <li>Exclusão da sua conta e dos dados associados (ressalvado o que a lei exigir manter, como registros fiscais de pagamento);</li>
            <li>Portabilidade dos seus dados;</li>
            <li>Revogação do consentimento, quando aplicável.</li>
          </ul>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>7. Retenção de dados</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são apagados;
            registros de pagamento podem ser mantidos pelo prazo exigido pela legislação fiscal brasileira.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>8. Segurança</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Senhas são armazenadas com hash criptográfico, a sessão é protegida por cookie HttpOnly, e a comunicação
            com o app é feita via HTTPS. Nenhum sistema é 100% livre de risco, mas adotamos práticas técnicas pra
            proteger seus dados contra acesso não autorizado.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>9. Contato</h2>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre esta política, escreva para{' '}
            <a href="mailto:nexusteckbr@gmail.com" style={{ color: 'var(--color-primary)' }}>nexusteckbr@gmail.com</a>.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>← Voltar</Link>
        </div>
      </div>
    </div>
  )
}
