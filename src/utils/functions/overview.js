/*
 * Data of the Overview: by category (bars and pie, the mirror of `domain/Overview.kt` in the app) and the month by
 * month evolution (`GET /history`, the mirror of `domain/Evolution.kt`).
 */

function valueOf(category, byAmount) {
  return byAmount ? +category.expenses_sum_amount : +category.expenses_count
}

/**
 * The pie, largest first. Only positive values count: a category whose amounts add up to a negative (only refunds,
 * say) or to zero cannot be a part of a total. Each slice has its `share` of the total (0..1).
 */
export function overviewSlices(categories, byAmount) {
  const valued = categories
    .map(category => ({ category, value: valueOf(category, byAmount) }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
  const total = valued.reduce((sum, { value }) => sum + value, 0)

  return valued.map(({ category, value }) => ({ ...category, value, share: total > 0 ? value / total : 0 }))
}

/**
 * The bars, largest first: every category with expenses, even when its amounts add up to a negative or to zero (those
 * end last). `value` is the real one and `abs` its absolute value, which is what the bar measures.
 */
export function overviewBars(categories, byAmount) {
  return categories
    .map(category => ({ ...category, value: valueOf(category, byAmount) }))
    .filter(item => item.value > 0 || item.expenses_count > 0)
    .sort((a, b) => b.value - a.value)
    .map(item => ({ ...item, abs: Math.abs(item.value) }))
}

/** Colour of the chips under the title of the month; the lines of the evolution charts use the same ones. */
export const CHIP_COLORS = {
  spent: "#c0c0c0",
  debit: "#c8e6c9",
  debt: "#ffcdd2",
  instalments: "#bdbaff",
  balance: "#bbdefb",
  budget: "#a5d6a7",
  budgetOver: "#ef9a9a",
}

/**
 * Colour of each line of the evolution charts: the hue of its chip, darker so a thin line can be read. The budget is
 * green while something is left and red where it was exceeded (`BUDGET_COLORS`).
 */
export const EVOLUTION_COLORS = {
  balance: "#1e88e5",
  debit: "#43a047",
  spent: "#757575",
  instalments: "#6a62e8",
  budget: "#2e7d32",
}

export const BUDGET_COLORS = { positive: "#2e7d32", negative: "#c62828" }

/** Colour of a budget value: red when it was exceeded, green otherwise. */
export function budgetColor(value) {
  return value < 0 ? BUDGET_COLORS.negative : BUDGET_COLORS.positive
}

/** The most months a chart shows. */
const MAX_MONTHS = 120

/**
 * The months of the charts: those of `GET /history` up to the month `upTo` (`YYYY-MM`), and, when `upTo` is after the
 * last one, empty months up to it (every value `null`, so the line leaves a gap). Without `upTo`, all of them.
 */
function monthsUpTo(months, upTo) {
  if (!upTo) {
    return months
  }

  const kept = months.filter(item => item.month.slice(0, 7) <= upTo)

  if (kept.length === 0) {
    return []
  }

  let [year, number] = kept[kept.length - 1].month.slice(0, 7).split("-").map(Number)
  const key = () => `${year}-${String(number).padStart(2, "0")}`
  const padded = []

  while (key() < upTo && padded.length < MAX_MONTHS) {
    number++

    if (number > 12) {
      number = 1
      year++
    }

    padded.push({ month: `${key()}-01` })
  }

  return [...kept, ...padded].slice(-MAX_MONTHS)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Short money for the axes, as the app's `compactMoney`: `$900`, `$4.5k`, `$160k`, `-$1.2M`. */
export function compactMoney(value) {
  const sign = value < 0 ? "-" : ""
  const amount = Math.abs(value)
  const text = amount >= 1_000_000
    ? `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : amount >= 1_000
      ? `${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}k`
      : amount.toFixed(0)

  return `${sign}$${text}`
}

/** Up to this amount the log scale of the evolution charts is linear; above it, logarithmic. */
export const LOG_FROM = 1000

/**
 * The log scale of the evolution charts, made of two pieces: linear from `LOG_FROM` down to minus infinity (zeros and
 * negative values, a refund or a budget exceeded, keep their size) and logarithmic above it, continuing the line without a
 * jump or a change of slope at `LOG_FROM`. The charts draw this number on a linear axis; `unlogScale` is its inverse.
 */
export function logScale(value) {
  return value <= LOG_FROM ? value : LOG_FROM * (1 + Math.log(value / LOG_FROM))
}

export function unlogScale(position) {
  return position <= LOG_FROM ? position : LOG_FROM * Math.exp(position / LOG_FROM - 1)
}

/** Round marks for a linear axis from `min` to `max` (about `count` of them, steps of 1, 2, 2.5, 5 or 10 times a power of ten). */
function linearTicks(min, max, count = 5) {
  const span = max - min || Math.abs(max) || 1
  const raw = span / (count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / magnitude
  const step = magnitude * (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10)
  const marks = []

  for (let mark = Math.ceil(min / step) * step; mark <= max + step * 1e-9; mark += step) {
    marks.push(Math.round(mark / step) * step)
  }

  return { marks, step }
}

/**
 * The marks of a log axis that cover `min` to `max`: round marks (and zero) up to `LOG_FROM`, then the powers of ten (10k,
 * 100k...) up to the one that reaches `max`.
 */
function logTicks(min, max) {
  const marks = new Set([0])

  if (min < LOG_FROM) {
    linearTicks(min, Math.min(max, LOG_FROM), 3).marks.forEach(mark => marks.add(mark))
  }

  if (max >= LOG_FROM) {
    marks.add(LOG_FROM)
  }

  for (let power = 4; max > 0 && 10 ** (power - 1) < max; power++) {
    marks.add(10 ** power)
  }

  return [...marks].sort((a, b) => a - b)
}

/**
 * The Y axis of an evolution chart from its lowest and highest value, as `{ low, high, ticks }`, or `null` when there is
 * nothing to lay out (the chart library then picks it). It goes from the lowest to the highest value and out to the next
 * mark only when that one is close (within 15% of the span): the library rounds the ends outward and would leave a lot of
 * empty room (-$35k for a lowest value of -$3.9k). It only has the marks inside it. On a log axis (`log`) the numbers are
 * positions of `logScale`, to be drawn on a linear axis.
 */
export function chartAxis(min, max, log = false) {
  const { marks, step } = log ? { marks: logTicks(min, max), step: null } : linearTicks(min, max)
  const near = (mark, value) => Math.abs((log ? logScale(mark) - logScale(value) : mark - value)) <= (log ? logScale(max) - logScale(min) : max - min) * 0.15
  const above = log ? marks.find(mark => mark > max) : Math.ceil(max / step) * step
  const below = log ? [...marks].reverse().find(mark => mark < min) : Math.floor(min / step) * step
  const low = below !== undefined && near(below, min) ? below : min
  const high = above !== undefined && near(above, max) ? above : max
  const inside = marks.filter(mark => mark >= low && mark <= high)
  const ticks = [...new Set([...(low < min ? [low] : []), ...inside, ...(high > max ? [high] : [])])].sort((a, b) => a - b)
  const place = log ? logScale : value => value

  return max > min && ticks.length > 1 ? { low: place(low), high: place(high), ticks: ticks.map(place) } : null
}

/** `2026-09-01` as `Sep 26`. */
export function monthLabel(month) {
  const [year, number] = month.split("-")

  return `${MONTHS[+number - 1]} ${year.slice(2)}`
}

/**
 * The charts of the evolution from the months of `GET /history`, as `[{ key, title, series, data }]` where `series` is
 * `[{ key, label, color }]` and `data` has one `{ month, at, <series key>: value | null }` per month (`at` is `YYYY-MM`):
 * 1. Spent, every month (it exists before the balance start).
 * 2. Balance and Debit, from the first month with a balance.
 * 3. Instalments and Budget, from the first month with either (the budget appears when it starts).
 * A series with no value at all is left out, and so is a chart with no series. The charts end at the month `upTo`
 * (`YYYY-MM`, the one being shown), with `null` values for the months the history does not reach.
 */
export function evolutionCharts(months, upTo = null) {
  const number = value => value === null || value === undefined ? null : +value

  const rows = monthsUpTo(months, upTo).map(item => ({
    month: monthLabel(item.month),
    at: item.month.slice(0, 7),
    spent: number(item.spent),
    balance: number(item.total_money),
    debit: number(item.cash),
    instalments: number(item.pending_instalments),
    budget: number(item.budget_left),
  }))

  const definitions = [
    { key: "spent", title: "Spent", series: [["spent", "Spent"]] },
    { key: "balance", title: "Balance and Debit", series: [["balance", "Balance"], ["debit", "Debit"]] },
    { key: "monthly", title: "Instalments and Budget", series: [["instalments", "Instalments"], ["budget", "Budget"]] },
  ]

  return definitions.flatMap(({ key, title, series }) => {
    const present = series.filter(([name]) => rows.some(row => row[name] !== null))

    if (present.length === 0) {
      return []
    }

    const first = rows.findIndex(row => present.some(([name]) => row[name] !== null))
    const data = rows.slice(first).map(row => ({ month: row.month, at: row.at, ...Object.fromEntries(present.map(([name]) => [name, row[name]])) }))

    return [{ key, title, series: present.map(([name, label]) => ({ key: name, label, color: EVOLUTION_COLORS[name] })), data }]
  })
}
