import { filterSources } from "./filters"

let last = null

/**
 * Sources with something to show in the table: incomes, transfers, expenses or instalments, after the filters of the month
 * (`state.filters`, which leave a source with no matches empty, so it is hidden). The table and every row ask for it, so the
 * last answer is kept while nothing it depends on changes.
 */
export function visibleSources(state) {
  if (last && last.sources === state.sources && last.filters === state.filters && last.categories === state.categories && last.rates === state.rates) {
    return last.result
  }

  const result = filterSources(state.sources, state.filters, { categories: state.categories, rates: state.rates })
    .filter(source => source.incomes.length > 0 || (source.transfers?.length ?? 0) > 0 || source.expenses.length > 0 || source.instalments.length > 0)

  last = { sources: state.sources, filters: state.filters, categories: state.categories, rates: state.rates, result }

  return result
}
