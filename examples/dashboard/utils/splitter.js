/**
 * Created by denishuang on 2020/6/2.
 */

export function Splitter(re) {
  return (s) => {
    let ps = s.split(re)
    let rs = ps.slice(1)
    return {
      head: ps[0],
      items: rs.filter((a, i) => i % 2 === 1), // 奇数位为内容
      splitters: rs.filter((a, i) => i % 2 === 0), // 偶数位为分隔符
    }
  }
}

export default Splitter

export function groups(d) {
  return {
    head: d.head,
    items: d.items.map((a, i) => {
      return { label: d.splitters[i], text: a }
    }),
  }
}

export function mapItems(d) {
  let items = {}
  d.items.forEach((a, i) => {
    items[d.splitters[i]] = a
  })
  return {
    head: d.head,
    items,
  }
}

export function hierarchy(s, spliters) {
  if (spliters.length == 0) {
    return { head: s.trim() }
  }
  let spl = spliters[0]
  if (spl instanceof RegExp) {
    spl = Splitter(spl)
  }
  let a = spl(s)
  a.head = a.head.trim()
  a.items.forEach((b, i) => {
    a.items[i] = hierarchy(b, spliters.slice(1))
  })
  return a
}
