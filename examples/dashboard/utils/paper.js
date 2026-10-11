/**
 * Created by denishuang on 2017/11/8.
 */

import { strQ2B } from './quanbanjiao.js'
const omit = (object, keys) =>
  Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))
import { html2text, text2table, text2img, text2audio, text2tag } from './markup_text.js'
import { compareTwoStrings } from './strings.js'
import { Splitter, groups as splitGroups } from './splitter.js'
function mapItems(d) {
  let items = {}
  d.items.forEach((a, i) => {
    items[d.splitters[i]] = a
  })
  return {
    head: d.head,
    items,
  }
}
export const Gid = {
  id: 1,
  group: 0,
  question: 0,
  get() {
    return ++this.id
  },
  reset() {
    this.id = this.group = this.question = 0
  },
}
export const Input = {
  RE: () => /\[(__+__|A[.、．].*?B[.、．].*?)\]/g,
  split(text) {
    let spt = Splitter(this.RE())
    let d = splitGroups(spt(text))
    if (d.items.length === 0) {
      return
    }
    let r = this.splitLines(d.head)
    if (r.length > 1 && r[1].type === 'line' && r[0].type === 'text') {
      r[0].isTitle = true
    }
    d.items.forEach((t, i) => {
      if (t.label.startsWith('_')) {
        r.push({ type: 'input', value: '', index: i })
      } else if (t.label.startsWith('A')) {
        let options = Option.split(t.label, false)
        r.push({ type: 'choices', value: '', index: i, options })
      }
      r = r.concat(this.splitLines(t.text)) // r.push({type: 'text', value: t})
    })
    return r
  },
  splitLines(t) {
    let ps = t.split(/\n/g)
    let r = [{ type: 'text', value: ps[0] }]
    ps.slice(1).forEach((a) => {
      r.push({ type: 'line' })
      r.push({ type: 'text', value: a })
    })
    return r
  },
}

export const Option = {
  split(s, strict) {
    let r = strict ? /\s+[A-Z][.、．]/g : /[A-Z][.、．]/g
    return this.items(s.split(r).slice(1))
  },
  items(ls) {
    return ls.map((t, i) => {
      return { text: t.trim(), value: Answer.abc(i) }
    })
  },
  splitNestedOptions(options) {
    if (!options) {
      return null
    }
    let os = [],
      ss = []
    options.forEach((a) => {
      let r = Input.RE()
      let f = r.exec(a.text) //r.test(a.text)
      if (f) {
        os.push(a.text)
      } else {
        ss.push(a.text)
      }
    })
    if (ss.length > 0 && os.length > 0) {
      // console.log(options, os, ss)
      return { options: this.items(os), subOptions: this.items(ss) }
    }
    return null
  },
  validate(options) {
    if (options.find((a) => a.text.length < 1)) {
      throw Error('空选项')
    }
    let d = {}
    options.forEach((a) => {
      if (d[a.text]) {
        throw Error('选项重复')
      }
      d[a.text] = true
    })
    let ol = options.length
    if (ol > 0 && ol < 4) {
      if (options.find((a) => a.text.search(/[B-D][.、．]/g) >= 0)) {
        throw Error('选项粘连')
      }
    }
  },
}

export const Answer = {
  split(s) {
    if (s == null) {
      return ''
    } else if (s instanceof Array) {
      return s
    }
    return this.splitOptions(s) // strQ2B(s).split(/[|()、]/g).filter((a) => a.length > 0)
  },
  isFullMode(s) {
    let cs = '```'
    let b = s.startsWith(cs) && s.endsWith(cs)
    return b
  },
  splitParts(s) {
    if (this.isFullMode(s)) {
      return [s]
    }
    return strQ2B(s).split(/[,;]/g)
  },
  splitOptions(s) {
    if (this.isFullMode(s)) {
      return [s.substring(3, s.length - 3)]
    }
    return strQ2B(s)
      .split(/[|()、]/g)
      .filter((a) => a.length > 0)
  },
  replaceCommaInQuote(s) {
    let r = /\(.*?\)/g
    let m = r.exec(s)
    let ns = s
    while (m) {
      let ss = m[0]
      ns = ns.replace(ss, ss.replace(/[,、;:]/g, '|'))
      m = r.exec(s)
    }
    return ns
  },
  formatMultiple(v) {
    if (!v || v == null) {
      return []
    }
    let res =
      (v instanceof Array && v.map((a) => a && a.toUpperCase())) ||
      this.splitMultipleAnswerOptions(v)
    return [res.sort().join('')]
  },
  replaceCommentChar(v) {
    if (this.isFullMode(v)) {
      return [v.substring(3, v.length - 3)]
    }
    return [v.replace(/^#/g, '\n').replace(/\n#/g, '\n').trim()]
  },
  splitMultipleAnswerOptions(v) {
    if (v instanceof Array) {
      return v.sort()
    }
    return this.str2list(v.toUpperCase()).sort()
  },
  abc(n) {
    return String.fromCharCode(65 + n)
  },
  str2list(s) {
    let rs = []
    for (var i = 0; i < s.length; i++) {
      let c = s.charAt(i)
      if ((c >= 'A' && c <= 'Z') || ['对', '错'].includes(c)) {
        rs.push(c)
      }
    }
    return rs
  },
  format(s, t) {
    let rs = {}
    this.splitParts(s).forEach((a, i) => {
      a = a.trim()
      rs[i] =
        t === 'multiple'
          ? [this.splitMultipleAnswerOptions(a).join('')]
          : t === 'input'
            ? this.splitOptions(a)
            : [a.toUpperCase()]
    })
    return rs
  },
  escapeComma(s) {
    if (s.includes('\\,') || s.includes('\\，')) {
      let sl = s.split(/[,，]/g)
      let nsl = []
      sl.forEach((a, i) => {
        if (i > 0 && sl[i - 1].endsWith('\\')) {
          let p = nsl[nsl.length - 1]
          nsl[nsl.length - 1] = p
            .slice(0, p.length - 1)
            .concat(',')
            .concat(a)
        } else {
          nsl.push(a)
        }
      })
      return nsl
    } else {
      let v = this.replaceCommaInQuote(strQ2B(s))
      return (v && v.split(/[,，、]/g)) || []
    }
  },
  escapeDelimitation(v) {
    let l = []
    v.split('\\').forEach((p, i) => {
      if (i > 0 && !'|()'.includes(p[0])) {
        l.push('\\')
      }
      l.push(p)
    })
    return l.join('')
  },
  formatInput(v) {
    if (this.isFullMode(v)) {
      return [v.substring(3, v.length - 3)]
    }
    if (v.includes('\n')) {
      return v
        .split('\n')
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
    }
    let as = this.escapeComma(v)
    let r = /\\[|()]/g
    return as.map((t) => {
      let v = t.trim()
      if (typeof v === 'string') {
        if (r.exec(v)) {
          return this.escapeDelimitation(v)
        }
        let vs = this.split(v)
        if (vs.length > 1) {
          return vs
        }
      }
      return v
    })
  },
  inputMatch(s, u) {
    u = html2text(u)
    return (s instanceof Array && s.includes(u)) || s === u
  },
  matchSimilar(a, b) {
    if (!b) {
      return 0
    }
    b = html2text(b)
    let r = (s) =>
      s
        .replace(/\s+/g, '')
        .replace(/^\s*[(（]\s*\d+\s*[）)]/g, '')
        .replace(/\s*[(（]\s*\d+\s*[）)]/g, '\n')
        .replace(/[(（]\s*\d+(.\d+)?分\s*[）)]/g, '')
        .replace(/[、，；;。“”]/g, ' ') // .replace(/[；;。]\n/g, '\n')
    let s = compareTwoStrings(r(a), r(b)) * 1.2
    return s > 0.9 ? 1 : s
  },
  match(sa, ua, similar) {
    if (similar) {
      return this.matchSimilar(sa[0], ua[0] || '')
    }
    let lsa = sa.length
    let lua = ua.length
    if (lua > lsa) {
      return -1
    }
    let c = 0
    for (var i = 0; i < lua; i++) {
      let s = sa[i]
      let u = ua[i]
      if (this.inputMatch(s, u)) {
        c += 1
      }
    }
    return c / lsa
  },
  equals(sa, ua) {
    return this.match(sa, ua) === 1
  },
  calScore(sa, ua, stdScore, similar) {
    let m = this.match(sa, ua, similar)
    let sc = m === -1 ? 0 : stdScore * m
    return Math.floor(sc * 10) / 10
  },
  isEmpty(a) {
    return (
      !a ||
      a === null ||
      (Array.isArray(a) && (a.length < 1 || a.some((i) => [undefined, null, ''].includes(i))))
    )
  },
  toString(v) {
    let b = false
    let rs = v.map((a) => {
      let s = a
      if (s instanceof Array) {
        s = s.join(' | ')
      }
      if (/[,;()]/.test(s)) {
        b = true
      }
      return s
    })
    return rs.join(b ? '\n' : ' , ')
  },
}
export const Question = {
  types: [
    [/\(.*多选.*\)|多项选择|多选题/g, 'multiple'],
    [/\(.*单选.*\)|单项选择|单选题/g, 'single'],
    [/\(.*填空.*\)|填空题/g, 'input'],
    [/.*判断改错.*/g, 'correct'],
    [/.*辨析题.*/g, 'interpret'],
    [/\(.*判断.*\)|判断题/g, 'judge'],
    [/\(.*简答.*\)|简答题/g, 'sentence'],
    [/填句补文/g, 'selectinput'],
  ],
  type_by_title(v) {
    let r = this.types.find((t) => t[0].exec(v))
    return r && r[1]
  },
  type(title, inputs, options, gtype) {
    if (['judge', 'correct', 'interpret'].includes(gtype) && (!options || options.length < 1)) {
      return gtype
    }
    return (
      this.type_by_title(title) ||
      (inputs && inputs.length > 1 && 'input') ||
      (options && options.length > 0 && (gtype || 'single')) ||
      'textarea'
    )
  },
  formatAnswers(v, t) {
    v = v.replace('×', 'x')
    return (
      (['correct', 'input', 'interpret'].includes(t) && Answer.formatInput(v)) ||
      (t === 'multiple' && Answer.formatMultiple(v)) ||
      Answer.replaceCommentChar(v)
    )
  },
  multipleAnswers(v) {
    if (!v || v == null) {
      return []
    }
    let res = []
    for (var i = 0; i < v.length; i++) {
      let c = v.charAt(i).toUpperCase()
      if (c >= 'A' && c <= 'Z') {
        res.push(c)
      }
    }
    return res.sort()
  },
  genUserAnswer({ inputs, options, subOptions }) {
    if (subOptions) {
      return options.concat(subOptions).map((a) => '')
    }
    if (!inputs) {
      return ['']
    }
    return inputs.filter((a) => a.type === 'input').map((a) => '')
  },
  judgeNoTitleSelect(s) {
    let re = /^\s*[Aa][.、．].*\s+[Bb][.、．].*\s+[Cc][.、．]/g
    if (re.exec(s)) {
      return `\n${s}`
    }
    return s
  },
  getDefaultScore(d) {
    if (['sentence', 'textarea'].includes(d.type)) {
      let s = d.answer[0].length
      return s < 20 ? 4 : Math.floor(Math.sqrt(s)) // d.answer.
    } else if (['multiple'].includes(d.type)) {
      return 3
    }
    return d.answer.length * 2 || 2
  },
  getScoreFromTitle(s) {
    let re = /[(（]\s*([\d.]+)\s*分\s*[）)]/g
    let m = re.exec(s)
    if (m) {
      return parseFloat(m[1])
    }
  },
  split(text, data) {
    let spt = Splitter(/\s+(唯一答案|答案|题解|大纲|知识点)[:：]/g)
    let as = mapItems(spt(text)) // text.split(/\s+答案[:：]/g)
    // console.log(as)
    let head = as.head // as[0].trim()
    let hs = this.judgeNoTitleSelect(head)
    let ps = hs.split(/\n+\s*[A-Z][.、．]/g)
    data.options = Option.split(hs.substr(ps[0].length), true)
    let nos = Option.splitNestedOptions(data.options)
    if (nos) {
      data.options = nos.options
      data.subOptions = nos.subOptions
      // console.log(nos)
    }
    data.title = ps[0].trim()
    data.inputs = Input.split(data.title)
    data.type = this.type(data.title, data.inputs, data.options, data.type)
    // let astr = as[1] && as[1].trim() || data.answer || ''
    // let aps = astr.split(/\s*题解[:：]/g)
    data.explanation = as.items['题解'] // aps[1]
    data.outline = as.items['大纲'] || as.items['知识点']
    if (as.items['唯一答案']) {
      data.answer = [as.items['唯一答案'].trim()]
    } else {
      data.answer = (as.items['答案'] || data.answer || '').trim() // aps[0].trim()
      // if(!['single','textarea'].includes(data.type)){
      data.answer = this.formatAnswers(data.answer, data.type)
    }
    data.userAnswer = this.genUserAnswer(data)
    if (data.subOptions) {
      data.userAnswer = data.subOptions.map((a) => '').concat(data.userAnswer)
    }
    data.score = this.getScoreFromTitle(data.title) || data.score || this.getDefaultScore(data)
    // }
    data = this.transformJudgeType(data)
    return data // {gid, title, options, type, answer, inputs, userAnswer: null}
  },
  transformJudgeType(q) {
    if (['judge', 'correct'].includes(q.type)) {
      if (q.options.length < 1) {
        q.options = [
          { value: '对', text: '对' },
          { value: '错', text: '错' },
        ]
        let c = q.answer[0]
        q.answer[0] = { 错误: '错', 正确: '对' }[c] || c
      }
      if (q.type === 'judge') {
        q.type = 'single'
      }
    }
    return q
  },
  isCorrect(q) {
    return this.calUserScore(q) === q.score // Answer.equals(q.answer, q.userAnswer, q.type)
  },
  isSubjective(q) {
    return ['sentence', 'textarea'].includes(q.type)
  },
  calUserScore(q) {
    if (q.type === 'interpret') {
      return this.calInterpretScore(q)
    }
    let similar = this.isSubjective(q)
    q.userScore = Answer.calScore(q.answer, q.userAnswer, q.score, similar)
    return q.userScore
  },
  calInterpretScore(q) {
    if (q.answer[0] === q.userAnswer[0]) {
      let sc = q.score * 0.5
      return sc + Answer.calScore([q.answer[1]], [q.userAnswer[1]], sc, true)
    }
    return 0
  },
  getAnswers(questions) {
    return questions.map((q) => {
      let right = Question.isCorrect(q)
      let userScore = Question.calUserScore(q)
      return {
        id: q.id,
        number: q.number,
        answer: q.answer,
        userAnswer: q.userAnswer,
        score: q.score,
        isSubjective: Question.isSubjective(q),
        right,
        userScore,
      }
    })
  },
  filterCorrect(questions, right) {
    return questions.filter((q) => {
      return this.isCorrect(q) === right
    })
  },
  filterEmpty(questions) {
    return questions.filter((q) => Answer.isEmpty(q.answer))
  },
  filterUserEmpty(questions) {
    return questions.filter((q) => Answer.isEmpty(q.userAnswer))
  },
  filterErrors(questions) {
    let d = {}
    questions.filter((q) => {
      try {
        this.validate(q)
      } catch (e) {
        if (!d[e.message]) {
          d[e.message] = []
        }
        d[e.message].push(q)
      }
    })
    return d
  },
  validate(q) {
    if (Answer.isEmpty(q.answer)) {
      throw Error('缺答案')
    }
    Option.validate(q.options)
  },
}

export const Group = {
  split(text, data) {
    let ps = text.split(/\n+\s*\d+[.、．]|\n+\s*([(（]\s*[A-Z]\s*[)）])\s*\d+[.、．]/g)
    let qts = []
    let answer = null
    data.title = ps[0].split('\n')[0]
    data.memo = ps[0].slice(data.title.length)
    data.type = Question.type_by_title(data.title)
    data.scorePerQuestion = this.regScorePerQuestion(data.title)
    ps.slice(1).forEach((t, i) => {
      if (t === undefined) {
        return
      }
      if (/^[(（]\s*[A-Z]\s*[)）]$/.test(t)) {
        answer = t.substr(1, t.length - 2)
        return
      }
      let num = ++Gid.question
      let q = Question.split(t.trim(), {
        position: qts.length + 1,
        number: num,
        id: `g${Gid.group}q${Gid.question}`,
        answer,
        type: data.type,
        score: data.scorePerQuestion,
      })
      answer = null
      qts.push(q)
    })
    data.questions = qts
    data.questionCount = qts.length
    return data
  },
  isSubjective(group) {
    return group.questions.find((q) => Question.isSubjective(q))
  },
  regScorePerQuestion(s) {
    let res = [/每.*?题\s*([\d.]+)\s*分/, /本题\s*([\d.]+)\s*分/]
    for (let i in res) {
      let m = res[i].exec(s)
      if (m) {
        return parseFloat(m[1])
      }
    }
  },
}

export const Paper = {
  split(text) {
    text = (text ?? '').replace(/\xa0/g, ' ')
    Gid.reset()
    if (text === null) {
      return {}
    }
    let ps = text.trim().split(/\n+\s*[一二三四五六七八九十百]+[.、．]/g)
    let gs = ps.slice(1).map((t, i) => {
      let n = ++Gid.group
      return Group.split(t, { position: n, number: n, id: `g${n}` })
    })
    ps = ps[0].split(/\n/g)
    let title = ps[0]
    let memo = ps.slice(1).join('\n')
    let groups = gs
    let qs = []
    gs.forEach((g) => {
      qs = qs.concat(g.questions)
    })
    let totalScore = qs.map((q) => q.score).reduce((a, b) => a + b, 0)
    let noAnswerCount = Question.filterEmpty(qs).length
    return { title, memo, groups, questionCount: qs.length, noAnswerCount, totalScore }
  },
  validateRule(rule, value, callback, source, options) {
    let paper = Paper.split(value?.source)
    let qs = Paper.getQuestions(paper)
    let es = Question.filterErrors(qs)
    let result = Object.keys(es).map((e) => new Error(`${e}${es[e].length}题`))
    if (result.length > 0) {
      callback(result)
      // return result
    } else {
      callback()
    }
  },
  getQuestions(paper, bindGroup) {
    let r = []
    if (paper && paper.groups) {
      paper.groups.forEach((g) => {
        if (bindGroup) {
          g.questions.forEach((q) => {
            q.group = omit(g, ['questions'])
          })
        }
        r = r.concat(g.questions)
      })
    }
    return r
  },
  formatScore(s) {
    return (Number.isInteger(s) && s) || (typeof s === 'number' && s.toFixed(1)) || s
  },
  escape(paper, func) {
    if (paper.memo) {
      paper.memo = func(paper.memo)
    }
    if (paper && paper.groups) {
      paper.groups.forEach((g) => {
        if (g.title) {
          g.title = func(g.title)
        }
        if (g.memo) {
          g.memo = func(g.memo)
        }
        g.questions.forEach((q) => {
          if (q.title) {
            q.title = func(q.title)
          }
          if (q.options) {
            q.options.forEach((o) => {
              o.text = func(o.text)
            })
          }
          if (q.inputs) {
            q.inputs.forEach((o) => {
              if (o.type === 'text') {
                o.value = func(o.value)
              }
            })
          }
          if (q.answer) {
            q.answer.forEach((a, i) => {
              if (a instanceof Array) {
                a.forEach((b, j) => {
                  a[j] = func(b)
                })
              } else {
                q.answer[i] = func(a)
              }
            })
          }
          if (q.explanation) {
            q.explanation = func(q.explanation)
          }
        })
      })
    }
    return paper
  },
  escapeFunc(imgBase, audioBase) {
    return (s) => {
      s = html2text(s)
      s = text2tag(s, '上', 'sup')
      s = text2tag(s, '下', 'sub')
      s = text2tag(s, '划', 'u')
      s = text2img(s, imgBase)
      s = text2audio(s, audioBase)
      s = text2table(s)
      return s
    }
  },
  parse(s, imgBase, audioBase) {
    let p = this.split(s)
    return this.escape(p, this.escapeFunc(imgBase, audioBase))
  },
}

export const Types = {
  multiple: '多选题',
  single: '单选题',
  input: '填空题',
  correct: '判断改错题',
  judge: '判断题',
  sentence: '简答题',
  selectinput: '填句补文',
}
export default {
  Paper,
  Group,
  Question,
  Answer,
  Types,
}
