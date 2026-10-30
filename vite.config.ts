import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { buildPluginCatalogIndex } from './src/data/pluginIndex'
import { createDevRpcMock } from './scripts/dev-rpc-mock.ts'

/**
 * 插件市场索引源：把收录库输出为 DSH 插件索引（format 1）。
 * - `vite build` 时写入 web/index.json，部署后即索引 URL；
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

/**
 * 开发服务器的假宿主：生产环境由组合包 Host 半边提供 /deepseekbox/api/rpc，
 * npm run dev 时用同一形状的数据顶上，页面无需改动即可联调。
 */
function devHostMock(): Plugin {
  return {
    name: 'deepseekbox-dev-host-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/rpc', createDevRpcMock())
    },
  }
}

export default defineConfig(({ command }) => ({
  // 构建产物要能以 /deepseekbox/ 前缀挂在 DSH 宿主里，资源路径必须相对；
  // 开发服务器仍在站点根目录，保持绝对 base。
  base: command === 'build' ? './' : '/',
  plugins: [vue(), pluginIndexSource(), devHostMock()],
  build: {
    // web/ 是随包提交的插件前端产物（DSH 从 git 安装时不执行构建），不要当成临时目录。
    outDir: 'web',
    emptyOutDir: true,
  },
  server: {
    port: 5180,
  },
}))
