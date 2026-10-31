/**
 * 产品自身的身份常量。
 *
 * 界面上所有写死的品牌名都从这里取。改一次包产品线 slogan 不用满仓库找字符串——
 * 更关键的是：改成从这里取之后，这些文案就不再隐含「某个引擎」了，
 * 宿主相关的展示名一律从当前适配器读（见 HostAdapter.labels）。
 */

export const BRAND = {
  name: 'PlugBox',
  /** npm 包名，同时也是宿主 patch 的 name */
  packageName: 'plugbox',
  /** 中文一句话定位 */
  tagline: '插件适配与管理工具',
  description: '面向所有支持自定义插件的引擎层与智能体层工具的插件适配与管理工具。',
  homepage: 'https://github.com/Wcof/PlugBox',
  repository: 'Wcof/PlugBox',
  /** 本仓库发布的索引里用于标记「收录」的关键词 */
  catalogMarker: 'plugbox',
  /** 社区目录条目额外打的标记：说明条目来自第三方站点同步 */
  communityMarker: 'community',
  /** 自家精选索引与社区目录的文件名 */
  curatedIndexFile: 'index.json',
  communityIndexFile: 'community.json',
} as const

/** 首页那段「这是什么」的开场白 */
export function introLine(): string {
  return `${BRAND.name} 是一个${BRAND.tagline}：同一批插件在同一个界面里管理，宿主差异交给适配器。`
}
