/**
 * 运行时宿主上下文：面板当前跑在哪个宿主里、怎么够到它的 RPC。
 *
 * 这一层是必要的妥协——浏览器毕竟跑在宿主里，总得有个读取当前宿主的入口。
 * 但读取结果必须是一个适配器对象，后面所有决策都只看这个对象，
 * 不许再散落任何 host 专属判断。
 */

import type { HostAdapter } from '../adapters/types'

/**
 * iframe 里的页面挂在适配器的 routePrefix 下，所以 RPC 端点用相对路径求，
 * 免得硬编码前缀（同一个产物换宿主挂载点时不用改代码）。
 */
export function rpcPathOf(adapter: HostAdapter): string {
  const relative = adapter.ui.rpcPath.replace(adapter.ui.routePrefix, '').replace(/^\/+/, '')
  return relative.length > 0 ? `./${relative}` : './api/rpc'
}
