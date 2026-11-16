import { beforeEach, describe, expect, it, vi } from "vitest"
import { rememberPeriod } from "./rememberPeriod"

describe("rememberPeriod", () => {
  const store = {}

  beforeEach(() => {
    Object.keys(store).forEach(key => delete store[key])
    vi.stubGlobal("localStorage", { getItem: key => store[key] ?? null, setItem: (key, value) => { store[key] = value } })
  })

  it("puts the month of the record on screen, on day 2 like the month selector", () => {
    rememberPeriod("2026-12")
    expect(store.date).toBe("2026-12-02")
  })

  it("changes nothing for a missing or odd period (an API that does not send it)", () => {
    rememberPeriod(undefined)
    rememberPeriod("december")
    rememberPeriod("2026-1")
    expect(store.date).toBeUndefined()
  })
})
