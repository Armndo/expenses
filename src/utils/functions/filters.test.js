import { beforeEach, describe, expect, it, vi } from "vitest"
import { activeFilterCount, emptyFilters, filterBounds, filterCounts, filterSources, hasFilters, loadTypes, saveTypes } from "./filters"

const categories = [{ id: 1, name: "Food", alias: "🍔" }, { id: 2, name: "Café", alias: "☕" }]
const rates = { USD: 20 }
const sources = [
  {
    id: 1, name: "Invex", currency: "MXN",
    expenses: [{ id: 1, date: "2026-11-02", amount: 100, description: "Tacos", category_id: 1 }, { id: 2, date: "2026-11-10", amount: 900, description: "Cafe con amigos", category_id: 2 }],
    instalments: [{ id: 3, date: "2026-10-20", amount: 12000, instalments: 12, description: "Laptop", category_id: null }],
    incomes: [{ id: 4, date: "2026-11-05", amount: 5000, description: "Salary" }],
    transfers: [{ id: 5, date: "2026-11-06", signed_amount: 1500, amount: 1500, description: "Pago", counterpart_name: "Azteca" }],
  },
  {
    id: 2, name: "Dollar", currency: "USD",
    expenses: [{ id: 6, date: "2026-11-03", amount: 10, description: "Netflix", category_id: null }], instalments: [], incomes: [],
    transfers: [{ id: 5, date: "2026-11-06", signed_amount: -1500, amount: 1500, description: "Pago", counterpart_name: "Invex" }],
  },
]
const all = { expenses: true, instalments: true, incomes: true, transfers: true }
const f = patch => ({ ...emptyFilters(all), ...patch })
const ids = (result, group) => result.flatMap(source => source[group].map(item => item.id))
const filter = (patch, context = { categories, rates }) => filterSources(sources, f(patch), context)

describe("hasFilters", () => {
  it("is off with nothing set and on with a word or a panel filter", () => {
    expect(hasFilters(f({}))).toBe(false)
    expect(hasFilters(f({ text: "x" }))).toBe(true)
    expect(activeFilterCount(f({ types: { ...all, incomes: false } }))).toBe(1)
    expect(activeFilterCount(f({ categories: [1], min: 5 }))).toBe(2)
  })

  it("gives back the same list when nothing is filtered", () => {
    expect(filterSources(sources, f({}))).toBe(sources)
  })
})

describe("filterSources: text", () => {
  it("matches words without case or accents, in any order", () => {
    expect(ids(filter({ text: "cafe" }), "expenses")).toEqual([2])
    expect(ids(filter({ text: "☕" }), "expenses")).toEqual([2])
    expect(ids(filter({ text: "tacos 100" }), "expenses")).toEqual([1])
  })

  it("looks in the source, the other account of a transfer and the amount", () => {
    expect(ids(filter({ text: "dollar" }), "expenses")).toEqual([6])
    expect(ids(filter({ text: "azteca" }), "transfers")).toEqual([5])
    expect(ids(filter({ text: "900.00" }), "expenses")).toEqual([2])
  })
})

describe("filterSources: types, categories, amount", () => {
  it("leaves out the rows of a type that is off", () => {
    expect(ids(filter({ types: { ...all, incomes: false } }), "incomes")).toEqual([])
  })

  it("keeps only expenses with the category and leaves out incomes and transfers", () => {
    const result = filter({ categories: [1] })

    expect(ids(result, "expenses")).toEqual([1])
    expect([ids(result, "incomes"), ids(result, "transfers"), ids(result, "instalments")]).toEqual([[], [], []])
  })

  it("compares the amount in pesos, with the monthly share of an instalment", () => {
    const result = filter({ min: 150, max: 1000 })

    expect(ids(result, "expenses")).toEqual([2, 6]) // Netflix: 10 dollars are 200 pesos
    expect(ids(result, "instalments")).toEqual([3]) // 12000 / 12
  })

  it("keeps a row whose currency has no rate, and does not touch incomes and transfers", () => {
    expect(ids(filter({ min: 150, max: 1000 }, { categories, rates: {} }), "expenses")).toEqual([2, 6])
    expect(ids(filter({ min: 5000 }), "incomes")).toEqual([4])
  })
})

describe("filterBounds and filterCounts", () => {
  it("gives the smallest and the largest amount in pesos", () => {
    expect(filterBounds(sources, rates)).toEqual({ min: 100, max: 1000 })
  })

  it("counts a transfer once, though it is on two sources", () => {
    expect(filterCounts(sources, filter({ text: "azteca" }))).toEqual({ records: 1, totalRecords: 6, sources: 1, totalSources: 2 })
  })
})

describe("the remembered types", () => {
  const store = {}

  beforeEach(() => {
    Object.keys(store).forEach(key => delete store[key])
    vi.stubGlobal("localStorage", { getItem: key => store[key] ?? null, setItem: (key, value) => { store[key] = value } })
  })

  it("starts with every type on and remembers the ones that were left on", () => {
    expect(loadTypes()).toEqual(all)
    saveTypes({ ...all, incomes: false })
    expect(loadTypes()).toEqual({ ...all, incomes: false })
  })

  it("ignores what is saved when it cannot be read", () => {
    store.filterTypes = "{not json"
    expect(loadTypes()).toEqual(all)
  })
})
