/**
 * DeepSeek Harness 适配器。
 *
 * 这是 plugbox 目前唯一实测过的宿主：整套组合包机制（patch / Client 注册 /
 * webServer 同源前缀 / pluginManager + pluginMarket 两个服务）都跑过真机。
 * verified: true 是它区别于其他同族适配器的地方，也是它被选为默认的原因。
 *
 * 协议实现全部在 ../cordis.ts 的工厂里，这个文件只描述「这个宿主是谁」。
 */

import { createCordisAdapter } from '../cordis'
import type { HostAdapter } from '../types'

export const dshAdapter: HostAdapter = createCordisAdapter({
  id: 'dsh',
  displayName: 'DeepSeek Harness',
  routePrefix: '/plugbox',
  panelId: 'plugbox-plugin-center',
  moduleId: 'plugbox',
  localeNamespace: 'plugBox',
  effectKeyPrefix: 'plugbox',
  vendorLabels: ['official'],
  // 宿主官方自带包的 npm scope：命中即算「随安装附带」，不是第三方插件
  vendorScopes: ['@deepseek-ai/'],
  profileHint: 'desktop / web',
  verified: true,
})

/**
 * 该宿主侧独有的、装不进去的那些硬条件。
 * 它们之所以集中在这里而不是散落在自检脚本各处，是因为「能不能当插件装」
 * 永远是宿主说了算；换宿主就换这份清单。
 */
export const DSH_INSTALL_REQUIREMENTS = [
  'package.json 声明 dsh.bundle.patch，且指向的 patch 文件存在',
  '声明 dsh.client.platform 时，exports 必须能解析到 ./client',
  'engines.dsh 要覆盖宿主运行时版本（判定由宿主用 semver 带 includePrerelease 完成）',
] as const
