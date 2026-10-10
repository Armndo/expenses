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
 * The sources an income can go to: debit accounts only. An income that already exists keeps its current source in
 * the list even when it is a card, so it can still be shown and edited.
 */
export function incomeSources(sources, currentId) {
  return sources.filter(source => !isCard(source) || source.id === currentId)
}

/**
 * The source a new transfer starts from: the last one chosen as the origin, if it is still a debit account
 * (the only kind the origin can be), or null.
 */
export function defaultTransferFrom(sources, lastId) {
  return sources.find(source => !isCard(source) && source.id === lastId)?.id ?? null
}
