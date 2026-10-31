/**
 * zcode 的 DeepSeek Harness 适配器。
 *
 * 它和 DeepSeek Harness 跑在同一套 Cordis 宿主运行时上，所以复用同一个协议族实现，
 * 差异只在 descriptor 里：挂载前缀、面板 id、locale 命名空间都要避开原生版，
 * 免得同一个宿主里两个产物抢同一批 key。
 *
 * ⚠️ verified: false —— 下面三条在真机上没有验证过，所以在回到即插即用之前，
 * 它不会被自动选为当前宿主。要接 NHS 的同学先补掉 openQuestions，再把这里改成 true。
 */

import { createCordisAdapter } from '../cordis'
import type { HostAdapter } from '../types'

export const zcodeDshAdapter: HostAdapter = createCordisAdapter({
  id: 'zcode-dsh',
  displayName: 'zcode DeepSeek Harness',
  routePrefix: '/plugbox-zcode',
  panelId: 'plugbox-zcode-plugin-center',
  moduleId: 'plugbox-zcode',
  localeNamespace: 'plugBoxZcode',
  effectKeyPrefix: 'plugbox-zcode',
  vendorLabels: ['official'],
  // 没有核实过它自带包的 scope，留空：宁可把官方包当成第三方显示，也不要乱认亲
  vendorScopes: [],
  profileHint: '桌面版 profile 名待核实',
  verified: false,
  openQuestions: [
    'profile 名：安装命令里要写 --profile <值>，当前按 desktop 兜底，需要在真实环境核实',
    '侧栏槽位：是否同样提供 sidebar.panellist 与 main 两个已验证槽位',
    '索引格式：宿主「发现」页是否接受与同族宿主相同的 market index format 1',
    '自带包 scope：这版宿主是否同样用 @deepseek-ai/ 作为官方包命名空间',
  ],
})
