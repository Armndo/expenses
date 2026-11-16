import { lastMonthOwed } from "./lastMonthPaid"
import { monthlyShare } from "./monthlyShare"
import { isCard } from "./sourceKind"

/** The position of a month key (`YYYY-MM`) on a line of months, to count and compare them. */
function monthIndex(key) {
  const [year, month] = key.split("-").map(Number)

  return year * 12 + month - 1
}

function previousKey(key) {
  const index = monthIndex(key) - 1

  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

/** Rounded to cents, and never `-0` (an expense times 0 periods), so a change of nothing reads as nothing. */
function cents(value) {
  return Math.round(value * 100) / 100 + 0
}

const NO_EFFECT = { balance: 0, previous: 0, moved: 0 }

/**
 * How many of the billing periods of a record count up to the month on screen: from `period` to `last` (an instalment; a regular
 * record has just the one) but never past `shown`, since a source's position adds the months up to the one on screen. 0 when it
 * starts after `shown`. All are `YYYY-MM`. A recurring expense (`every` months, 1 by default for the rest) has a charge in `period` and
 * in every period `every` months after it, up to `last` (the period of its last charge) or, while it goes on, up to `shown`.
 */
export function periodsUpTo(period, last, shown, every = null) {
  if (!period) {
    return 0
  }

  if (every) {
    const end = Math.min(last ? monthIndex(last) : Infinity, monthIndex(shown))

    return Math.max(0, Math.floor((end - monthIndex(period)) / every) + 1)
  }

  const end = Math.min(monthIndex(last ?? period), monthIndex(shown))

  return Math.max(0, end - monthIndex(period) + 1)
}

/**
 * Whether a record has a charge in the month `month` (`YYYY-MM`): a regular record in its period, an instalment in every period from the first
 * to the last, a recurring one (`every` months) in its first period and every `every` months after it until `last`.
 */
export function chargesIn(period, last, month, every = null) {
  return periodsUpTo(period, last, month, every) - periodsUpTo(period, last, previousKey(month), every) > 0
}

/**
 * What a record does to a source as of the month on screen, as `{ balance, previous, moved }`: the change of `balance`, of
 * `previous_balance` (the position at the close of the month before) and of what moved in the month itself (the payments of
 * `lastMonthOwed`). `amount` is signed (an expense is negative, an income positive, a transfer negative where it leaves and positive
 * where it arrives).
 *
 * - A transfer counts by the calendar month of its date (`period` is that month): in the month on screen it moves the balance and
 *   the month's payments, in an earlier one the balance and the previous balance, and a later one changes nothing.
 * - An expense or an income counts per billing period: `period` and `last` come from `GET /period`, an instalment adds its
 *   `amount` (the monthly share) for each period up to the month on screen, and a recurring expense (`every` months) its amount for each
 *   of its charges up to it.
 */
export function recordEffect({ kind, amount, period, last, every = null }, shown) {
  if (!period || !Number.isFinite(amount) || amount === 0) {
    return NO_EFFECT
  }

  if (kind === "transfer") {
    const month = monthIndex(period)
    const now = monthIndex(shown)

    if (month > now) {
      return NO_EFFECT
    }

    return { balance: amount, previous: month < now ? amount : 0, moved: month === now ? amount : 0 }
  }

  return {
    balance: cents(amount * periodsUpTo(period, last, shown, every)),
    previous: cents(amount * periodsUpTo(period, last, previousKey(shown), every)),
    moved: 0,
  }
}

function add(a, b) {
  return { balance: a.balance + b.balance, previous: a.previous + b.previous, moved: a.moved + b.moved }
}

/**
 * How a source changes with some effects: `before` and `after` are its balance, or what it owes (`Owed`) when it is a card, in its own
 * currency; `lastOwed` (cards only, when the API sends `previous_balance`) is what it still owes from earlier periods before and
 * after. `null` before the balance start, where a source has no balance.
 */
export function previewSource(source, effects) {
  if (source.balance == null) {
    return null
  }

  const total = effects.reduce(add, NO_EFFECT)
  const after = cents(source.balance + total.balance)
  const card = isCard(source)
  const preview = { id: source.id, name: source.name, currency: source.currency, card, before: card ? -source.balance : source.balance, after: card ? -after : after, change: cents(total.balance) }
  const owed = lastMonthOwed(source)

  if (card && owed !== null) {
    const moved = (source.transfers ?? []).reduce((sum, transfer) => sum + transfer.signed_amount, 0)

    preview.lastOwed = { before: owed, after: Math.max(0, -((source.previous_balance ?? 0) + total.previous + moved + total.moved)) }
  }

  return preview
}

/**
 * The budget left of the month on screen (`summary.budget_left`, in pesos) before and after a record, or `null` when there is no
 * budget, the record does not fall in the month on screen (an earlier month would change the carry, which depends on the budget
 * start) or its currency has no rate. `delta` is the signed amount in the source's currency (an expense is negative, an income that
 * is not `skip_budget` positive).
 */
export function previewBudget(summary, rates, currency, delta, period, shown) {
  const left = summary?.budget_left

  if (left == null || period !== shown || !Number.isFinite(delta) || delta === 0) {
    return null
  }

  const rate = currency === "MXN" ? 1 : rates?.[currency]

  if (!rate) {
    return null
  }

  return { before: left, after: cents(left + delta * rate) }
}

/** The signed amount a source gets from an expense, per period: what an instalment bills each month, negative. */
export function expenseDelta(expense) {
  const amount = +expense.amount

  return Number.isFinite(amount) && amount !== 0 ? -monthlyShare({ amount, instalments: expense.instalments ? +expense.instalments : null }) : 0
}

/** The text of the billing months of a record, `December 2026` or, for an instalment, the first and the last: `November 2026 to April 2027`. */
export function periodText(period, last, labels) {
  if (!period) {
    return null
  }

  const label = key => labels[+key.split("-")[1] - 1] + " " + key.split("-")[0]

  return last && last !== period ? `${label(period)} to ${label(last)}` : label(period)
}
