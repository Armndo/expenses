import { describe, expect, it } from "vitest"
import { filterCategories, normalizeText } from "./search"

const categories = [{ id: 1, name: "Healthcare", alias: "🩺" }, { id: 2, name: "Educación", alias: "📖" }, { id: 3, name: "Car", alias: null }]

describe("normalizeText", () => {
  it("lowercases, trims and drops the accents", () => {
    expect(normalizeText("  ÉXTRAS ")).toBe("extras")
    expect(normalizeText(null)).toBe("")
  })
})

describe("filterCategories", () => {
  it("finds by name without accents and by alias", () => {
    expect(filterCategories(categories, "educacion").map(category => category.id)).toEqual([2])
    expect(filterCategories(categories, "📖").map(category => category.id)).toEqual([2])
  })

  it("puts the ones whose name starts with it first", () => {
    expect(filterCategories(categories, "car").map(category => category.id)).toEqual([3, 1]) // Car starts with it, Healthcare only holds it
    expect(filterCategories(categories, "CAR").map(category => category.id)).toEqual([3, 1])
  })

  it("gives all of them for an empty text", () => {
    expect(filterCategories(categories, "")).toHaveLength(3)
  })
})
