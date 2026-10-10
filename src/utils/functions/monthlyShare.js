/**
 * What an expense bills in a month: its amount, or its monthly share when it has instalments, rounded to
 * cents like the bank bills it. The API (sums and balances) and the app round the same way.
 */
export function monthlyShare(expense) {
  if (!expense.instalments) {
    return expense.amount
  }

  return Math.round((expense.amount / expense.instalments + Number.EPSILON) * 100) / 100
}
