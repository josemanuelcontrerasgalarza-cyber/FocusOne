/**
 * Captura rápida en lenguaje natural (español), 100 % local y determinista.
 *
 *   "Estudiar ciencias mañana durante 30 minutos"
 *     → { title: 'Estudiar ciencias', due_date: <mañana>, estimated_minutes: 30 }
 *
 * Reconoce: fechas (hoy, mañana, pasado mañana, días de la semana, "en 3 días",
 * "el 25", "25/10", "25 de octubre", "la próxima semana"), horas ("a las 5",
 * "17:30", "9 de la mañana", "6pm", "al mediodía"), duraciones ("30 min",
 * "1 h", "1h30", "media hora"), prioridad ("urgente", "importante",
 * "prioridad baja", "!!", "!1"…"!4"), etiquetas (#tag), proyecto (@proyecto) y
 * recurrencia ("cada día", "entre semana", "cada lunes", "mensual").
 */
import { addDays, addMonths, toDateKey, weekday, pad } from './dates.ts'
import type { Priority, Recurrence } from './types.ts'

export interface ParsedTask {
  title: string
  due_date: string | null
  due_time: string | null
  estimated_minutes: number | null
  priority: Priority | null
  tags: string[]
  projectHint: string | null
  recurrence: Recurrence | null
}

const L = '[\\p{L}\\p{N}]'
/** Palabra completa (los \b de JS no entienden tildes). */
const word = (w: string) => `(?<!${L})(?:${w})(?!${L})`

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, 'miércoles': 3, jueves: 4, viernes: 5, sabado: 6, 'sábado': 6,
}
const WD = 'domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado'
const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}
const MON = Object.keys(MONTHS).join('|')
const NUM_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
}
const NUM = `\\d+|${Object.keys(NUM_WORDS).join('|')}`
const toNum = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUM_WORDS[s.toLowerCase()] ?? NaN)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Próxima fecha con ese día de la semana (si es hoy → la semana que viene, salvo `allowToday`). */
function nextWeekday(today: string, target: number, allowToday = false): string {
  let delta = (target - weekday(today) + 7) % 7
  if (delta === 0 && !allowToday) delta = 7
  return addDays(today, delta)
}

export function parseQuickTask(input: string, now: Date = new Date()): ParsedTask {
  const today = toDateKey(now)
  let s = ` ${input.replace(/\s+/g, ' ').trim()} `
  const take = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    const m = re.exec(s)
    if (!m) return false
    fn(m)
    s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)
    return true
  }

  const out: ParsedTask = {
    title: '',
    due_date: null,
    due_time: null,
    estimated_minutes: null,
    priority: null,
    tags: [],
    projectHint: null,
    recurrence: null,
  }

  // ── Etiquetas y proyecto ──
  let m: RegExpExecArray | null
  const tagRe = /(?<=\s)#([\p{L}\p{N}_-]+)/u
  while ((m = tagRe.exec(s))) {
    out.tags.push(m[1].toLowerCase())
    s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)
  }
  take(/(?<=\s)[@+]([\p{L}\p{N}_-]+)/u, (x) => (out.projectHint = x[1]))

  // ── Prioridad ──
  take(new RegExp(word('urgente|urgent'), 'iu'), () => (out.priority = 4)) ||
    take(/(?<=\s)!{3,}(?=\s)/u, () => (out.priority = 4)) ||
    take(new RegExp(`${word('prioridad')}\\s+(urgente|alta|media|baja)`, 'iu'), (x) => {
      out.priority = ({ urgente: 4, alta: 3, media: 2, baja: 1 } as Record<string, Priority>)[norm(x[1])]
    }) ||
    // !1 urgente · !2 alta · !3 media · !4 baja
    take(/(?<=\s)!([1-4])(?![\p{L}\p{N}])/u, (x) => {
      out.priority = (5 - Number(x[1])) as Priority
    }) ||
    take(/(?<=\s)!(alta|media|baja)(?!\p{L})/iu, (x) => {
      out.priority = ({ alta: 3, media: 2, baja: 1 } as Record<string, Priority>)[norm(x[1])]
    }) ||
    take(/(?<=\s)!!(?=\s)/u, () => (out.priority = 3)) ||
    take(new RegExp(word('importante'), 'iu'), () => (out.priority = 3))

  // ── Recurrencia ──
  let recurWeekday: number | null = null
  take(new RegExp(`${word('cada')}\\s+(${WD})`, 'iu'), (x) => {
    out.recurrence = 'weekly'
    recurWeekday = WEEKDAYS[norm(x[1])]
  }) ||
    take(new RegExp(word('todos los d[ií]as|cada d[ií]a|diariamente|a diario|diario'), 'iu'), () => (out.recurrence = 'daily')) ||
    take(new RegExp(word('entre semana|d[ií]as laborables|de lunes a viernes'), 'iu'), () => (out.recurrence = 'weekdays')) ||
    take(new RegExp(word('cada semana|semanalmente|semanal'), 'iu'), () => (out.recurrence = 'weekly')) ||
    take(new RegExp(word('cada mes|mensualmente|mensual'), 'iu'), () => (out.recurrence = 'monthly'))

  // ── Duración ──
  const setDur = (min: number) => {
    if (min >= 1 && min <= 600) out.estimated_minutes = Math.round(min)
  }
  const pre = `(?:${word('durante|por|unos|unas')}\\s+)?`
  take(new RegExp(`${pre}${word('hora y media')}`, 'iu'), () => setDur(90)) ||
    take(new RegExp(`${pre}${word('media hora')}`, 'iu'), () => setDur(30)) ||
    take(new RegExp(`${pre}(?<!${L})(\\d+)\\s*h\\s*(\\d{1,2})(?!${L})`, 'iu'), (x) => setDur(Number(x[1]) * 60 + Number(x[2]))) ||
    take(
      new RegExp(`${pre}(?<!${L})(${NUM}|\\d+[.,]\\d+)\\s*(?:h|hr|hrs|horas?)(?!${L})(?:\\s*(?:y\\s*)?(\\d+)\\s*(?:m|min|mins|minutos?)(?!${L}))?`, 'iu'),
      (x) => setDur((/[.,]/.test(x[1]) ? Number(x[1].replace(',', '.')) : toNum(x[1])) * 60 + (x[2] ? Number(x[2]) : 0)),
    ) ||
    take(new RegExp(`${pre}(?<!${L})(${NUM})\\s*(?:m|min|mins|minutos?)(?!${L})`, 'iu'), (x) => setDur(toNum(x[1])))

  // ── Hora ──
  const setTime = (h: number, min: number, mer?: string) => {
    let hh = h
    const mm = min
    const md = mer ? norm(mer) : ''
    if (md === 'pm' || md === 'tarde' || md === 'noche') {
      if (hh < 12) hh += 12
    } else if (md === 'am' || md === 'manana' || md === 'madrugada') {
      if (hh === 12) hh = 0
    } else if (!md && hh >= 1 && hh <= 6) {
      hh += 12 // "a las 5" → 17:00 (lo habitual en tareas)
    }
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) out.due_time = `${pad(hh)}:${pad(mm)}`
  }
  const MER = `(?:\\s*(am|pm|a\\.m\\.|p\\.m\\.)|\\s+de la (ma[nñ]ana|tarde|noche|madrugada))?`
  take(new RegExp(word('al mediod[ií]a|a mediod[ií]a'), 'iu'), () => setTime(12, 0, 'pm')) ||
    take(new RegExp(word('por la ma[nñ]ana|en la ma[nñ]ana'), 'iu'), () => setTime(9, 0, 'am')) ||
    take(new RegExp(word('por la tarde|en la tarde'), 'iu'), () => setTime(17, 0)) ||
    take(new RegExp(word('por la noche|en la noche'), 'iu'), () => setTime(20, 0)) ||
    take(new RegExp(`${word('a las|a la')}\\s+(\\d{1,2})(?:[:.h](\\d{2}))?${MER}`, 'iu'), (x) =>
      setTime(Number(x[1]), x[2] ? Number(x[2]) : 0, (x[3] || x[4] || '').replace(/\./g, '')),
    ) ||
    take(new RegExp(`(?<!${L})(\\d{1,2}):(\\d{2})${MER}(?!${L})`, 'iu'), (x) =>
      setTime(Number(x[1]), Number(x[2]), (x[3] || x[4] || '').replace(/\./g, '')),
    ) ||
    take(new RegExp(`(?<!${L})(\\d{1,2})\\s*(am|pm)(?!${L})`, 'iu'), (x) => setTime(Number(x[1]), 0, x[2]))

  // ── Fecha ──
  take(new RegExp(word('pasado ma[nñ]ana'), 'iu'), () => (out.due_date = addDays(today, 2))) ||
    take(new RegExp(word('esta noche'), 'iu'), () => {
      out.due_date = today
      if (!out.due_time) out.due_time = '20:00'
    }) ||
    take(new RegExp(word('esta tarde'), 'iu'), () => {
      out.due_date = today
      if (!out.due_time) out.due_time = '17:00'
    }) ||
    take(new RegExp(word('ma[nñ]ana'), 'iu'), () => (out.due_date = addDays(today, 1))) ||
    take(new RegExp(word('hoy'), 'iu'), () => (out.due_date = today)) ||
    take(new RegExp(word('(?:la )?pr[oó]xima semana|(?:la )?semana que viene'), 'iu'), () => (out.due_date = nextWeekday(today, 1))) ||
    take(new RegExp(`${word('en|dentro de')}\\s+(${NUM})\\s+(d[ií]as?|semanas?|mes(?:es)?)(?!${L})`, 'iu'), (x) => {
      const n = toNum(x[1])
      const unit = norm(x[2])
      if (!Number.isFinite(n)) return
      out.due_date = unit.startsWith('dia') ? addDays(today, n) : unit.startsWith('semana') ? addDays(today, n * 7) : addMonths(today, n)
    }) ||
    take(new RegExp(`(?:${word('el|este|esta')}\\s+)?(?:${word('pr[oó]ximo|siguiente')}\\s+)?(${WD})(?!${L})`, 'iu'), (x) => {
      const isThis = /\b(este|esta)\b/i.test(norm(x[0]))
      out.due_date = nextWeekday(today, WEEKDAYS[norm(x[1])], isThis)
    }) ||
    take(new RegExp(`(?:${word('el')}\\s+)?(?<!${L})(\\d{1,2})\\s+de\\s+(${MON})(?:\\s+(?:de|del)\\s+(\\d{4}))?(?!${L})`, 'iu'), (x) => {
      const day = Number(x[1])
      const month = MONTHS[norm(x[2])]
      const nowY = now.getFullYear()
      let y = x[3] ? Number(x[3]) : nowY
      let key = `${y}-${pad(month + 1)}-${pad(day)}`
      if (!x[3] && key < today) key = `${(y = nowY + 1)}-${pad(month + 1)}-${pad(day)}`
      if (day >= 1 && day <= 31) out.due_date = key
    }) ||
    take(/(?<=\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=[\s,.]|$)/u, (x) => {
      const day = Number(x[1])
      const month = Number(x[2])
      if (day < 1 || day > 31 || month < 1 || month > 12) return
      let y = x[3] ? Number(x[3].length === 2 ? `20${x[3]}` : x[3]) : now.getFullYear()
      let key = `${y}-${pad(month)}-${pad(day)}`
      if (!x[3] && key < today) key = `${(y += 1)}-${pad(month)}-${pad(day)}`
      out.due_date = key
    }) ||
    take(new RegExp(`${word('el')}\\s+(\\d{1,2})(?!${L}|\\s*(?:de|/))`, 'iu'), (x) => {
      const day = Number(x[1])
      if (day < 1 || day > 31) return
      const [yy, mm] = today.split('-').map(Number)
      let key = `${yy}-${pad(mm)}-${pad(day)}`
      if (key < today) key = addMonths(`${yy}-${pad(mm)}-01`, 1).slice(0, 8) + pad(day)
      out.due_date = key
    })

  // Recurrencia sin fecha → primera ocurrencia razonable.
  if (out.recurrence && !out.due_date) {
    out.due_date = recurWeekday !== null ? nextWeekday(today, recurWeekday, true) : today
  }

  // ── Título ──
  let title = s.replace(/\s+/g, ' ').trim()
  const DANGLING = /^(?:(?:el|la|los|las|de|del|para|a|al|en|con|y|por|durante|desde|hasta|que)\s+)+|(?:\s+(?:el|la|los|las|de|del|para|a|al|en|con|y|por|durante|desde|hasta|que))+$/iu
  for (let i = 0; i < 3; i++) title = title.replace(DANGLING, '').trim()
  title = title.replace(/^[,.;:\-–\s]+|[,.;:\-–\s]+$/g, '').trim()
  out.title = title ? title.charAt(0).toUpperCase() + title.slice(1) : ''
  return out
}
