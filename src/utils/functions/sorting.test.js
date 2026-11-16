import { describe, expect, it } from "vitest"
import { sortItems, sortSources } from "./sorting"

const e = (id, date, amount, description, category_id, instalments = null) => ({ id, date, amount, description, category_id, instalments })
const items = [e(1, "2026-10-05", 100, "Café", 2), e(2, "2026-10-20", 50, "alpha", 1), e(3, "2026-10-20", 75, null, null), e(4, "2026-10-01", 300, "Zeta", 3), e(5, "2026-10-05", 10, "beta", 2)]
const names = { 1: "Food", 2: "car", 3: "Éxtras" }
const ids = sort => sortItems(items, sort, "expenses", names).map(item => item.id)

describe("sortItems", () => {
  it("orders by date and keeps the order of the API on a tie", () => {
    expect(ids("date-desc")).toEqual([2, 3, 1, 5, 4])
    expect(ids("date-asc")).toEqual([4, 1, 5, 2, 3])
  })

  it("orders by description and leaves the rows with none last in either direction", () => {
    expect(ids("description-asc")).toEqual([2, 5, 1, 4, 3])
    expect(ids("description-desc")).toEqual([4, 1, 5, 2, 3])
  })

  it("orders by category without caring for accents and leaves the rows with none last", () => {
    expect(ids("category-asc")).toEqual([1, 5, 4, 2, 3])
  })

  it("orders by amount", () => {
    expect(ids("amount-desc")).toEqual([4, 1, 3, 2, 5])
    expect(ids("amount-asc")).toEqual([5, 2, 3, 1, 4])
  })

  it("falls back to the default order for an unknown one", () => {
    expect(ids("nonsense")).toEqual(ids("date-desc"))
  })

  it("sorts an instalment by its monthly share", () => {
    const instalments = [e(1, "2026-10-05", 1200, "a", null, 12), e(2, "2026-10-05", 600, "b", null, 2)]

    expect(sortItems(instalments, "amount-desc", "instalments", {}).map(item => item.id)).toEqual([2, 1]) // 300 against 100
  })

  it("sorts a transfer by what it means for the source and gives it no category", () => {
    const transfers = [{ id: 1, date: "2026-10-01", signed_amount: -500, description: "x" }, { id: 2, date: "2026-10-02", signed_amount: 200, description: "y" }]

    expect(sortItems(transfers, "amount-desc", "transfers", {}).map(item => item.id)).toEqual([2, 1])
    expect(sortItems(transfers, "category-asc", "transfers", {}).map(item => item.id)).toEqual([1, 2])
  })
})

describe("sortSources", () => {
  it("keeps the sources, their order and the input untouched", () => {
    const sources = [{ id: 9, expenses: items, instalments: [], incomes: [], transfers: undefined }]
    const out = sortSources(sources, "amount-asc", [{ id: 1, name: "Food" }])

    expect(out[0].id).toBe(9)
    expect(out[0].transfers).toBeUndefined()
    expect(items.map(item => item.id)).toEqual([1, 2, 3, 4, 5])
  })
})
