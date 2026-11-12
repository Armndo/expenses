import { monthlyShare } from "./monthlyShare"

/** The orders of the rows of a source, inside each group of the table (expenses, instalments, transfers and incomes). */
export const SORT_OPTIONS = [
  { value: "date-desc", label: "Date, newest first" },
  { value: "date-asc", label: "Date, oldest first" },
  { value: "description-asc", label: "Description, A to Z" },
  { value: "description-desc", label: "Description, Z to A" },
  { value: "category-asc", label: "Category, A to Z" },
  { value: "category-desc", label: "Category, Z to A" },
  { value: "amount-desc", label: "Amount, highest first" },
  { value: "amount-asc", label: "Amount, lowest first" },
]

export const DEFAULT_SORT = "date-desc"

/** What a row shows as its amount in each group: the monthly share of an instalment, and what a transfer means for the source. */
const AMOUNTS = {
  expenses: expense => expense.amount,
  instalments: monthlyShare,
  incomes: income => income.amount,
  transfers: transfer => transfer.signed_amount,
}

function text(value) {
  const clean = `${value ?? ""}`.trim().toLowerCase()

  return clean === "" ? null : clean
}

/**
 * The rows of one group sorted by `sort` (`key-direction`, one of `SORT_OPTIONS`; an unknown one falls back to the default).
 * A row with no value for the key (an income or a transfer has no category, an expense may have none) goes last in either
 * direction, and equal rows keep the order they came in, so the default order is the one the API sends.
 */
export function sortItems(items, sort, group, categoryNames = {}) {
  const [key, direction] = (SORT_OPTIONS.some(option => option.value === sort) ? sort : DEFAULT_SORT).split("-")
  const sign = direction === "asc" ? 1 : -1

  const value = item => {
    switch (key) {
      case "date": return `${item.date ?? ""}`.slice(0, 10) || null
      case "description": return text(item.description)
      case "category": return text(categoryNames[item.category_id])
      default: return AMOUNTS[group](item)
    }
  }

  return items
    .map((item, index) => ({ item, index, value: value(item) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return a.value === b.value ? a.index - b.index : a.value === null ? 1 : -1
      }

      const order = typeof a.value === "number" ? a.value - b.value : a.value.localeCompare(b.value, "es", { sensitivity: "base", numeric: true })

      return order !== 0 ? sign * order : a.index - b.index
    })
    .map(entry => entry.item)
}

/** The sources with the rows of each group sorted; the sources themselves keep their order. */
export function sortSources(sources, sort, categories = []) {
  const names = Object.fromEntries(categories.map(category => [category.id, category.name]))

  return sources.map(source => ({
    ...source,
    expenses: sortItems(source.expenses ?? [], sort, "expenses", names),
    instalments: sortItems(source.instalments ?? [], sort, "instalments", names),
    incomes: sortItems(source.incomes ?? [], sort, "incomes", names),
    transfers: source.transfers ? sortItems(source.transfers, sort, "transfers", names) : source.transfers,
  }))
}
