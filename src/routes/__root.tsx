import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Supermercado Fácil' },
      { name: 'description', content: 'Compare preços e economize nas suas compras de supermercado' },
      { name: 'theme-color', content: '#16a34a' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Supermercado Fácil' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
      { rel: 'apple-touch-icon', href: '/icon-192.png' },
    ],
  }),
  shellComponent: Shell,
})

const initThemeScript = `
(function(){
  var t = localStorage.getItem('theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
})();
`

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: initThemeScript }} />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
