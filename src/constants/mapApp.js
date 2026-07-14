// 地图视图默认值集中放在这里，避免组件和组合函数里散落魔法数字。
export const INITIAL_ZOOM = -2
export const MIN_ZOOM = -3
export const MAX_ZOOM = 1
export const MAP_ZOOM_SNAP = 0.25
export const PICTURE_IN_PICTURE_ZOOM_OFFSET = 1

// localStorage key 统一管理，后续改名或做数据迁移时只需要改一处。
export const MARKER_FILTERS_STORAGE_KEY = 'nte-marker-filters'
export const ROUTES_STORAGE_KEY = 'nte-routes'
export const COMPLETED_STORAGE_KEY = 'nte-completed'
export const FAVORITES_STORAGE_KEY = 'nte-favorites'

// 本地导航服务默认监听地址；生产环境可通过 Vite 环境变量覆盖。
// 别把客户端连接地址改成 ws://0.0.0.0，0.0.0.0 是服务端监听占位，不是浏览器该连的目标。
export const DEFAULT_NAVIGATION_WEBSOCKET_URL =
  import.meta.env.VITE_MAANTE_NAVI_WEBSOCKET_URL || 'ws://127.0.0.1:14514'

// 导航跟随参数用于抑制跳动，让地图居中移动保持平滑。
export const NAVIGATION_RECONNECT_DELAY = 2000
export const NAVIGATION_CENTER_TOLERANCE_PX = 28
export const NAVIGATION_CENTER_SMOOTHING = 0.18
export const NAVIGATION_CENTER_MAX_STEP_PX = 48

// 默认折叠的分类组，文案必须和数据里的 group 字段保持一致。
export const DEFAULT_COLLAPSED_CATEGORY_GROUPS = {
}

// 只有这些分类组支持在侧栏中折叠。
export const COLLAPSIBLE_CATEGORY_GROUP_LABELS = []

// 定义主地图
export const OVERVIEW_LAYER_ID = 'mainland'
