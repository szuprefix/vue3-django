/**
 * Created by denishuang on 2020/7/10.
 */

export const TABLE_SPLITER = '╎'
export function parse(s) {
  let ps = parseTable(s)
  let rs = []
  ps.forEach((p) => {
    if (typeof p === 'string') {
      let list = parseImg(p)
      list.forEach((a, i) => {
        if (typeof a === 'string') {
          a = text2tag(a, '上', 'sup')
          a = text2tag(a, '下', 'sub')
          list[i] = a
        }
      })
      rs = rs.concat(list)
    } else {
      rs.push(p)
    }
  })
  return rs
}

export function text2img(s, urlBase) {
  let re = /\[图:(.*?)\]/g
  let rs = []
  let p = 0
  let m
  while ((m = re.exec(s))) {
    rs.push(s.substring(p, m.index))
    rs.push(`<img src="${/^https?:\/\//.test(m[1]) ? m[1] : (urlBase ?? '') + m[1]}">`)
    p = m.index + m[0].length
  }
  rs.push(s.substr(p, s.length))
  // console.log(rs)
  return rs.join('')
}

export function text2audio(s, urlBase) {
  let re = /\[音:(.*?)\]/g
  let rs = []
  let p = 0
  let m
  while ((m = re.exec(s))) {
    rs.push(s.substring(p, m.index))
    rs.push(
      `<audio controls src="${/^https?:\/\//.test(m[1]) ? m[1] : (urlBase ?? '') + m[1]}"></audio>`,
    )
    p = m.index + m[0].length
  }
  rs.push(s.substr(p, s.length))
  return rs.join('')
}

export function text2tag(s, name, tag) {
  let re = new RegExp(`\\[${name}:(.*?)]`, 'g')
  return s.replace(re, `<${tag}>\$1</${tag}>`)
}

export function parseImg(s) {
  let re = /\[图:(.*?)\]/g
  let rs = []
  let p = 0
  let m
  while ((m = re.exec(s))) {
    rs.push(s.substring(p, m.index))
    rs.push({ type: 'img', src: m[1] })
    p = m.index + m[0].length
  }
  rs.push(s.substr(p, s.length))
  return rs
}

export function parseTd(s) {
  let re = /^!r(\d+)c(\d+):/g
  let m = re.exec(s)
  if (m) {
    return { rowSpan: m[1], colSpan: m[2], text: s.substr(m[0].length) }
  }
  return s
}

export function text2td(s) {
  s = s.trim()
  let re = /^!r(\d+)c(\d+):/g
  let m = re.exec(s)
  if (m) {
    return `<td rowSpan="${m[1]}" colSpan="${m[2]}">${s.substr(m[0].length)}</td>`
  }
  return `<td>${s}</td>`
}

export function text2table(s) {
  let delimeter = TABLE_SPLITER
  let re = /\[表:([\s\S]*?):表\]/gm
  let rs = []
  let p = 0
  let m
  while ((m = re.exec(s))) {
    rs.push(s.substring(p, m.index))
    rs.push(
      '<table>' +
        m[1]
          .split('\n')
          .map((l) => {
            return (
              '<tr>' +
              l
                .split(delimeter)
                .map((c) => text2td(c))
                .join('\n') +
              '</tr>'
            )
          })
          .join('\n') +
        '</table>',
    )
    p = m.index + m[0].length
  }
  rs.push(s.substr(p, s.length))
  return rs.join('')
}

export function parseTable(s) {
  let delimeter = TABLE_SPLITER
  let re = /\[表:([\s\S]*?):表\]/gm
  let rs = []
  let p = 0
  let m
  while ((m = re.exec(s))) {
    rs.push(s.substring(p, m.index))
    rs.push({
      type: 'table',
      rows: m[1].split('\n').map((l) => {
        return l.split(delimeter).map((c) => parseTd(c))
      }),
    })
    p = m.index + m[0].length
  }
  rs.push(s.substr(p, s.length))
  return rs
}

export function html2text(s) {
  if (!s) {
    return ''
  }
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
