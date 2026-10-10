/**
 * Whether a card carries no debt from earlier periods: what it owed at the close of the previous month, less the
 * transfers of this month (its payments), is 0 or less. A card in the balance start month has no previous
 * balance (null) and counts as paid. `true` paid, `false` not paid, `null` when it does not apply: not a card, a
 * month without balance (before the start) or an API that does not send `previous_balance`.
 */
export function lastMonthPaid(source) {
  if (source.kind !== "card" || source.balance == null || source.previous_balance === undefined) {
    return null
  }

  if (source.previous_balance === null) {
    return true
  }

  const moved = (source.transfers ?? []).reduce((total, transfer) => total + transfer.signed_amount, 0)

  return -(source.previous_balance + moved) <= 0.005
}
