/**
 * PlugBox 插件中心 —— Client 半边（宿主浏览器的行李在这一半）。
 *
 * 浏览器侧只注册两件事：侧栏入口（sidebar.panellist）与主面板（main）。
 * 面板内容是同源 iframe，指向 Host 半边提供的 /plugbox/ 静态页，
 * 也就是仓库里 Vue 单页应用的构建产物。
 */
window.__ModuleLoader__.load({
  id: 'plugbox',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'plugBox'
    const PANEL_ID = 'plugbox-plugin-center'
    const ROUTE = '/plugbox/'

    const COPY = {
      zh: {
        'panel.title': '插件中心',
        'panel.loading': '正在打开插件中心…',
        'error.not-built': '插件中心前端未构建：包内缺少 web/index.html。请在仓库运行 npm run build 后重启宿主窗口。',
        'error.not-found': '插件中心路由未注册：请确认插件已启用。',
        'error.network': '无法连接插件中心页面，请重试。',
        'error.unknown': '插件中心加载失败。',
        'action.retry': '重试',
      },
      en: {
        'panel.title': 'Plugin Center',
        'panel.loading': 'Opening the plugin center…',
        'error.not-built': 'The plugin center frontend is not built: web/index.html is missing. Run npm run build in the repository, then restart the host window.',
        'error.not-found': 'The plugin center route is not registered. Make sure the plugin is enabled.',
        'error.network': 'Cannot reach the plugin center page. Try again.',
        'error.unknown': 'The plugin center failed to load.',
        'action.retry': 'Retry',
      },
    }

    function CenterIcon(props) {
      const size = props && props.size ? props.size : 16
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: props && props.active ? 1.8 : 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M3 6.5V3.5h3M13 9.5v3h-3M9.5 3h3v3M6.5 13h-3v-3' }),
        h('rect', { x: 6, y: 6, width: 4, height: 4, rx: 1 }),
      )
    }

    function createPanel(t) {
      return function PluginCenterPanel() {
        const [state, setState] = React.useState({ kind: 'loading' })
        const requested = React.useRef(false)

        const open = React.useCallback(async () => {
          setState({ kind: 'loading' })
          try {
            const response = await fetch(ROUTE, { credentials: 'same-origin', cache: 'no-store' })
            if (response.ok) {
              setState({ kind: 'ready' })
              return
            }
            const code = response.status === 503 ? 'not-built' : response.status === 404 ? 'not-found' : 'unknown'
            setState({ kind: 'error', code })
          } catch {
            setState({ kind: 'error', code: 'network' })
          }
        }, [])

        React.useEffect(() => {
          if (requested.current) return
          requested.current = true
          open()
        }, [open])

        if (state.kind === 'ready') {
          return h('iframe', {
            title: t('panel.title'),
            src: ROUTE,
            style: { border: 0, width: '100%', height: '100%', display: 'block', background: 'transparent' },
          })
        }

        const text =
          state.kind === 'error' ? t(`error.${state.code}`) : t('panel.loading')

        return h(
          'div',
          { style: { padding: 24, display: 'grid', gap: 12, maxWidth: 460, color: 'inherit' } },
          h('h2', { style: { margin: 0, fontSize: 16, fontWeight: 600 } }, t('panel.title')),
          h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.72 } }, text),
          state.kind === 'error'
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: open,
                  style: {
                    justifySelf: 'start',
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid currentColor',
                    background: 'transparent',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                  },
                },
                t('action.retry'),
              )
            : null,
        )
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, COPY), 'plugbox:copy')
        const t = ctx.locale.bind(NS)
        const Panel = createPanel(t)
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => t('panel.title'), locale: NS },
            CenterIcon,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Panel),
        )
      },
    }
  },
})
