/**
 * DeepSeekBox 插件中心 —— Host 半边。
 *
 * 只做一件事：把随包提交的 `web/`（Vue 构建产物）挂在同源前缀路由 `/deepseekbox/` 上，
 * 供 Client 半边在侧栏入口里用 iframe 打开。不读用户数据、不写文件、不另起端口。
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

async function handler(request, response) {
  const method = request.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    sendText(response, 405, 'Method Not Allowed')
    return
  }

  let pathname
  try {
    pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  } catch {
    sendText(response, 400, 'Bad Request')
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
            handler(request, response).catch((error) => {
              if (!response.headersSent) sendText(response, 500, 'Internal Server Error')
              else response.destroy()
              console.error('[deepseekbox] 静态路由处理失败：', error)
            })
          },
        }),
      'deepseekbox:web-route',
    )
  })
}
