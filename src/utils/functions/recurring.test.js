import { describe, expect, it } from "vitest"
import { EVERY_OPTIONS, billingOf, everyText, expenseError, expensePayload, isRecurring, withRecurring } from "./recurring"

const plain = { id: 1, amount: 100, date: "2026-10-10", description: "Tacos", instalments: null, recurs_every: null, ends_on: null }
const rule = { id: 2, amount: 199, date: "2026-10-10", description: "Netflix", instalments: null, recurs_every: 1, ends_on: null, occurrence_date: "2026-11-10" }
const form = (patch = {}) => ({ amount: "199", date: "2026-11-10", instalments: null, recurs_every: null, ends_on: null, billing: "one", ...patch })

describe("withRecurring", () => {
  it("puts the recurring expenses in a group of their own and leaves the plain ones in expenses", () => {
    const [source] = withRecurring([{ id: 9, expenses: [plain, rule], instalments: [], incomes: [], transfers: [] }])

    expect(source.expenses.map(expense => expense.id)).toEqual([1])
    expect(source.recurring.map(expense => expense.id)).toEqual([2])
    expect([source.expenses_count, source.recurring_count]).toEqual([1, 1])
    expect(source.instalments).toEqual([])
  })

  it("leaves everything in expenses when the API does not send recurs_every (an older one)", () => {
    const old = { ...plain }

    delete old.recurs_every
    const [source] = withRecurring([{ id: 9, expenses: [old], instalments: [], incomes: [] }])

    expect(source.expenses).toHaveLength(1)
    expect(source.recurring).toEqual([])
  })

  it("knows a recurring expense by recurs_every, even when it is 0 months of nothing else", () => {
    expect(isRecurring(rule)).toBe(true)
    expect(isRecurring(plain)).toBe(false)
    expect(isRecurring({})).toBe(false)
  })
})

describe("how it bills", () => {
  it("is one payment, instalments or a repetition", () => {
    expect(billingOf(plain)).toBe("one")
    expect(billingOf({ ...plain, instalments: 6 })).toBe("instalments")
    expect(billingOf(rule)).toBe("repeats")
  })

  it("is what the form says when it says something", () => {
    expect(billingOf({ ...plain, billing: "repeats" })).toBe("repeats")
    expect(billingOf(undefined)).toBe("one")
  })

  it("writes how often it repeats", () => {
    expect(EVERY_OPTIONS.map(option => option.value)).toEqual([1, 3, 6, 12])
    expect([1, 3, 6, 12, 2, 24].map(everyText)).toEqual(["month", "3 months", "6 months", "year", "2 months", "24 months"])
  })
})

describe("expenseError", () => {
  it("accepts a plain expense, instalments and a repetition", () => {
    expect(expenseError(form())).toBeNull()
    expect(expenseError(form({ billing: "instalments", instalments: "3" }))).toBeNull()
    expect(expenseError(form({ billing: "repeats", recurs_every: "12", ends_on: "2027-11-10" }))).toBeNull()
    expect(expenseError(form({ billing: "repeats", recurs_every: "1", ends_on: "2026-11-10" }))).toBeNull() // one charge: it ends the day it starts
  })

  it("refuses a wrong amount", () => {
    expect(expenseError(form({ amount: null }))).toBe("Incorrect 'Amount' format.")
    expect(expenseError(form({ amount: "0" }))).toBe("Incorrect 'Amount' format.")
    expect(expenseError(form({ amount: "abc" }))).toBe("Incorrect 'Amount' format.")
  })

  it("refuses instalments below 2 or that are not whole", () => {
    expect(expenseError(form({ billing: "instalments", instalments: "1" }))).toBe("Incorrect 'Instalments' format.")
    expect(expenseError(form({ billing: "instalments", instalments: "2.5" }))).toBe("Incorrect 'Instalments' format.")
    expect(expenseError(form({ billing: "instalments", instalments: null }))).toBe("Incorrect 'Instalments' format.")
  })

  it("refuses a repetition from 0 or over 60 months, a decimal or none", () => {
    for (const value of ["0", "61", "1.5", null]) {
      expect(expenseError(form({ billing: "repeats", recurs_every: value }))).toBe("Incorrect 'Every' format.")
    }
  })

  it("refuses to end before the first charge", () => {
    expect(expenseError(form({ billing: "repeats", recurs_every: "1", ends_on: "2026-11-09" }))).toBe("'Until' cannot be before the first charge.")
  })

  it("does not look at the fields of the other ways of billing", () => {
    expect(expenseError(form({ billing: "one", instalments: "1", recurs_every: "99" }))).toBeNull()
  })
})

describe("expensePayload", () => {
  it("drops the fields of the form itself and turns the amount into a number", () => {
    expect(expensePayload(form({ custom_every: true }))).toEqual({ amount: 199, date: "2026-11-10", instalments: null, recurs_every: null, ends_on: null })
  })

  it("sends only what its way of billing uses and clears the rest", () => {
    expect(expensePayload(form({ billing: "instalments", instalments: "6", recurs_every: 3, ends_on: "2027-01-01" }))).toMatchObject({ instalments: 6, recurs_every: null, ends_on: null })
    expect(expensePayload(form({ billing: "repeats", recurs_every: "3", ends_on: "2027-01-01", instalments: 4 }))).toMatchObject({ instalments: null, recurs_every: 3, ends_on: "2027-01-01" })
    expect(expensePayload(form({ billing: "repeats", recurs_every: "1", ends_on: "" }))).toMatchObject({ recurs_every: 1, ends_on: null })
  })
})
