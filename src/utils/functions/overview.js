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

/** Colour of each line of the evolution charts. */
export const EVOLUTION_COLORS = {
  balance: "#1976d2",
  debit: "#2e7d32",
  spent: "#616161",
  instalments: "#7e57c2",
  budget: "#ef6c00",
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-09-01` as `Sep 26`. */
export function monthLabel(month) {
  const [year, number] = month.split("-")

  return `${MONTHS[+number - 1]} ${year.slice(2)}`
}

/**
 * The charts of the evolution from the months of `GET /history`, as `[{ key, title, series, data }]` where `series` is
 * `[{ key, label, color }]` and `data` has one `{ month, <series key>: value | null }` per month:
 * 1. Spent, every month (it exists before the balance start).
 * 2. Balance and Debit, from the first month with a balance.
 * 3. Instalments and Budget, from the first month with either (the budget appears when it starts).
 * A series with no value at all is left out, and so is a chart with no series.
 */
export function evolutionCharts(months) {
  const number = value => value === null || value === undefined ? null : +value

  const rows = months.map(item => ({
    month: monthLabel(item.month),
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
    const data = rows.slice(first).map(row => ({ month: row.month, ...Object.fromEntries(present.map(([name]) => [name, row[name]])) }))

    return [{ key, title, series: present.map(([name, label]) => ({ key: name, label, color: EVOLUTION_COLORS[name] })), data }]
  })
}
