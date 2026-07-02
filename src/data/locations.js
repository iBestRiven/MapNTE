import mapData from './map-data.json'
import coordinateCalibration from './navi-coordinate-calibration.json'

export const initialMapData = mapData
export const MAP_CONFIG = mapData.map
export const MAP_WIDTH = MAP_CONFIG.width
export const MAP_HEIGHT = MAP_CONFIG.height
export const TILE_SIZE = MAP_CONFIG.tileSize
export const MAP_LOCATOR_SOURCE_WIDTH =
  coordinateCalibration.sourceWidth || MAP_CONFIG.mapLocatorSourceWidth || 11264
export const MAP_LOCATOR_SOURCE_HEIGHT =
  coordinateCalibration.sourceHeight || MAP_CONFIG.mapLocatorSourceHeight || 11264

let activeCoordinateCalibration = normalizeCoordinateCalibration(coordinateCalibration)
let activeAffine = solveAffine(activeCoordinateCalibration.points)

function normalizeCalibrationPoint(point) {
  const raw = Array.isArray(point?.raw) ? point.raw.map(Number) : []
  const map = Array.isArray(point?.map) ? point.map.map(Number) : []
  if (!Number.isFinite(raw[0]) || !Number.isFinite(raw[1]) || !Number.isFinite(map[0]) || !Number.isFinite(map[1])) {
    return null
  }
  return {
    raw: [
      raw[0],
      raw[1],
      Number.isFinite(raw[2]) ? raw[2] : 0,
    ],
    map: [map[0], map[1]],
  }
}

export function normalizeCoordinateCalibration(value) {
  const sourceWidth = Number(value?.sourceWidth)
  const sourceHeight = Number(value?.sourceHeight)
  const points = Array.isArray(value?.points)
    ? value.points.map(normalizeCalibrationPoint).filter(Boolean).slice(0, 3)
    : []

  return {
    version: Number(value?.version) || 1,
    sourceWidth: Number.isFinite(sourceWidth) && sourceWidth > 0 ? sourceWidth : MAP_LOCATOR_SOURCE_WIDTH,
    sourceHeight: Number.isFinite(sourceHeight) && sourceHeight > 0 ? sourceHeight : MAP_LOCATOR_SOURCE_HEIGHT,
    points,
  }
}

function solveAffine(points) {
  if (!Array.isArray(points) || points.length < 3) throw new Error('至少需要 3 个坐标标定点')
  const [first, second, third] = points
  const [x1, y1] = first.raw
  const [x2, y2] = second.raw
  const [x3, y3] = third.raw
  const determinant = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
    throw new Error('坐标标定点共线，无法建立仿射变换')
  }

  function coefficients(index) {
    const value1 = first.map[index]
    const value2 = second.map[index]
    const value3 = third.map[index]
    return {
      x: (value1 * (y2 - y3) + value2 * (y3 - y1) + value3 * (y1 - y2)) / determinant,
      y: (value1 * (x3 - x2) + value2 * (x1 - x3) + value3 * (x2 - x1)) / determinant,
      offset: (
        value1 * (x2 * y3 - x3 * y2)
        + value2 * (x3 * y1 - x1 * y3)
        + value3 * (x1 * y2 - x2 * y1)
      ) / determinant,
    }
  }

  const mapX = coefficients(0)
  const mapY = coefficients(1)
  const inverseDeterminant = mapX.x * mapY.y - mapX.y * mapY.x
  if (!Number.isFinite(inverseDeterminant) || Math.abs(inverseDeterminant) < 1e-12) {
    throw new Error('坐标标定矩阵不可逆')
  }

  return {
    mapX,
    mapY,
    inverseDeterminant,
  }
}

export const COORDINATE_CALIBRATION = activeCoordinateCalibration

export function getCoordinateCalibration() {
  return activeCoordinateCalibration
}

export function setCoordinateCalibration(value) {
  const normalized = normalizeCoordinateCalibration(value)
  const nextAffine = solveAffine(normalized.points)
  activeCoordinateCalibration = normalized
  activeAffine = nextAffine
  return activeCoordinateCalibration
}

export function gameToMapPixel({ x, y }) {
  const gameX = Number(x)
  const gameY = Number(y)
  return {
    pixelX: activeAffine.mapX.x * gameX + activeAffine.mapX.y * gameY + activeAffine.mapX.offset,
    pixelY: activeAffine.mapY.x * gameX + activeAffine.mapY.y * gameY + activeAffine.mapY.offset,
  }
}

export function mapPixelToGame({
  pixelX,
  pixelY,
  sourceWidth = MAP_LOCATOR_SOURCE_WIDTH,
  sourceHeight = MAP_LOCATOR_SOURCE_HEIGHT,
}) {
  const calibratedX = Number(pixelX) * MAP_LOCATOR_SOURCE_WIDTH / Number(sourceWidth)
  const calibratedY = Number(pixelY) * MAP_LOCATOR_SOURCE_HEIGHT / Number(sourceHeight)
  const shiftedX = calibratedX - activeAffine.mapX.offset
  const shiftedY = calibratedY - activeAffine.mapY.offset
  return {
    x: (shiftedX * activeAffine.mapY.y - activeAffine.mapX.y * shiftedY) / activeAffine.inverseDeterminant,
    y: (activeAffine.mapX.x * shiftedY - shiftedX * activeAffine.mapY.x) / activeAffine.inverseDeterminant,
  }
}

export function mapPixelToMapLatLng({ pixelX, pixelY, sourceWidth = MAP_WIDTH, sourceHeight = MAP_HEIGHT }) {
  return [
    -pixelY * MAP_HEIGHT / sourceHeight,
    pixelX * MAP_WIDTH / sourceWidth,
  ]
}

export function mapLatLngToMapLocator(
  { lat, lng },
  sourceWidth = MAP_LOCATOR_SOURCE_WIDTH,
  sourceHeight = MAP_LOCATOR_SOURCE_HEIGHT,
) {
  return {
    pixelX: lng * sourceWidth / MAP_WIDTH,
    pixelY: -lat * sourceHeight / MAP_HEIGHT,
  }
}

export function gameToMapLatLng(point) {
  return mapPixelToMapLatLng({
    ...gameToMapPixel(point),
    sourceWidth: MAP_LOCATOR_SOURCE_WIDTH,
    sourceHeight: MAP_LOCATOR_SOURCE_HEIGHT,
  })
}

export function mapLatLngToGame(latlng) {
  return mapPixelToGame(mapLatLngToMapLocator(latlng))
}

// 仅用于读取坐标重构前导出的点位/路线文件。
export function legacyWorldToGame({ lat, lng }) {
  return mapPixelToGame({
    pixelX: MAP_LOCATOR_SOURCE_WIDTH / 2 + Number(lng) * 22,
    pixelY: MAP_LOCATOR_SOURCE_HEIGHT / 2 - Number(lat) * 22,
  })
}
