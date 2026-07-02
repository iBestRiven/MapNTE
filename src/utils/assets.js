// 深拷贝地图数据，防止编辑状态直接污染导入的原始 JSON 快照。
export const clone = (value) => JSON.parse(JSON.stringify(value))

// 把 public 下的相对资源路径补上 Vite base，兼容子路径部署。
export function publicAssetUrl(path) {
  if (
    path
    && !/^(?:[a-z]+:)?\/\//i.test(path)
    && !path.startsWith('data:')
    && !path.startsWith('blob:')
  ) {
    return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
  }

  return path
}
