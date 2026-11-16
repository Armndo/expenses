import { describe, expect, it } from "vitest"
import { chargesIn, expenseDelta, periodText, periodsUpTo, previewBudget, previewSource, recordEffect } from "./balancePreview"

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

describe("recurring expenses", () => {
  it("counts a charge in its first period and every N months after it, up to the month on screen", () => {
    expect(periodsUpTo("2026-08", null, "2026-10", 1)).toBe(3) // Aug, Sep, Oct
    expect(periodsUpTo("2026-08", null, "2026-11", 3)).toBe(2) // Aug, Nov
    expect(periodsUpTo("2026-08", null, "2027-08", 12)).toBe(2) // Aug 26, Aug 27
    expect(periodsUpTo("2026-08", null, "2027-07", 12)).toBe(1)
    expect(periodsUpTo("2026-11", null, "2026-10", 1)).toBe(0) // it starts after
  })

  it("stops at the period of its last charge", () => {
    expect(periodsUpTo("2026-08", "2026-10", "2027-03", 1)).toBe(3)
    expect(periodsUpTo("2026-08", "2027-02", "2027-08", 3)).toBe(3) // Aug, Nov, Feb
  })

  it("has a charge in a month or not", () => {
    expect(chargesIn("2026-08", null, "2026-11", 3)).toBe(true)
    expect(chargesIn("2026-08", null, "2026-10", 3)).toBe(false)
    expect(chargesIn("2026-08", "2026-09", "2026-10", 1)).toBe(false) // it already ended
    expect(chargesIn("2026-10", null, "2026-10")).toBe(true) // a regular expense: in its period only
    expect(chargesIn("2026-10", null, "2026-11")).toBe(false)
    expect(chargesIn("2026-08", "2026-10", "2026-09")).toBe(true) // an instalment: in each of its periods
  })

  it("weighs on the balance with each of its charges, and on the previous balance with those before the month on screen", () => {
    expect(recordEffect({ kind: "periodic", amount: -100, period: "2026-08", last: null, every: 1 }, "2026-10")).toEqual({ balance: -300, previous: -200, moved: 0 })
    expect(recordEffect({ kind: "periodic", amount: -100, period: "2026-08", last: null, every: 3 }, "2026-10")).toEqual({ balance: -100, previous: -100, moved: 0 })
    expect(recordEffect({ kind: "periodic", amount: -100, period: "2026-08", last: null, every: 3 }, "2026-11")).toEqual({ balance: -200, previous: -100, moved: 0 })
  })
})

describe("cutting a recurring expense", () => {
  // Netflix, 199 a month since March, cut on the charge of November to 249: the new rule adds 249 from November and the old one's 199 from
  // November are taken away (the charges of March to October are not touched), so each charge up to the month on screen changes by 50.
  it("changes each charge from the cut up to the month on screen by the difference, and nothing before it", () => {
    const fromTheCut = (shown) => {
      const added = recordEffect({ kind: "periodic", amount: -249, period: "2026-11", every: 1 }, shown)
      const taken = recordEffect({ kind: "periodic", amount: 199, period: "2026-11", every: 1 }, shown)

      return added.balance + taken.balance
    }

    expect(fromTheCut("2026-10")).toBe(0)
    expect(fromTheCut("2026-11")).toBe(-50)
    expect(fromTheCut("2027-01")).toBe(-150)
  })

  it("follows a change of how often it repeats from the cut: every 3 months instead of every month", () => {
    const added = recordEffect({ kind: "periodic", amount: -199, period: "2026-11", every: 3 }, "2027-05")
    const taken = recordEffect({ kind: "periodic", amount: 199, period: "2026-11", every: 1 }, "2027-05")

    expect(added.balance + taken.balance).toBe(199 * (7 - 3))
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
