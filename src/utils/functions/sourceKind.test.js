import { describe, expect, it } from "vitest"
import { activeCategories, activeSources, defaultTransferFrom, incomeSources, isCard, kindLabel, sourceOptionLabel } from "./sourceKind"

const account = { id: 1, name: "Azteca", cutoff: null, kind: "account" }
const card = { id: 2, name: "Invex", cutoff: 6, kind: "card" }
const calendar = { id: 3, name: "Nu", cutoff: 0, kind: "card" }
const old = { id: 4, name: "Old", cutoff: null, kind: "account", disabled: true }

describe("sourceKind", () => {
  it("tells a card from an account by the kind, or by the cutoff when there is none (even 0)", () => {
    expect(isCard(card)).toBe(true)
    expect(isCard(calendar)).toBe(true)
    expect(isCard(account)).toBe(false)
    expect(isCard({ cutoff: 0 })).toBe(true)
    expect(isCard({ cutoff: null })).toBe(false)
    expect(kindLabel(card)).toBe("Credit")
    expect(kindLabel(account)).toBe("Debit")
  })

  it("says the cutoff of a card in the dropdowns and only the name of an account", () => {
    expect(sourceOptionLabel(card)).toBe("Invex (cutoff 6)")
    expect(sourceOptionLabel(calendar)).toBe("Nu (cutoff 0)")
    expect(sourceOptionLabel(account)).toBe("Azteca")
  })

  it("offers what is enabled plus the one that is selected, even disabled", () => {
    expect(activeSources([account, card, old], null).map(source => source.id)).toEqual([1, 2])
    expect(activeSources([account, card, old], 4).map(source => source.id)).toEqual([1, 2, 4])
    expect(activeCategories([{ id: 1 }, { id: 2, disabled: true }], 2).map(category => category.id)).toEqual([1, 2])
    expect(activeCategories([{ id: 1 }, { id: 2, disabled: true }], null).map(category => category.id)).toEqual([1])
  })

  it("lets an income go only to a debit account, keeping the one it already has", () => {
    expect(incomeSources([account, card, calendar, old], null).map(source => source.id)).toEqual([1])
    expect(incomeSources([account, card, calendar, old], 2).map(source => source.id)).toEqual([1, 2])
  })

  it("starts a transfer from the last origin only if it is still an enabled debit account", () => {
    expect(defaultTransferFrom([account, card, old], 1)).toBe(1)
    expect(defaultTransferFrom([account, card, old], 2)).toBeNull() // a card cannot be the origin
    expect(defaultTransferFrom([account, card, old], 4)).toBeNull() // disabled
    expect(defaultTransferFrom([account, card, old], 99)).toBeNull()
  })
})
