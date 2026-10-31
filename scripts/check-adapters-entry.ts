/**
 * 适配器检查入口。
 *
 * 单独拆出来是因为 check-adapters.mjs 要在 Node 里直接执行 TypeScript，
 * 而 Node 的类型剥离认不了省略扩展名的相对引用。所以先由 esbuild 把需要的东西
 * 打成一个临时模块再动态引入——源码里依旧保持省略扩展名的写法。
 */

export { ADAPTERS, adapterById, resolveAdapter, activeAdapter } from '../src/adapters/registry'
export { BRAND } from '../src/core/protocol/brand'
export { readManifest, writeManifest } from '../src/core/manifest/index'
