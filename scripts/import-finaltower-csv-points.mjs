import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const MAP_DATA_PATH = path.join(ROOT_DIR, 'src', 'data', 'map-data.json')
const DEFAULT_CSV_PATH = path.join(ROOT_DIR, 'DT', 'finaltower_coords_with_area_meta.csv')
const CSV_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : fs.existsSync(DEFAULT_CSV_PATH)
    ? DEFAULT_CSV_PATH
    : path.join(ROOT_DIR, 'finaltower_coords_with_area.csv')

const IMPORT_TAG = 'finaltower-csv-point-import'
const MINIGAME_CATEGORY_ID = 'minigame'
const MINIGAME_ICON_URL = '/icons/YH_UI_Mapicon_130_128.png'
const CAMPFIRE_ICON_URL = '/icons/YH_UI_Mapicon_126_128.png'

const AREA_BY_ID = {
  '4N_A': { district: '绵绵村', layerId: 'village' },
  '4N_B': { district: '巧克力火山', layerId: 'volcano' },
  '4N_C': { district: '牛奶雪冰山', layerId: 'snow-mountain' },
  '4N_D': { district: '琥珀湖', layerId: 'lake' },
  '4N_E': { district: '赤龙古堡', layerId: 'castle' },
  '4N_Main': { district: '沃伦大陆', layerId: 'mainland' },
}

const CATEGORY_BY_NAME = {
  Campfire: {
    id: 'finaltower-campfire',
    group: '传送点',
    label: '篝火',
    iconUrl: CAMPFIRE_ICON_URL,
    color: '#f06f32',
  },
  Portal: {
    id: 'finaltower-portal',
    group: '传送点',
    label: '传送法阵',
    icon: '传',
    color: '#5b8def',
  },
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += char
    }
  }

  values.push(value)
  return values
}

function splitCsvRecords(text) {
  const records = []
  let record = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      record += char
      record += next
      index += 1
    } else if (char === '"') {
      quoted = !quoted
      record += char
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (record.length) records.push(record)
      record = ''
      if (char === '\r' && next === '\n') index += 1
    } else {
      record += char
    }
  }

  if (record.length) records.push(record)
  return records
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = splitCsvRecords(text).filter((line) => line.length)
  if (!lines.length) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, headerIndex) => [
      header,
      values[headerIndex] ?? '',
    ]))
    return { ...row, index }
  })
}

function finiteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(3)) : null
}

function sanitizeId(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function normalizeCategory(row) {
  const categoryName = String(row.category || '').trim()
  const relatedAction = String(row.related_action_cn || '').trim()
  const areaSource = String(row.area_source || '').trim()
  if (categoryName === 'Portal' && areaSource === 'portal_label_mainland' && relatedAction === '特殊挑战') {
    return {
      id: MINIGAME_CATEGORY_ID,
      group: '探索',
      label: '小游戏',
      iconUrl: MINIGAME_ICON_URL,
      color: '#8fcf6a',
    }
  }

  const base = CATEGORY_BY_NAME[categoryName] || {
    id: `finaltower-${sanitizeId(categoryName || 'unknown')}`,
    group: '传送点',
    label: categoryName || 'Unknown',
    icon: (categoryName || '?').slice(0, 2).toUpperCase(),
    color: '#7b8fa6',
  }
  return {
    ...base,
    ...(row.object_type_cn ? { label: row.object_type_cn } : {}),
  }
}

function normalizeRow(row) {
  const areaId = String(row.area_id || row.nearest_area_id || '').trim()
  const area = AREA_BY_ID[areaId]
  const x = finiteNumber(row.x)
  const y = finiteNumber(row.y)
  const z = finiteNumber(row.z)
  const categoryName = String(row.category || '').trim()
  const fallbackLabel = String(row.label || row.name || '').trim()
  const label = String(row.display_name_cn || fallbackLabel).trim()
  const sourceName = String(row.name || '').trim()
  const sourceType = String(row.type || '').trim()
  const objectType = String(row.object_type_cn || '').trim()
  const description = String(row.description_cn || '').trim()
  const metadataNote = String(row.metadata_note || '').trim()
  const relatedAction = String(row.related_action_cn || '').trim()
  const gameplayName = String(row.gameplay_name_cn || '').trim()

  if (categoryName === 'FireTransferDrop') return null
  if (!area || x === null || y === null || !label) return null

  const category = normalizeCategory(row)
  const tags = [...new Set([
    category.label,
    label,
    fallbackLabel,
    objectType,
    areaId,
    area.district,
    row.area_name_cn,
    row.area_desc_cn,
    row.layer_name_cn,
    relatedAction,
    gameplayName,
    metadataNote,
    sourceType,
  ].filter(Boolean))]

  return {
    category: {
      ...category,
      importTag: IMPORT_TAG,
    },
    location: {
      id: `finaltower-${sanitizeId(categoryName)}-${sanitizeId(sourceName || `${label}-${row.index}`)}`,
      name: label,
      types: [category.id],
      district: area.district,
      layerId: area.layerId,
      areaId,
      x,
      y,
      ...(z !== null ? { z } : {}),
      ...(finiteNumber(row.pitch) !== null ? { pitch: finiteNumber(row.pitch) } : {}),
      ...(finiteNumber(row.yaw) !== null ? { yaw: finiteNumber(row.yaw) } : {}),
      ...(finiteNumber(row.roll) !== null ? { roll: finiteNumber(row.roll) } : {}),
      ...(description ? { description } : {}),
      coordinateSource: row.coord_source || 'finaltower-csv',
      sourceIndex: row.index,
      sourceTable: path.basename(CSV_PATH),
      sourceCategory: categoryName,
      sourceLabel: fallbackLabel,
      sourceDisplayName: label,
      sourceName,
      sourceType,
      objectTypeCn: objectType,
      finaltowerNameCn: row.finaltower_name_cn || '',
      areaNameCn: row.area_name_cn || '',
      areaDescriptionCn: row.area_desc_cn || '',
      layerNameCn: row.layer_name_cn || '',
      relatedActionCn: relatedAction,
      gameplayKey: row.gameplay_key || '',
      gameplayNameCn: gameplayName,
      metadataSource: row.metadata_source || '',
      metadataConfidence: row.metadata_confidence || '',
      metadataNote,
      areaSource: row.area_source || '',
      nearestRefId: row.nearest_ref_id || '',
      nearestAreaId: row.nearest_area_id || '',
      tags,
      images: [],
      importTag: IMPORT_TAG,
    },
  }
}

function byLabelThenId(left, right) {
  return (left.group || '').localeCompare(right.group || '', 'zh-CN')
    || (left.label || '').localeCompare(right.label || '', 'zh-CN')
    || left.id.localeCompare(right.id, 'zh-CN')
}

function main() {
  const mapData = readJson(MAP_DATA_PATH)
  const rows = readCsv(CSV_PATH)
  const imported = rows.map(normalizeRow).filter(Boolean)

  const categoryById = new Map()
  const locationById = new Map()
  for (const item of imported) {
    categoryById.set(item.category.id, item.category)
    locationById.set(item.location.id, item.location)
  }

  mapData.categories = [
    ...(Array.isArray(mapData.categories) ? mapData.categories : [])
      .filter((category) => category?.importTag !== IMPORT_TAG),
    ...[...categoryById.values()].sort(byLabelThenId),
  ]

  mapData.locations = [
    ...(Array.isArray(mapData.locations) ? mapData.locations : [])
      .filter((location) => location?.importTag !== IMPORT_TAG),
    ...[...locationById.values()].sort((left, right) => (
      (left.layerId || '').localeCompare(right.layerId || '', 'zh-CN')
      || (left.sourceCategory || '').localeCompare(right.sourceCategory || '', 'zh-CN')
      || (left.sourceIndex ?? Number.MAX_SAFE_INTEGER) - (right.sourceIndex ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, 'zh-CN')
    )),
  ]

  writeJson(MAP_DATA_PATH, mapData)

  const countsByArea = imported.reduce((counts, item) => {
    counts[item.location.areaId] = (counts[item.location.areaId] || 0) + 1
    return counts
  }, {})

  console.log(`[OK] categories: ${categoryById.size}`)
  console.log(`[OK] locations: ${locationById.size}`)
  console.log(`[OK] skipped rows: ${rows.length - imported.length}`)
  console.log(`[OK] by area: ${JSON.stringify(countsByArea)}`)
  console.log(`[OK] wrote ${path.relative(ROOT_DIR, MAP_DATA_PATH)}`)
}

main()
