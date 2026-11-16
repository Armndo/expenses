/*
 * Recurring expenses (phase 3.10a): an expense with `recurs_every` is a rule that repeats every that many months until `ends_on`, one row
 * that comes in `expenses` of `GET /data` in every month with a charge (with `occurrence_date`, the date of that charge). The web puts them in
 * a group of their own, and its form chooses between one payment, instalments and a repetition.
 */

/** The fixed options of "Every" in the form (months), and what a custom number looks like. */
export const EVERY_OPTIONS = [
  { value: 1, label: "Month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "Year" },
]

/** `month`, `3 months`, `year`: how often a recurring expense repeats, as a sentence goes ("every month"). */
export function everyText(every) {
  return EVERY_OPTIONS.find(option => option.value === +every)?.label.toLowerCase() ?? `${every} months`
}

/** The groups of the table that hold the plain expenses of a source and its recurring ones: `GET /data` sends both in `expenses`. */
export function isRecurring(expense) {
  return expense.recurs_every !== null && expense.recurs_every !== undefined
}

/**
 * The sources with their recurring expenses apart: `recurring` (and `recurring_count`) has the rows with `recurs_every` and `expenses` the
 * rest, so every piece that works by group (the table, the chips, the filters, the order) sees one more group. An old API that does not send
 * `recurs_every` leaves everything in `expenses`.
 */
export function withRecurring(sources) {
  return sources.map(source => {
    const recurring = (source.expenses ?? []).filter(isRecurring)
    const expenses = (source.expenses ?? []).filter(expense => !isRecurring(expense))

    return { ...source, expenses, expenses_count: expenses.length, recurring, recurring_count: recurring.length }
  })
}

/** How an expense of the form is billed: `repeats`, `instalments` or `one` payment. */
export function billingOf(expense) {
  if (expense?.billing) {
    return expense.billing
  }

  if (isRecurring(expense ?? {})) {
    return "repeats"
  }

  return expense?.instalments !== null && expense?.instalments !== undefined ? "instalments" : "one"
}

/** What is wrong with the expense of the form, as the text to show, or `null` when it can be saved (the same rules as the API). */
export function expenseError(expense) {
  if (expense.amount === null || isNaN(expense.amount) || +expense.amount === 0) {
    return "Incorrect 'Amount' format."
  }

  const billing = billingOf(expense)

  if (billing === "instalments" && (expense.instalments === null || !Number.isInteger(+expense.instalments) || +expense.instalments < 2)) {
    return "Incorrect 'Instalments' format."
  }

  if (billing === "repeats") {
    if (expense.recurs_every === null || !Number.isInteger(+expense.recurs_every) || +expense.recurs_every < 1 || +expense.recurs_every > 60) {
      return "Incorrect 'Every' format."
    }

    if (expense.ends_on && expense.date && expense.ends_on < expense.date) {
      return "'Until' cannot be before the first charge."
    }
  }

  return null
}

/** What goes to the API: the form without its own fields (`billing`, `custom_every`), and only what its way of billing uses, so the others are cleared. */
export function expensePayload(expense) {
  const rest = { ...expense }
  const billing = billingOf(expense)

  delete rest.billing
  delete rest.custom_every

  return {
    ...rest,
    amount: +expense.amount,
    instalments: billing === "instalments" ? +expense.instalments : null,
    recurs_every: billing === "repeats" ? +expense.recurs_every : null,
    ends_on: billing === "repeats" && expense.ends_on ? expense.ends_on : null,
  }
}
