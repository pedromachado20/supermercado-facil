import { createFileRoute, Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'

export const Route = createFileRoute('/termos')({
  head: () => ({ meta: [{ title: 'Termos de Uso — Supermercado Fácil' }] }),
  component: TermosPage,
})

function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-2)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Termos de Uso</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)' }}>Supermercado Fácil — última atualização: agosto de 2026</p>
          </div>
        </header>

        <div className="card" style={{ padding: '1.75rem', fontSize: '0.875rem', color: 'var(--color-text-soft)', lineHeight: 1.7 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>1. Sobre o serviço</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            O Supermercado Fácil ("nós", "o app") é um serviço online que compara preços de produtos entre
            supermercados a partir de encartes, links ou PDFs importados pelo próprio usuário, e ajuda a montar
            listas de compras pelo menor preço. Ao criar uma conta, você concorda com estes Termos de Uso e com a{' '}
            <Link to="/privacidade" style={{ color: 'var(--color-primary)' }}>Política de Privacidade</Link>.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>2. Cadastro e conta</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na
            sua conta. As informações fornecidas no cadastro (nome, e-mail) devem ser verdadeiras. Cada pessoa deve
            ter sua própria conta.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>3. Período de teste e cobrança</h2>
          <p style={{ marginBottom: '0.75rem' }}>
            O sistema oferece um período de teste gratuito de 7 (sete) dias a partir do cadastro, sem necessidade de
            cartão de crédito e sem qualquer cobrança nesse período. Encerrado o teste, o acesso continua mediante
            assinatura mensal de R$ 19,90, cobrada de forma recorrente via Mercado Pago (instituição de pagamentos
            parceira) até que a assinatura seja cancelada.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: 'var(--color-text)' }}>Cancelamento:</strong> você pode cancelar a assinatura a
            qualquer momento na página <Link to="/assinatura" style={{ color: 'var(--color-primary)' }}>Assinatura</Link>{' '}
            dentro do app, sem multa ou justificativa. O cancelamento interrompe cobranças futuras; seus dados
            continuam guardados mesmo com a assinatura em atraso ou cancelada.
          </p>
          <p style={{ marginBottom: '1.25rem' }}>
            <strong style={{ color: 'var(--color-text)' }}>Reembolso:</strong> conforme o art. 49 do Código de Defesa
            do Consumidor, compras feitas pela internet podem ser canceladas em até 7 dias corridos após a
            cobrança, com devolução integral do valor pago. Para solicitar, entre em contato pelo e-mail informado
            na seção 9.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>4. Uso aceitável</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Você concorda em não: (a) usar o app para fins ilegais; (b) tentar acessar dados de outros usuários;
            (c) automatizar chamadas à importação por IA de forma abusiva ou fora do uso pessoal normal; (d) criar
            múltiplas contas para obter testes grátis repetidos. O uso indevido pode levar à suspensão da conta.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>5. Natureza da extração por IA</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            A importação de encartes usa Inteligência Artificial para extrair produtos, preços e categorias de
            fotos, PDFs ou links, e pode cometer erros de leitura (preço, unidade ou nome incorretos). Confira
            sempre os preços importados antes de confiar neles para decidir uma compra — o Supermercado Fácil não
            se responsabiliza por diferenças entre o preço exibido no app e o preço real cobrado no supermercado.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>6. Disponibilidade e limitação de responsabilidade</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Empregamos esforços razoáveis para manter o serviço disponível, mas não garantimos operação
            ininterrupta ou livre de erros. Na máxima extensão permitida por lei, não nos responsabilizamos por
            perdas decorrentes de decisões de compra tomadas com base nos preços exibidos no app.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>7. Encerramento de conta</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Você pode encerrar sua conta a qualquer momento entrando em contato pelo e-mail informado na seção 9.
            Reservamo-nos o direito de suspender contas que violem estes Termos.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>8. Alterações destes Termos</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por e-mail ou
            aviso no app. O uso continuado após a atualização representa aceitação dos novos termos.
          </p>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>9. Contato</h2>
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para{' '}
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
