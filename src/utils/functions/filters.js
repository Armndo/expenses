import { monthlyShare } from "./monthlyShare"
import { normalizeText } from "./search"

/** The groups of rows of a source, in the order the table shows them. */
export const FILTER_TYPES = [
  { key: "expenses", label: "Expenses" },
  { key: "recurring", label: "Recurring" },
  { key: "instalments", label: "Instalments" },
  { key: "transfers", label: "Transfers" },
  { key: "incomes", label: "Incomes" },
]

const TYPES_KEY = "filterTypes"

/** The types that were left on the last time (all of them the first time, or when what is saved is not readable). */
export function loadTypes() {
  const all = Object.fromEntries(FILTER_TYPES.map(type => [type.key, true]))

  try {
    const saved = JSON.parse(localStorage.getItem(TYPES_KEY) ?? "null")

    return saved && typeof saved === "object" ? Object.fromEntries(FILTER_TYPES.map(type => [type.key, saved[type.key] !== false])) : all
  } catch {
    return all
  }
}

export function saveTypes(types) {
  try {
    localStorage.setItem(TYPES_KEY, JSON.stringify(types))
  } catch {
    // The types are only remembered for next time.
  }
}

/**
 * The filters of the month on screen. `types` is remembered between sessions; the rest is cleared when the month changes.
 * `categories` are ids; `min` and `max` are pesos (`null` is the end of the range).
 */
export function emptyFilters(types = loadTypes()) {
  return { text: "", types, categories: [], min: null, max: null }
}

/** How many of the filters of the panel are on (the text has its own field). */
export function activeFilterCount(filters) {
  return (Object.values(filters.types).some(on => !on) ? 1 : 0)
    + (filters.categories.length > 0 ? 1 : 0)
    + (filters.min !== null || filters.max !== null ? 1 : 0)
}

export function hasFilters(filters) {
  return filters.text.trim() !== "" || activeFilterCount(filters) > 0
}

/** What a row of an expense or an instalment weighs in pesos (the monthly share of an instalment); `null` when its currency has no rate. */
function pesos(item, group, source, rates) {
  const amount = group === "instalments" ? monthlyShare(item) : item.amount
  const rate = (source.currency ?? "MXN") === "MXN" ? 1 : rates[source.currency]

  return rate ? amount * rate : null
}

const AMOUNT_GROUPS = ["expenses", "recurring", "instalments"]

/** The groups of rows of a source, in the order of the table. */
const GROUPS = ["expenses", "recurring", "instalments", "transfers", "incomes"]

function every(source, group, items, filters, context, needles) {
  if (!filters.types[group]) {
    return []
  }

  const chosen = new Set(filters.categories)
  const byAmount = AMOUNT_GROUPS.includes(group)

  return items.filter(item => {
    const category = context.categories.get(item.category_id)

    // Incomes and transfers have no category: choosing one leaves them out.
    if (chosen.size > 0 && (!byAmount || !chosen.has(item.category_id))) {
      return false
    }

    if (byAmount && (filters.min !== null || filters.max !== null)) {
      const value = pesos(item, group, source, context.rates)

      // Without a rate there is nothing to compare with, so it stays.
      if (value !== null && ((filters.min !== null && value < filters.min) || (filters.max !== null && value > filters.max))) {
        return false
      }
    }

    if (needles.length > 0) {
      const amount = group === "transfers" ? item.signed_amount : item.amount
      const haystack = normalizeText([item.description, category?.name, category?.alias, source.name, item.counterpart_name, amount, Number(amount).toFixed(2)].join(" "))

      return needles.every(needle => haystack.includes(needle))
    }

    return true
  })
}

/**
 * The sources with only the rows that pass the filters (`state.sources` stays whole: the forms need every source). A source left with
 * nothing still comes back, empty, and `visibleSources` leaves it out of the table. The text matches every word in the description, the
 * category (name or alias), the source, the other account of a transfer and the amount, without caring for case or accents.
 */
export function filterSources(sources, filters, { categories = [], rates = {} } = {}) {
  if (!filters || !hasFilters(filters)) {
    return sources
  }

  const context = { categories: new Map(categories.map(category => [category.id, category])), rates }
  const needles = normalizeText(filters.text).split(/\s+/).filter(Boolean)

  return sources.map(source => ({
    ...source,
    expenses: every(source, "expenses", source.expenses ?? [], filters, context, needles),
    recurring: every(source, "recurring", source.recurring ?? [], filters, context, needles),
    instalments: every(source, "instalments", source.instalments ?? [], filters, context, needles),
    incomes: every(source, "incomes", source.incomes ?? [], filters, context, needles),
    transfers: source.transfers ? every(source, "transfers", source.transfers, filters, context, needles) : source.transfers,
  }))
}

/** The smallest and the largest amount in pesos of the month's expenses, recurring ones and instalments (the hints of the amount fields). */
export function filterBounds(sources, rates = {}) {
  let min = null
  let max = null

  for (const source of sources) {
    for (const group of GROUPS) {
      for (const item of source[group] ?? []) {
        if (AMOUNT_GROUPS.includes(group)) {
          const value = pesos(item, group, source, rates)

          if (value !== null) {
            min = min === null ? value : Math.min(min, value)
            max = max === null ? value : Math.max(max, value)
          }
        }
      }
    }
  }

  return { min: min === null ? null : Math.floor(min), max: max === null ? null : Math.ceil(max) }
}

function sourcesWithRows(sources) {
  return sources.filter(source => GROUPS.some(group => (source[group] ?? []).length > 0))
}

/** How many records and sources are left of the month's (a transfer is on two sources but is one record). */
export function filterCounts(all, shown) {
  const ids = sources => {
    const set = new Set()

    for (const source of sources) {
      for (const group of GROUPS) {
        for (const item of source[group] ?? []) {
          set.add(`${group === "instalments" || group === "recurring" ? "expenses" : group}-${item.id}`)
        }
      }
    }

    return set.size
  }

  return { records: ids(shown), totalRecords: ids(all), sources: sourcesWithRows(shown).length, totalSources: sourcesWithRows(all).length }
}
