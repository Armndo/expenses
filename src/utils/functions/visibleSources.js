/** Sources with something to show in the table: incomes, transfers, expenses or instalments. */
export function visibleSources(state) {
  return state.sources.filter(source => source.incomes.length > 0 || (source.transfers?.length ?? 0) > 0 || source.expenses.length > 0 || source.instalments.length > 0)
}
