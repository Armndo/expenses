import { describe, expect, it } from "vitest"
import { expenseDelta, periodText, periodsUpTo, previewBudget, previewSource, recordEffect } from "./balancePreview"

const bank = { id: 1, name: "Azteca", kind: "account", currency: "MXN", balance: 20000, previous_balance: 20000 }
const card = { id: 2, name: "Invex", kind: "card", currency: "MXN", balance: -5500, previous_balance: -1300, transfers: [] }
const effect = (record, shown = "2026-10") => recordEffect(record, shown)

describe("periodsUpTo", () => {
  it("counts the periods of a record up to the month on screen", () => {
    expect(periodsUpTo("2026-10", null, "2026-10")).toBe(1)
    expect(periodsUpTo("2026-10", null, "2026-09")).toBe(0) // starts after it
    expect(periodsUpTo("2026-08", "2027-07", "2026-10")).toBe(3) // Aug, Sep, Oct
    expect(periodsUpTo("2026-08", "2026-09", "2026-12")).toBe(2) // never past its last
    expect(periodsUpTo("2025-12", "2026-02", "2026-01")).toBe(2) // across the year
    expect(periodsUpTo("2025-12", null, "2026-01")).toBe(1) // a single period that is over still counts once
  })
})

describe("recordEffect", () => {
  it("counts a transfer by the calendar month of its date", () => {
    expect(effect({ kind: "transfer", amount: 500, period: "2026-10" })).toEqual({ balance: 500, previous: 0, moved: 500 })
    expect(effect({ kind: "transfer", amount: 500, period: "2026-09" })).toEqual({ balance: 500, previous: 500, moved: 0 })
    expect(effect({ kind: "transfer", amount: 500, period: "2026-11" })).toEqual({ balance: 0, previous: 0, moved: 0 })
  })

  it("counts an expense in the month, an earlier one and an instalment", () => {
    expect(effect({ kind: "periodic", amount: -100, period: "2026-10", last: null })).toEqual({ balance: -100, previous: 0, moved: 0 })
    expect(effect({ kind: "periodic", amount: -100, period: "2026-09", last: null })).toEqual({ balance: -100, previous: -100, moved: 0 })
    expect(effect({ kind: "periodic", amount: -100, period: "2026-08", last: "2026-12" })).toEqual({ balance: -300, previous: -200, moved: 0 })
    expect(effect({ kind: "periodic", amount: 0, period: "2026-10" })).toEqual({ balance: 0, previous: 0, moved: 0 })
  })
})

describe("previewSource", () => {
  it("moves the balance of an account", () => {
    const out = previewSource(bank, [effect({ kind: "transfer", amount: -5000, period: "2026-10" })], "2026-10")

    expect(out.before).toBe(20000)
    expect(out.after).toBe(15000)
    expect(out.card).toBe(false)
  })

  it("moves what a card owes and what is left of the debt of earlier periods", () => {
    const paid = previewSource(card, [effect({ kind: "transfer", amount: 5000, period: "2026-10" })], "2026-10")

    expect([paid.before, paid.after]).toEqual([5500, 500])
    expect(paid.lastOwed).toEqual({ before: 1300, after: 0 }) // the 5000 covers the 1300 of last month

    const part = previewSource(card, [effect({ kind: "transfer", amount: 800, period: "2026-10" })], "2026-10")

    expect(part.lastOwed).toEqual({ before: 1300, after: 500 })
  })

  it("does not change the debt of earlier periods with an expense of this one, but does with an earlier one", () => {
    const spend = previewSource(card, [effect({ kind: "periodic", amount: -300, period: "2026-10" })], "2026-10")

    expect(spend.after).toBe(5800)
    expect(spend.lastOwed).toEqual({ before: 1300, after: 1300 })

    const old = previewSource(card, [effect({ kind: "periodic", amount: -300, period: "2026-09" })], "2026-10")

    expect(old.lastOwed).toEqual({ before: 1300, after: 1600 })
  })

  it("subtracts the old effect when a record is edited", () => {
    const edited = previewSource(bank, [effect({ kind: "periodic", amount: -150, period: "2026-10" }), effect({ kind: "periodic", amount: 100, period: "2026-10" })], "2026-10")

    expect(edited.after).toBe(19950)
  })

  it("has nothing for a source before the balance start", () => {
    expect(previewSource({ ...bank, balance: null }, [], "2026-10")).toBeNull()
  })
})

describe("previewBudget", () => {
  const summary = { budget_left: 4723.52 }

  it("moves what is left of the budget when the record falls in the month on screen", () => {
    expect(previewBudget(summary, {}, "MXN", -500, "2026-10", "2026-10")).toEqual({ before: 4723.52, after: 4223.52 })
  })

  it("converts another currency with its rate and says nothing without one", () => {
    expect(previewBudget(summary, { USD: 18 }, "USD", -10, "2026-10", "2026-10")).toEqual({ before: 4723.52, after: 4543.52 })
    expect(previewBudget(summary, {}, "USD", -10, "2026-10", "2026-10")).toBeNull()
  })

  it("says nothing for an earlier period or without a budget", () => {
    expect(previewBudget(summary, {}, "MXN", -500, "2026-09", "2026-10")).toBeNull()
    expect(previewBudget({ budget_left: null }, {}, "MXN", -500, "2026-10", "2026-10")).toBeNull()
  })
})

describe("expenseDelta", () => {
  it("is minus the monthly share of an instalment", () => {
    expect(expenseDelta({ amount: "1200", instalments: "12" })).toBe(-100)
    expect(expenseDelta({ amount: "100", instalments: null })).toBe(-100)
    expect(expenseDelta({ amount: "", instalments: null })).toBe(0)
  })
})

describe("periodText", () => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  it("writes a month and, for an instalment, the range", () => {
    expect(periodText("2026-12", null, months)).toBe("Dic 2026")
    expect(periodText("2026-11", "2027-10", months)).toBe("Nov 2026 to Oct 2027")
    expect(periodText("2026-11", "2026-11", months)).toBe("Nov 2026")
    expect(periodText(null, null, months)).toBeNull()
  })
})
