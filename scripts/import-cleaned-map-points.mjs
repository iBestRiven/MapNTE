import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const MAP_DATA_PATH = path.join(ROOT_DIR, 'src', 'data', 'map-data.json')

const IMPORT_TAG = 'cleaned-map-point-import'
const LEGACY_IMPORT_TAGS = new Set([
  IMPORT_TAG,
  'cleaned-treasurebox-import',
])

const AREA_BY_ID = {
  '4N_A': { district: '绵绵村', layerId: 'village' },
  '4N_B': { district: '巧克力火山', layerId: 'volcano' },
  '4N_C': { district: '牛奶雪冰山', layerId: 'snow-mountain' },
  '4N_D': { district: '琥珀湖', layerId: 'lake' },
  '4N_E': { district: '赤龙古堡', layerId: 'castle' },
  '4N_Main': { district: '沃伦大陆', layerId: 'mainland' },
}

const SOURCES = [
  {
    file: 'cleaned_treasurebox.json',
    idPrefix: 'treasurebox',
    categoryId: 'treasurebox-normal',
    group: '宝箱',
    label: '普通宝箱',
    locationName: '普通宝箱',
    iconUrl: '/icons/YH_UI_mapicon_baoxiang_1.png',
    color: '#d7a94b',
  },
  {
    file: 'cleaned_dicetreasurebox.json',
    idPrefix: 'dice-treasurebox',
    categoryId: 'treasurebox-dice',
    group: '宝箱',
    label: '骰子宝箱',
    locationName: '骰子宝箱',
    iconUrl: '/icons/YH_UI_mapicon_baoxiang_2.png',
    color: '#8fbbd9',
  },
  {
    file: 'cleaned_quest_fixed_map_icon.json',
    idPrefix: 'quest',
    categoryId: 'quest',
    group: '任务',
    label: '任务',
    iconUrl: '/icons/sidequest.png',
    color: '#7ec7ff',
  },
]

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value))
}

function sanitizeId(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function deriveNamePrefix(name) {
  const parts = String(name).split('_').filter(Boolean)
  while (parts.length > 1 && /^\d+$/.test(parts.at(-1))) {
    parts.pop()
  }
  return parts.join('_') || String(name)
}

function normalizeRow(row, source) {
  if (!row || typeof row !== 'object') return null
  const areaId = String(row.AreaId || row.areaId || '').trim()
  const area = AREA_BY_ID[areaId]
  const location = row.location || row.Location || {}
  const x = Number(location.X ?? location.x)
  const y = Number(location.Y ?? location.y)
  const z = Number(location.Z ?? location.z)
  const name = String(row.name || '').trim()

  if (!name || !area || !isFiniteNumber(x) || !isFiniteNumber(y)) return null

  const namePrefix = deriveNamePrefix(name)
  const tags = [
    source.label,
    areaId,
    area.district,
    namePrefix,
  ]

  return {
    category: {
      id: source.categoryId,
      group: source.group,
      label: source.label,
      iconUrl: source.iconUrl,
      color: source.color,
      importTag: IMPORT_TAG,
    },
    location: {
      id: `${source.idPrefix}-${sanitizeId(name)}`,
      name: source.locationName || name,
      types: [source.categoryId],
      district: area.district,
      layerId: area.layerId,
      areaId,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      ...(isFiniteNumber(z) ? { z: Number(z.toFixed(3)) } : {}),
      coordinateSource: 'game-location',
      ...(Number.isInteger(row.index) ? { sourceIndex: row.index } : {}),
      sourceTable: source.file,
      sourceName: name,
      sourceNamePrefix: namePrefix,
      tags,
      images: [],
      importTag: IMPORT_TAG,
    },
  }
}

function loadSourceRows(source) {
  const filePath = path.join(ROOT_DIR, source.file)
  const rows = readJson(filePath)
  if (!Array.isArray(rows)) {
    throw new Error(`${source.file} should contain a JSON array`)
  }
  return rows.map((row) => normalizeRow(row, source)).filter(Boolean)
}

function byLabelThenId(left, right) {
  return (left.group || '').localeCompare(right.group || '', 'zh-CN')
    || (left.label || '').localeCompare(right.label || '', 'zh-CN')
    || left.id.localeCompare(right.id, 'zh-CN')
}

function main() {
  const mapData = readJson(MAP_DATA_PATH)
  const imported = SOURCES.flatMap(loadSourceRows)

  const categoryById = new Map()
  const locationById = new Map()
  for (const item of imported) {
    categoryById.set(item.category.id, item.category)
    locationById.set(item.location.id, item.location)
  }

  mapData.categories = [
    ...(Array.isArray(mapData.categories) ? mapData.categories : [])
      .filter((category) => !LEGACY_IMPORT_TAGS.has(category?.importTag)),
    ...[...categoryById.values()].sort(byLabelThenId),
  ]
  mapData.locations = [
    ...(Array.isArray(mapData.locations) ? mapData.locations : [])
      .filter((location) => !LEGACY_IMPORT_TAGS.has(location?.importTag)),
    ...[...locationById.values()].sort((left, right) => (
      (left.layerId || '').localeCompare(right.layerId || '', 'zh-CN')
      || (left.sourceTable || '').localeCompare(right.sourceTable || '', 'zh-CN')
      || (left.sourceIndex ?? Number.MAX_SAFE_INTEGER) - (right.sourceIndex ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, 'zh-CN')
    )),
  ]

  writeJson(MAP_DATA_PATH, mapData)

  const skippedCount = SOURCES.reduce((sum, source) => {
    const rows = readJson(path.join(ROOT_DIR, source.file))
    return sum + rows.length
  }, 0) - imported.length

  console.log(`[OK] categories: ${categoryById.size}`)
  console.log(`[OK] locations: ${locationById.size}`)
  if (skippedCount) console.log(`[WARN] skipped rows: ${skippedCount}`)
  console.log(`[OK] wrote ${path.relative(ROOT_DIR, MAP_DATA_PATH)}`)
}

main()
