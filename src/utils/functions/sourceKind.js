/** A source with a cutoff (even 0) is a credit card; without one it is a debit account (the API's `kind`). */
export function isCard(source) {
  return source.kind ? source.kind === "card" : source.cutoff != null
}

export function kindLabel(source) {
  return isCard(source) ? "Credit" : "Debit"
}

/** The text of a source in a dropdown: its name and whether it is credit or debit. */
export function sourceOptionLabel(source) {
  return `${source.name} (${kindLabel(source)})`
}

/**
 * What a picker offers: the enabled ones, plus the one that is selected now even when it is disabled, so an old movement
 * that uses it can still be shown and edited. A disabled source or category takes no new movements.
 */
export function activeSources(sources, currentId) {
  return sources.filter(source => !source.disabled || source.id === currentId)
}

export function activeCategories(categories, currentId) {
  return categories.filter(category => !category.disabled || category.id === currentId)
}

/**
 * The sources an income can go to: enabled debit accounts only. An income that already exists keeps its current source in
 * the list even when it is a card or it is disabled, so it can still be shown and edited.
 */
export function incomeSources(sources, currentId) {
  return activeSources(sources, currentId).filter(source => !isCard(source) || source.id === currentId)
}

/**
 * The source a new transfer starts from: the last one chosen as the origin, if it is still an enabled debit account
 * (the only kind the origin can be), or null.
 */
export function defaultTransferFrom(sources, lastId) {
  return sources.find(source => !isCard(source) && !source.disabled && source.id === lastId)?.id ?? null
}
