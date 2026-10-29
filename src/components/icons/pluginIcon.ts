import { ICONS, type IconName } from './iconNames'

/** 插件卡片图标：按收录库声明的 icon 名映射，未知值回退为拼图图标 */
export function pluginIconName(icon: string | undefined): IconName {
  return icon && icon in ICONS ? (icon as IconName) : 'puzzle'
}
