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

/** `YYYY-MM-DD` of a date or a datetime. */
function day(value) {
  return `${value ?? ""}`.slice(0, 10)
}

/**
 * Whether a row of a rule is a charge after its first one: only then is there something before it to keep, so "this and the following"
 * means something different from "all the charges" (on the first one they are the same and the form does not ask). `occurrence_date` is
 * the date of the charge of the row and `date` the one of the rule.
 */
export function canCut(expense) {
  return isRecurring(expense ?? {}) && !!expense.occurrence_date && day(expense.occurrence_date) > day(expense.date)
}

/**
 * What an edit of the form applies to: `following` (the charge of the row and the ones after it: the rule ends the day before and a new
 * one starts there) or `all` (the whole rule, the past ones too). A new expense, the first charge and an expense that stops being a
 * repetition in the form are always `all`; on any other charge it is `following` unless the form says otherwise.
 */
export function scopeOf(expense) {
  if (!expense?.id || !canCut(expense) || billingOf(expense) !== "repeats") {
    return "all"
  }

  return expense.scope === "all" ? "all" : "following"
}

/** The date a rule of the form starts on: the charge that is cut for "this and the following", the date of the rule for the rest. */
export function startOf(expense) {
  return scopeOf(expense) === "following" ? day(expense.occurrence_date) : expense?.date
}

/** The query of the request that saves the form: the scope and, to cut, the charge. Nothing for a new expense or one that is not a row of a rule. */
export function scopeQuery(expense) {
  if (!expense?.id || !expense.occurrence_date) {
    return ""
  }

  return scopeOf(expense) === "following" ? `?scope=following&occurrence_date=${day(expense.occurrence_date)}` : "?scope=all"
}

/** The query of the request that deletes a row of a rule: `following` ends the rule the day before its charge, `all` deletes it with every charge. */
export function deleteQuery(expense, scope) {
  return scope === "following" && canCut(expense) ? `?scope=following&occurrence_date=${day(expense.occurrence_date)}` : "?scope=all"
}

/**
 * The record of the form and the one it was, as the preview of the balance has to see them: for "this and the following" both start on the
 * charge that is cut (the charges before it do not change), so the preview takes the old rule's charges from there away and adds the new one's.
 */
export function previewRecords(record, original) {
  if (!record || scopeOf(record) !== "following") {
    return { record, original }
  }

  const from = day(record.occurrence_date)

  return { record: { ...record, date: from }, original: original ? { ...original, date: from } : original }
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

    if (expense.ends_on && startOf(expense) && expense.ends_on < startOf(expense)) {
      return scopeOf(expense) === "following" ? "'Until' cannot be before this charge." : "'Until' cannot be before the first charge."
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
  delete rest.scope

  // To cut, the new rule starts on the charge that is cut: the date of the rule is not sent (the API would not read it).
  if (scopeOf(expense) === "following") {
    delete rest.date
  }

  return {
    ...rest,
    amount: +expense.amount,
    instalments: billing === "instalments" ? +expense.instalments : null,
    recurs_every: billing === "repeats" ? +expense.recurs_every : null,
    ends_on: billing === "repeats" && expense.ends_on ? expense.ends_on : null,
  }
}
