import { describe, expect, it } from "vitest"
import { EVERY_OPTIONS, billingOf, canCut, deleteQuery, everyText, expenseError, expensePayload, isRecurring, previewRecords, scopeOf, scopeQuery, startOf, withRecurring } from "./recurring"

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

// A row of the rule of Netflix, from 10 March, as it comes when the month on screen is November: its charge is the one of the 10th of November.
const row = (patch = {}) => ({ id: 2, amount: "199", date: "2026-03-10", occurrence_date: "2026-11-10", instalments: null, recurs_every: 1, ends_on: null, billing: "repeats", ...patch })

describe("canCut", () => {
  it("is true on a charge after the first one of a rule, and not on the first one", () => {
    expect(canCut(row())).toBe(true)
    expect(canCut(row({ occurrence_date: "2026-03-10" }))).toBe(false)
  })

  it("is false for what is not a rule or has no charge", () => {
    expect(canCut(plain)).toBe(false)
    expect(canCut(row({ recurs_every: null }))).toBe(false)
    expect(canCut(row({ occurrence_date: undefined }))).toBe(false)
    expect(canCut(null)).toBe(false)
  })
})

describe("scopeOf", () => {
  it("is this and the following by default on a charge that can be cut", () => {
    expect(scopeOf(row())).toBe("following")
    expect(scopeOf(row({ scope: "following" }))).toBe("following")
  })

  it("is all when the form says so, on the first charge, for a new expense and when it stops repeating", () => {
    expect(scopeOf(row({ scope: "all" }))).toBe("all")
    expect(scopeOf(row({ occurrence_date: "2026-03-10" }))).toBe("all")
    expect(scopeOf({ ...row(), id: undefined })).toBe("all")
    expect(scopeOf(row({ billing: "one" }))).toBe("all")
    expect(scopeOf(row({ billing: "instalments", instalments: 3 }))).toBe("all")
  })
})

describe("startOf", () => {
  it("is the charge that is cut for the following ones and the date of the rule for all of them", () => {
    expect(startOf(row())).toBe("2026-11-10")
    expect(startOf(row({ scope: "all" }))).toBe("2026-03-10")
  })

  it("is the date of the form for a new expense", () => {
    expect(startOf(form({ billing: "repeats" }))).toBe("2026-11-10")
  })
})

describe("scopeQuery", () => {
  it("cuts at the charge for the following ones and asks for all of them otherwise", () => {
    expect(scopeQuery(row())).toBe("?scope=following&occurrence_date=2026-11-10")
    expect(scopeQuery(row({ scope: "all" }))).toBe("?scope=all")
    expect(scopeQuery(row({ occurrence_date: "2026-03-10" }))).toBe("?scope=all")
  })

  it("has nothing for a new expense or one that is not a row of a rule", () => {
    expect(scopeQuery({ ...row(), id: undefined })).toBe("")
    expect(scopeQuery({ ...plain, billing: "one" })).toBe("")
  })
})

describe("deleteQuery", () => {
  it("ends the rule at the charge for the following ones and deletes all of it otherwise", () => {
    expect(deleteQuery(row(), "following")).toBe("?scope=following&occurrence_date=2026-11-10")
    expect(deleteQuery(row(), "all")).toBe("?scope=all")
  })

  it("deletes all of it on the first charge, where there is nothing before to keep", () => {
    expect(deleteQuery(row({ occurrence_date: "2026-03-10" }), "following")).toBe("?scope=all")
  })
})

describe("the form when it cuts", () => {
  it("does not send the date of the rule nor its own scope", () => {
    const payload = expensePayload(row({ scope: "following", amount: "249" }))

    expect(payload).toMatchObject({ id: 2, amount: 249, recurs_every: 1, ends_on: null })
    expect(payload).not.toHaveProperty("date")
    expect(payload).not.toHaveProperty("scope")
  })

  it("sends the date of the rule when it edits all of it", () => {
    expect(expensePayload(row({ scope: "all" }))).toMatchObject({ date: "2026-03-10" })
  })

  it("refuses to end before the charge that is cut, and before the first charge when it edits all of it", () => {
    expect(expenseError(row({ ends_on: "2026-11-09" }))).toBe("'Until' cannot be before this charge.")
    expect(expenseError(row({ ends_on: "2026-11-10" }))).toBeNull()
    expect(expenseError(row({ scope: "all", ends_on: "2026-03-09" }))).toBe("'Until' cannot be before the first charge.")
    expect(expenseError(row({ scope: "all", ends_on: "2026-05-01" }))).toBeNull()
  })
})

describe("previewRecords", () => {
  it("starts the record and the one it was on the charge that is cut, so the charges before it do not count", () => {
    const original = { ...row(), amount: 199 }
    const { record, original: old } = previewRecords(row({ amount: "249" }), original)

    expect([record.date, old.date, record.amount, old.amount]).toEqual(["2026-11-10", "2026-11-10", "249", 199])
  })

  it("leaves them as they are when it edits all of the rule, or a new expense", () => {
    const original = row()

    expect(previewRecords(row({ scope: "all" }), original).record.date).toBe("2026-03-10")
    expect(previewRecords(row({ scope: "all" }), original).original).toBe(original)
    expect(previewRecords(form(), null)).toEqual({ record: form(), original: null })
  })
})
