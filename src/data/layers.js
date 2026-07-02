import mapData from './map-data.json'
import coordinateCalibration from './navi-coordinate-calibration.json'
import mapLayerCalibrations from './map-layer-calibrations.json'
import mapLayerGeofences from './map-layer-geofences.json'
import mapLayerTransforms from './map-layer-transforms.json'

export const MAINLAND_LAYER_ID = 'mainland'

const locatorScaleX = (coordinateCalibration.sourceWidth || mapData.map.mapLocatorSourceWidth || 11264)
  / mapData.map.width
const locatorScaleY = (coordinateCalibration.sourceHeight || mapData.map.mapLocatorSourceHeight || 11264)
  / mapData.map.height

const defaultTransform = () => ({
  rotationDegrees: { x: 0, y: 0, z: 0 },
  plane: 'xoy',
})

const identityMapping = () => ({
  version: 1,
  calibrated: false,
  points: [
    { raw: [0, 0], map: [0, 0] },
    { raw: [1, 0], map: [1, 0] },
    { raw: [0, 1], map: [0, 1] },
  ],
})

const mainlandMapping = () => ({
  version: 1,
  calibrated: true,
  points: coordinateCalibration.points.map((point) => ({
    raw: [Number(point.raw[0]), Number(point.raw[1])],
    map: [Number(point.map[0]), Number(point.map[1])],
  })),
})

const layerLocator = ({ width, height }) => ({
  sourceWidth: Math.round(width * locatorScaleX),
  sourceHeight: Math.round(height * locatorScaleY),
})

const layer = ({ id, name, subtitle, imageUrl, width, height, coordinateMapping }) => ({
  id,
  name,
  subtitle,
  imageUrl,
  width,
  height,
  image: { width, height },
  locator: layerLocator({ width, height }),
  coordinateTransform: mapLayerTransforms[id] || defaultTransform(),
  geofence: mapLayerGeofences[id] || { enabled: false },
  coordinateMapping: mapLayerCalibrations[id] || coordinateMapping || identityMapping(),
})

export const MAP_LAYERS = [
  layer({
    id: MAINLAND_LAYER_ID,
    name: '沃伦大陆',
    subtitle: '总地图',
    imageUrl: '/maps/Mainland.png',
    width: 5120,
    height: 5120,
    coordinateMapping: mainlandMapping(),
  }),
  layer({
    id: 'castle',
    name: '赤龙古堡',
    subtitle: '区域地图',
    imageUrl: '/maps/Castle.png',
    width: 5120,
    height: 5120,
  }),
  layer({
    id: 'lake',
    name: '琥珀湖',
    subtitle: '区域地图',
    imageUrl: '/maps/Lake.png',
    width: 5120,
    height: 5120,
  }),
  layer({
    id: 'snow-mountain',
    name: '牛奶雪冰山',
    subtitle: '区域地图',
    imageUrl: '/maps/SnowMountain.png',
    width: 7680,
    height: 7680,
  }),
  layer({
    id: 'village',
    name: '绵绵村',
    subtitle: '区域地图',
    imageUrl: '/maps/Village.png',
    width: 5120,
    height: 5120,
  }),
  layer({
    id: 'volcano',
    name: '巧克力火山',
    subtitle: '区域地图',
    imageUrl: '/maps/Volcano.png',
    width: 5120,
    height: 5120,
  }),
]
