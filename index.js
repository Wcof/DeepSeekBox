/**
 * DeepSeekBox 插件中心 —— Host 半边。
 *
 * 两个职责：
 * 1. 把随包提交的 `web/`（Vue 构建产物）挂在同源前缀路由 `/deepseekbox/` 上，
 *    供 Client 半边在侧栏入口里用 iframe 打开；
 * 2. 在同一前缀下提供 `/deepseekbox/api/rpc`，把页面上的操作转成对 DSH
 *    `pluginManager` / `pluginMarket` 服务的真实调用。
 *
 * 为什么不用 `dsh.bundle` 自带的前端能力：插件中心是既有 Vue 单页应用，
 * 以静态产物 + iframe 的方式复用，避免把 UI 重写成 Client 模块。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.join(ROOT, 'web')
const ENTRY = path.join(WEB_ROOT, 'index.html')
const ROUTE = '/deepseekbox'
const ROUTE_PREFIX = `${ROUTE}/`
const API_ROUTE = `${ROUTE}/api/rpc`
const MAX_BODY_BYTES = 512 * 1024

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

function sendText(response, status, body) {
  response.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(body)
}

/** 带 hash 的资源可长缓存；入口页与索引必须每次取新。 */
function cacheControl(file) {
  return file.endsWith('.html') || file.endsWith('.json')
    ? 'no-store'
    : 'public, max-age=31536000, immutable'
}

/**
 * 把 URL 路径解析成 `web/` 下的真实文件，越界（`..`、绝对路径、非法转义）一律拒绝。
 */
function resolveTarget(pathname) {
  let relative
  try {
    relative = decodeURIComponent(pathname.slice(ROUTE_PREFIX.length))
  } catch {
    return { kind: 'bad' }
  }
  if (relative.includes('\0')) return { kind: 'bad' }
  const file = path.resolve(WEB_ROOT, relative === '' ? 'index.html' : relative)
  if (file !== WEB_ROOT && !file.startsWith(`${WEB_ROOT}${path.sep}`)) return { kind: 'denied' }
  return { kind: 'file', file }
}

async function serveFile(request, response, file) {
  let stat
  try {
    stat = await fs.promises.stat(file)
  } catch {
    return false
  }
  if (!stat.isFile()) return false
  const type = MIME.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream'
  response.writeHead(200, {
    'content-type': type,
    'content-length': stat.size,
    'cache-control': cacheControl(file),
  })
  if (request.method === 'HEAD') {
    response.end()
    return true
  }
  await new Promise((resolve) => {
    const stream = fs.createReadStream(file)
    stream.on('error', () => {
      response.destroy()
      resolve(undefined)
    })
    stream.on('end', resolve)
    stream.pipe(response)
  })
  return true
}

// ============ 宿主 API：页面操作 → DSH 服务 ============

class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

/** 只接受同源调用：跨站页面不能借这个路由改插件状态 */
function sameOrigin(request) {
  const site = request.headers['sec-fetch-site']
  if (site === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

function requireService(ctx, name) {
  const service = ctx.get(name)
  if (service === undefined) {
    throw new ApiError('service-unavailable', `当前 profile 没有装载 ${name} 服务`)
  }
  return service
}

function textParam(params, key) {
  const value = params?.[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('invalid-params', `缺少参数 ${key}`)
  }
  return value
}

function boolParam(params, key) {
  const value = params?.[key]
  if (typeof value !== 'boolean') throw new ApiError('invalid-params', `参数 ${key} 必须是布尔值`)
  return value
}

const API_METHODS = {
  status(ctx) {
    return {
      pluginManager: ctx.get('pluginManager') !== undefined,
      pluginMarket: ctx.get('pluginMarket') !== undefined,
    }
  },
  listBundles(ctx) {
    return requireService(ctx, 'pluginManager').listBundles()
  },
  listPlugins(ctx) {
    return requireService(ctx, 'pluginManager').listPlugins()
  },
  setBundleEnabled(ctx, params) {
    return requireService(ctx, 'pluginManager').setBundleEnabled(
      textParam(params, 'name'),
      boolParam(params, 'enabled'),
    )
  },
  setPluginEnabled(ctx, params) {
    return requireService(ctx, 'pluginManager').setPluginEnabled(
      textParam(params, 'entryId'),
      boolParam(params, 'enabled'),
    )
  },
  removeBundle(ctx, params) {
    return requireService(ctx, 'pluginManager').removeBundle(textParam(params, 'name'))
  },
  installBundle(ctx, params) {
    const spec = textParam(params, 'spec')
    const options = {}
    if (typeof params.registry === 'string') options.registry = params.registry
    else if (params.registry === null) options.registry = null
    if (Array.isArray(params.approvedBuilds)) options.approvedBuilds = params.approvedBuilds
    return requireService(ctx, 'pluginManager').installBundle(spec, options)
  },
  listIndexes(ctx) {
    return requireService(ctx, 'pluginMarket').listIndexes()
  },
  async setIndexes(ctx, params) {
    const urls = params?.urls
    if (!Array.isArray(urls) || urls.some((url) => typeof url !== 'string')) {
      throw new ApiError('invalid-params', '参数 urls 必须是字符串数组')
    }
    await requireService(ctx, 'pluginMarket').setIndexes(urls)
    return null
  },
  searchMarket(ctx, params) {
    const url = textParam(params, 'url')
    const query = params?.query
    if (typeof query !== 'object' || query === null) {
      throw new ApiError('invalid-params', '参数 query 必须是对象')
    }
    return requireService(ctx, 'pluginMarket').search(url, {
      ...query,
      limit: Math.min(Math.max(Number(query.limit) || 50, 1), 100),
      offset: Math.max(Number(query.offset) || 0, 0),
    })
  },
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new ApiError('body-too-large', '请求体过大'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw === '' ? {} : JSON.parse(raw))
      } catch {
        reject(new ApiError('invalid-json', '请求体不是合法 JSON'))
      }
    })
    request.on('error', reject)
  })
}

async function handleApi(request, response, ctx) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: { code: 'method-not-allowed', message: '只接受 POST' } })
    return
  }
  if (!sameOrigin(request)) {
    sendJson(response, 403, { ok: false, error: { code: 'cross-origin', message: '只允许同源调用' } })
    return
  }

  let body
  try {
    body = await readBody(request)
  } catch (error) {
    const code = error instanceof ApiError ? error.code : 'invalid-json'
    sendJson(response, 400, { ok: false, error: { code, message: error.message } })
    return
  }

  const method = API_METHODS[body?.method]
  if (method === undefined) {
    sendJson(response, 400, { ok: false, error: { code: 'unknown-method', message: '未知的调用' } })
    return
  }

  // 安装与卸载会跑 pnpm，可能持续数分钟，先摘掉这条连接的空闲超时。
  request.setTimeout?.(0)
  response.setTimeout?.(0)

  try {
    const result = await method(ctx, body.params ?? {})
    sendJson(response, 200, { ok: true, result: result ?? null })
  } catch (error) {
    const code = error instanceof ApiError ? error.code : error?.code ?? 'operation-error'
    const message = error instanceof Error ? error.message : String(error)
    sendJson(response, code === 'service-unavailable' ? 503 : 400, {
      ok: false,
      error: { code, message, diagnostic: message },
    })
  }
}

async function handler(request, response, ctx) {
  let pathname
  try {
    pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  } catch {
    sendText(response, 400, 'Bad Request')
    return
  }

  if (pathname === API_ROUTE) {
    await handleApi(request, response, ctx)
    return
  }

  const method = request.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    sendText(response, 405, 'Method Not Allowed')
    return
  }

  // 少了尾斜杠时相对资源会解析到站点根目录，必须补上。
  if (pathname === ROUTE) {
    response.writeHead(308, { location: ROUTE_PREFIX, 'cache-control': 'no-store' })
    response.end()
    return
  }
  if (!pathname.startsWith(ROUTE_PREFIX)) {
    sendText(response, 404, 'Not Found')
    return
  }

  const target = resolveTarget(pathname)
  if (target.kind === 'bad') {
    sendText(response, 400, 'Bad Request')
    return
  }
  if (target.kind === 'denied') {
    sendText(response, 403, 'Forbidden')
    return
  }

  if (await serveFile(request, response, target.file)) return

  // 未构建：给出可执行的修复提示，而不是让面板空白。
  if (!fs.existsSync(ENTRY)) {
    sendText(
      response,
      503,
      '插件中心前端未构建：本包内缺少 web/index.html。\n' +
        '请在本仓库运行 npm run build（web/ 随包提交），然后重启 DeepSeek Harness。\n',
    )
    return
  }

  // 无扩展名的路径回落到入口页，便于以后加前端路由。
  if (!path.extname(target.file) && (await serveFile(request, response, ENTRY))) return

  sendText(response, 404, 'Not Found')
}

export function apply(ctx) {
  ctx.inject(['webServer'], (scoped) => {
    scoped.effect(
      () =>
        scoped.webServer.register({
          kind: 'prefix',
          path: ROUTE,
          handler: (request, response) => {
            handler(request, response, ctx).catch((error) => {
              if (!response.headersSent) sendText(response, 500, 'Internal Server Error')
              else response.destroy()
              console.error('[deepseekbox] 路由处理失败：', error)
            })
          },
        }),
      'deepseekbox:web-route',
    )
  })
}
