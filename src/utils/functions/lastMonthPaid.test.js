import { describe, expect, it } from "vitest"
import { lastMonthCleared, lastMonthOwed, lastMonthPaid } from "./lastMonthPaid"

const card = (previous, transfers = [], balance = -500) => ({ kind: "card", balance, previous_balance: previous, transfers })

describe("lastMonthOwed", () => {
  it("is what it owed at the close of the previous month less this month's payments", () => {
    expect(lastMonthOwed(card(-800, [{ signed_amount: 300 }]))).toBe(500)
    expect(lastMonthPaid(card(-800, [{ signed_amount: 300 }]))).toBe(false)
  })

  it("is 0 when it is paid, and never below 0 when it is paid too much", () => {
    expect(lastMonthOwed(card(-800, [{ signed_amount: 800 }]))).toBe(0)
    expect(lastMonthPaid(card(-800, [{ signed_amount: 800 }]))).toBe(true)
    expect(lastMonthOwed(card(-200, [{ signed_amount: 500 }]))).toBe(0)
  })

  it("is 0 in the balance start month, which has no previous month", () => {
    expect(lastMonthOwed(card(null))).toBe(0)
  })

  it("is null when it cannot be known", () => {
    expect(lastMonthOwed(card(undefined))).toBeNull() // an API without previous_balance
    expect(lastMonthOwed({ kind: "account", balance: 5, previous_balance: 5 })).toBeNull()
    expect(lastMonthOwed(card(-800, [], null))).toBeNull() // before the balance start
  })
})

describe("lastMonthCleared", () => {
  it("says what the card owed when it is paid", () => {
    expect(lastMonthCleared(card(-500, [{ signed_amount: 500 }]))).toBe(500)
    expect(lastMonthCleared(card(-500, [{ signed_amount: 900 }]))).toBe(500) // paid too much: it still says what it owed
  })

  it("has nothing to say when it is not paid or owed nothing", () => {
    expect(lastMonthCleared(card(-800, [{ signed_amount: 300 }]))).toBeNull()
    expect(lastMonthCleared(card(null))).toBeNull()
    expect(lastMonthCleared(card(0))).toBeNull()
    expect(lastMonthCleared(card(undefined))).toBeNull()
  })
})
