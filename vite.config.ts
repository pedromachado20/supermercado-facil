import { defineConfig, loadEnv, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Provides the virtual module that start-server-core expects but start-plugin-core
// doesn't register in this version set (1.168/1.169 mismatch).
function injectedHeadScriptsFallback(): Plugin {
  const moduleId = 'tanstack-start-injected-head-scripts:v'
  const resolvedId = '\0' + moduleId
  return {
    name: 'tanstack-start:injected-head-scripts-fallback',
    enforce: 'pre',
    resolveId(id) {
      if (id === moduleId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) return `export const injectedHeadScripts = null`
    },
  }
}

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    resolve: { tsconfigPaths: true },
    define: {
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL || process.env.DATABASE_URL || ''),
      'process.env.BETTER_AUTH_SECRET': JSON.stringify(env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || ''),
      'process.env.BETTER_AUTH_URL': JSON.stringify(env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || ''),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ''),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''),
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''),
      'process.env.VERCEL': JSON.stringify(env.VERCEL || process.env.VERCEL || ''),
      'process.env.GOOGLE_AI_API_KEY': JSON.stringify(env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''),
    },
    plugins: [injectedHeadScriptsFallback(), devtools(), tailwindcss(), tanstackStart({ server: { maxRequestBodySize: 52428800 } }), viteReact()],
  }
})

export default config
