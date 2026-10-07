// Small compatibility helpers used by migrated media config files.
export function duration(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  const seconds = Math.max(0, Number(value))
  return `${Math.floor(seconds / 60)}'${Math.floor(seconds % 60)}''`
}

export function nFormatter(value, digits = 1, inChinese = false) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  const number = Number(value)
  const units = inChinese
    ? [
        [1e12, '兆'],
        [1e8, '亿'],
        [1e4, '万'],
      ]
    : [
        [1e18, 'E'],
        [1e15, 'P'],
        [1e12, 'T'],
        [1e9, 'G'],
        [1e6, 'M'],
        [1e3, 'k'],
      ]
  const unit = units.find(([size]) => Math.abs(number) >= size)
  if (!unit) return String(number)
  return `${Number((number / unit[0]).toFixed(digits))}${unit[1]}`
}
