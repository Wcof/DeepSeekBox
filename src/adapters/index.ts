/**
 * 适配层出口。
 *
 * 核心与 UI 都只从这里 import 适配器相关能力，不要再深入 adapters/<具体宿主>/ ，
 * 否则「换宿主只换适配器」就名存实亡了。
 */

export type {
  HostAdapter,
  HostAdapterId,
  CanonicalMethod,
  UiBinding,
  LabelBinding,
  CatalogBinding,
  ManifestBinding,
  ManifestView,
  RawManifest,
  ResourceBinding,
  ResourceClaim,
} from './types'

export { ADAPTERS, adapterById, resolveAdapter, activeAdapter } from './registry'
export { createCordisAdapter } from './cordis'
export type { CordisDescriptor } from './cordis'
export { dshAdapter, DSH_INSTALL_REQUIREMENTS } from './dsh'
export { zcodeDshAdapter } from './zcode-dsh'
