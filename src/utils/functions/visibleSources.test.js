import { describe, expect, it } from "vitest"
import { emptyFilters } from "./filters"
import { visibleSources } from "./visibleSources"

const empty = { id: 1, name: "Empty", currency: "MXN", expenses: [], instalments: [], incomes: [], transfers: [] }
const withTransfer = { ...empty, id: 2, name: "Bank", transfers: [{ id: 1, date: "2026-11-01", signed_amount: 10, description: "x" }] }
const withExpense = { ...empty, id: 3, name: "Card", expenses: [{ id: 1, date: "2026-11-01", amount: 5, description: "tacos", category_id: null }] }
const state = (filters, sources = [empty, withTransfer, withExpense]) => ({ sources, filters, categories: [], rates: {} })
const all = { expenses: true, recurring: true, instalments: true, incomes: true, transfers: true }

describe("visibleSources", () => {
  it("leaves out the sources with nothing to show", () => {
    expect(visibleSources(state(emptyFilters(all))).map(source => source.id)).toEqual([2, 3])
  })

  it("shows a source that only has a recurring expense", () => {
    const onlyRule = { ...empty, id: 4, name: "Rule", recurring: [{ id: 1, date: "2026-11-01", amount: 5, description: "Netflix", category_id: null }] }

    expect(visibleSources(state(emptyFilters(all), [empty, onlyRule])).map(source => source.id)).toEqual([4])
  })

  it("applies the filters, so a source with no matches is hidden", () => {
    expect(visibleSources(state(emptyFilters({ ...all, transfers: false }))).map(source => source.id)).toEqual([3])
    expect(visibleSources(state({ ...emptyFilters(all), text: "tacos" })).map(source => source.id)).toEqual([3])
    expect(visibleSources(state({ ...emptyFilters(all), text: "nothing like this" }))).toEqual([])
  })

  it("gives back the same answer while nothing it depends on changes", () => {
    const current = state(emptyFilters(all))

    expect(visibleSources(current)).toBe(visibleSources(current))
    expect(visibleSources({ ...current })).toBe(visibleSources(current)) // the same lists, even in a new object
    expect(visibleSources({ ...current, filters: { ...current.filters, text: "tacos" } })).not.toBe(visibleSources(current))
  })
})
