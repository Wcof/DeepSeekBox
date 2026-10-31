/**
 * 生命周期：核心只定义「做什么」，不定义「怎么调」。
 *
 * 每个动词具体落到宿主的哪个方法上，由 HostAdapter.methods 翻译。
 * 结果也统一成 OperationResult：宿主返回的花样（重启、被覆盖、分阶段失败）
 * 在这里归一，UI 不必为每个宿主写一套分支。
 */

import type { CanonicalPlugin } from '../protocol/plugin'
import type { CanonicalMethod, HostAdapter } from '../../adapters/types'

export interface LifecycleRequest {
  method: CanonicalMethod
  target?: string
  version?: string
  enabled?: boolean
  /** 宿主自有参数，原样透传 */
  extra?: Record<string, unknown>
}

/** 宿主真正被调用的方法名 */
export function methodOf(adapter: HostAdapter, method: CanonicalMethod): string {
  return adapter.methods[method]
}

/** 一次操作的可读写法：both这一版先给出结构，真正的调用由 transport 层补 */
export function buildRequest(
  adapter: HostAdapter,
  request: LifecycleRequest,
): { method: string; params: Record<string, unknown> } {
  const params: Record<string, unknown> = { ...(request.extra ?? {}) }
  if (request.target !== undefined) params.target = request.target
  if (request.version !== undefined) params.version = request.version
  if (request.enabled !== undefined) params.enabled = request.enabled
  return { method: methodOf(adapter, request.method), params }
}

/** 安装源：由适配器翻译 canonical 描述 */
export function installTarget(
  plugin: CanonicalPlugin,
  adapter: HostAdapter,
  version?: string,
): string | undefined {
  return adapter.installSpec(plugin, version)
}

export type OperationOutcome =
  | 'applied'
  | 'cancelled'
  | 'failed'
  | 'restart-required'
  | 'overridden'

export type OperationStage = 'remove' | 'install' | 'enable'

export interface OperationResult {
  changed: boolean
  application: OperationOutcome
  stage: OperationStage
  target: string
  enabled?: boolean
  restartReason?: string
}
