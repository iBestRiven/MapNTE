import { MARKER_FILTERS_STORAGE_KEY } from '../constants/mapApp'

// localStorage 读取失败时统一降级，避免坏数据导致应用启动失败。
export function readStoredIds(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch {
    return new Set()
  }
}

export function readStoredMarkerFilters() {
  try {
    return JSON.parse(localStorage.getItem(MARKER_FILTERS_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

// 地图视角和筛选项存放在同一份配置里，这里只负责取出合法的视角字段。
export function readStoredMapView() {
  const storedFilters = readStoredMarkerFilters()
  const mapView = storedFilters?.mapView
  if (!mapView || typeof mapView !== 'object') return null

  const lat = Number(mapView.lat)
  const lng = Number(mapView.lng)
  const zoom = Number(mapView.zoom)

  if (![lat, lng, zoom].every(Number.isFinite)) return null
  return { lat, lng, zoom }
}
