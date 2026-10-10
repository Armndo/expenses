/**
 * What an expense bills in a month: its amount, or its monthly share when it has instalments, in cents
 * like the bank bills it, halves away from zero. It works on whole cents because dividing floats gives
 * results like 1200.4649999 for an exact 1200.465, and the API (sums and balances) must round the same way.
 */
export function monthlyShare(expense) {
  if (!expense.instalments) {
    return expense.amount
  }

  const cents = Math.round(expense.amount * 100)
  const share = Math.round(Math.abs(cents) / expense.instalments)

  return (cents < 0 ? -share : share) / 100
}
