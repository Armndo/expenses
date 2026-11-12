/**
 * What a card still owes from earlier periods: what it owed at the close of the previous month, less the transfers of this
 * month (its payments), never below 0. A card in the balance start month has no previous balance (null) and owes nothing.
 * `null` when it does not apply: not a card, a month without balance (before the start) or an API that does not send
 * `previous_balance`.
 */
export function lastMonthOwed(source) {
  if (source.kind !== "card" || source.balance == null || source.previous_balance === undefined) {
    return null
  }

  if (source.previous_balance === null) {
    return 0
  }

  const moved = (source.transfers ?? []).reduce((total, transfer) => total + transfer.signed_amount, 0)

  return Math.max(0, -(source.previous_balance + moved))
}

/**
 * Whether a card carries no debt from earlier periods (`lastMonthOwed` is 0 to the cent). `true` paid, `false` not paid, `null`
 * when it does not apply.
 */
export function lastMonthPaid(source) {
  const owed = lastMonthOwed(source)

  return owed === null ? null : owed <= 0.005
}

/**
 * What a card owed at the close of the previous month, shown on the green chip once it is paid: `-previous_balance` when it was
 * in debt, and `null` when it owed nothing (or it does not apply), so the chip says only "Last month paid". It does not count the
 * extra of a payment that is bigger than the debt, which already goes to this month's charges.
 */
export function lastMonthCleared(source) {
  if (lastMonthPaid(source) !== true || source.previous_balance == null || source.previous_balance >= -0.005) {
    return null
  }

  return -source.previous_balance
}
