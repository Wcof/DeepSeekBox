import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { buildPluginCatalogIndex } from './src/data/pluginIndex'

/**
 * 插件市场索引源：把收录库输出为 DSH 插件索引（format 1）。
 * - `vite build` 时写入 dist/index.json，部署后即索引 URL；
 * - 开发服务器在 /index.json 直接返回，便于本地联调「发现」页。
 */
function pluginIndexSource(): Plugin {
  const json = () => `${JSON.stringify(buildPluginCatalogIndex(), null, 2)}\n`
  return {
    name: 'deepseekbox-plugin-index-source',
    configureServer(server) {
      server.middlewares.use('/index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(json())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'index.json', source: json() })
    },
  }
}

export default defineConfig({
  plugins: [vue(), pluginIndexSource()],
  server: {
    port: 5180,
  },
})
