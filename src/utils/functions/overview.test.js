import { describe, expect, it } from "vitest"
import { LOG_FROM, budgetColor, chartAxis, compactMoney, evolutionCharts, logScale, monthLabel, overviewBars, overviewSlices, overviewSources, unlogScale } from "./overview"

const category = (id, name, count, sum) => ({ id, name, expenses_count: count, expenses_sum_amount: sum })
const categories = [category(1, "Food", 5, 100), category(2, "Car", 2, 300), category(3, "Refunds", 1, -50), category(4, "Empty", 0, 0)]

describe("overviewSlices", () => {
  it("only has positive values, largest first, with their share of the total", () => {
    const slices = overviewSlices(categories, true)

    expect(slices.map(slice => slice.id)).toEqual([2, 1])
    expect(slices.map(slice => slice.share)).toEqual([0.75, 0.25])
  })

  it("counts expenses instead of amounts", () => {
    expect(overviewSlices(categories, false).map(slice => slice.id)).toEqual([1, 2, 3])
  })
})

describe("overviewBars", () => {
  it("keeps the categories with expenses even when they add up to a negative, with the absolute value to draw", () => {
    const bars = overviewBars(categories, true)

    expect(bars.map(bar => bar.id)).toEqual([2, 1, 3])
    expect(bars.at(-1)).toMatchObject({ value: -50, abs: 50 })
  })
})

describe("overviewSources", () => {
  const sources = [
    { id: 1, name: "Invex", kind: "card", currency: "MXN", expenses: [{ amount: 100 }, { amount: 50 }], instalments: [{ amount: 1200, instalments: 12 }] },
    { id: 2, name: "Azteca", kind: "account", currency: "MXN", expenses: [{ amount: 250 }], instalments: [] },
    { id: 3, name: "Dollar", kind: "account", currency: "USD", expenses: [{ amount: 10 }], instalments: [] },
    { id: 4, name: "Empty", kind: "account", currency: "MXN", expenses: [], instalments: [] },
  ]

  it("adds up by source and by type in pesos, with what is left out for a missing rate", () => {
    const out = overviewSources(sources, { USD: 20 })

    expect(out.items.map(item => [item.name, item.expenses_sum_amount])).toEqual([["Invex", 250], ["Azteca", 250], ["Dollar", 200]])
    expect(out.split.credit.amount).toBe(150)
    expect(out.split.debit.amount).toBe(450) // 250 pesos and 10 dollars
    expect(out.split.instalments.amount).toBe(100)
    expect(out.total).toBe(700)
    expect(out.top.name).not.toBe("Dollar")

    const without = overviewSources(sources, {})

    expect(without.missing.map(source => source.name)).toEqual(["Dollar"])
    expect(without.items.map(item => item.name)).toEqual(["Invex", "Azteca"])
  })

  it("gives each type the shape of a category so the bars and the pie can draw it", () => {
    const { types } = overviewSources(sources, { USD: 20 })

    expect(types.map(type => type.name)).toEqual(["Credit", "Debit", "Instalments"])
    expect(types[0]).toMatchObject({ expenses_count: 2, expenses_sum_amount: 150 })
  })
})

describe("the axes", () => {
  it("compacts the money", () => {
    expect(compactMoney(900)).toBe("$900")
    expect(compactMoney(4500)).toBe("$4.5k")
    expect(compactMoney(160000)).toBe("$160k")
    expect(compactMoney(-1200000)).toBe("-$1.2M")
  })

  it("is linear up to LOG_FROM and logarithmic above it, without a jump, and unlogScale undoes it", () => {
    expect(logScale(500)).toBe(500)
    expect(logScale(-300)).toBe(-300)
    expect(logScale(LOG_FROM)).toBe(LOG_FROM)
    expect(logScale(LOG_FROM + 1) - logScale(LOG_FROM)).toBeCloseTo(1, 2)
    expect(unlogScale(logScale(25000))).toBeCloseTo(25000, 6)
    expect(unlogScale(logScale(-40))).toBe(-40)
  })

  it("stops at the data and goes out to the next mark only when it is within 15% of the span", () => {
    // the next marks are -5000 and 15000, 2400 and 3000 away from the data, more than 15% of 14600
    expect(chartAxis(-2600, 12000)).toMatchObject({ low: -2600, high: 12000 })
    // here -5000 is 1100 away, less than 15% of 15900, so the axis goes out to it
    expect(chartAxis(-3900, 12000).low).toBe(-5000)
    expect(chartAxis(-3900, 12000).ticks).toContain(0)
  })

  it("has no axis when there is nothing to lay out", () => {
    expect(chartAxis(5, 5)).toBeNull()
  })

  it("lays out a log axis in positions of logScale", () => {
    const axis = chartAxis(100, 80000, true)

    expect(axis.high).toBeGreaterThan(logScale(80000) - 1)
    expect(axis.ticks).toEqual([...axis.ticks].sort((a, b) => a - b))
  })

  it("paints the budget red when it was exceeded", () => {
    expect(budgetColor(-1)).not.toBe(budgetColor(1))
  })
})

describe("evolutionCharts", () => {
  const month = (date, values) => ({ month: date, spent: 0, total_money: null, cash: null, pending_instalments: null, budget_left: null, ...values })
  const months = [
    month("2026-08-01", { spent: 100 }),
    month("2026-09-01", { spent: 200, total_money: 1000, cash: 1200 }),
    month("2026-10-01", { spent: 300, total_money: 900, cash: 1100, pending_instalments: 400 }),
  ]

  it("has a chart for each group of series that has a value, from its first month", () => {
    const charts = evolutionCharts(months)

    expect(charts.map(chart => chart.key)).toEqual(["spent", "balance", "monthly"])
    expect(charts[0].data).toHaveLength(3)
    expect(charts[1].data.map(row => row.at)).toEqual(["2026-09", "2026-10"]) // from the first month with a balance
    expect(charts[2].series.map(series => series.key)).toEqual(["instalments"]) // no budget: its line is left out
  })

  it("names the months and leaves out a chart with no series", () => {
    expect(monthLabel("2026-09-01")).toBe("Sep 26")
    expect(evolutionCharts([month("2026-08-01", { spent: 100 })]).map(chart => chart.key)).toEqual(["spent"])
  })

  it("ends at the month on screen, with empty months after the history", () => {
    const upTo = evolutionCharts(months, "2026-12")[0].data

    expect(upTo.map(row => row.at)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"])
    expect(upTo.at(-1).spent).toBeNull()
    expect(evolutionCharts(months, "2026-09")[0].data.map(row => row.at)).toEqual(["2026-08", "2026-09"])
  })
})
