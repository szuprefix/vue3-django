export function arrayEquals(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) {
    const equal = Array.isArray(left[index])
      ? arrayEquals(left[index], right[index])
      : Object.is(left[index], right[index])
    if (!equal) return false
  }
  return true
}

export function arrayDelta(previous, current) {
  const before = new Set(previous)
  const after = new Set(current)
  return {
    added: [...after].filter((value) => !before.has(value)),
    removed: [...before].filter((value) => !after.has(value)),
  }
}
