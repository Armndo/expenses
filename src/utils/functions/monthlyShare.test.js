import { describe, expect, it } from "vitest"
import { monthlyShare } from "./monthlyShare"

describe("monthlyShare", () => {
  it("is the whole amount without instalments", () => {
    expect(monthlyShare({ amount: 500, instalments: null })).toBe(500)
  })

  it("rounds each share to cents, halves away from zero, like the API", () => {
    // 14405.58 / 12 = 1200.465 exactly: floats say 1200.4649999 and would bill a cent less
    expect(monthlyShare({ amount: 14405.58, instalments: 12 })).toBe(1200.47)
    expect(monthlyShare({ amount: 1000, instalments: 3 })).toBe(333.33)
    expect(monthlyShare({ amount: 100, instalments: 6 })).toBe(16.67)
  })

  it("keeps the sign of a refund", () => {
    expect(monthlyShare({ amount: -14405.58, instalments: 12 })).toBe(-1200.47)
  })

  it("is exact when it divides", () => {
    expect(monthlyShare({ amount: 1200, instalments: 12 })).toBe(100)
  })
})
