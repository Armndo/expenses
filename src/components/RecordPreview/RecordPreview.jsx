/* eslint-disable react/prop-types -- the project has no PropTypes; `state` is the one big object of MainView */
import { api_url } from "@/env"
import { currencySymbol, expenseDelta, numberFormat, periodText, previewBudget, previewSource, recordEffect } from "@/utils/functions"
import { Box, Typography } from "@mui/material"
import axios from "axios"
import { useEffect, useState } from "react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const RED = "#c62828"
const GREEN = "#2e7d32"

// What `GET /period` answered in this session, by what was asked, so a form that is edited does not ask twice.
const answers = new Map()

/**
 * The billing month of an expense or an income (`{ period, last }`) from `GET /period`, asked a moment after the last change. It is
 * only informative: with no network or any error it stays `null` and the form works the same, so nothing depends on it.
 */
function usePeriod(record) {
  const valid = record && record.source_id && /^\d{4}-\d{2}-\d{2}/.test(record.date ?? "")
  const instalments = record?.instalments && +record.instalments >= 2 ? +record.instalments : null
  const key = valid ? `${record.source_id}|${record.date.slice(0, 10)}|${record.next ? 1 : 0}|${instalments ?? ""}` : null
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (key === null) {
      setInfo(null)
      return
    }

    if (answers.has(key)) {
      setInfo(answers.get(key))
      return
    }

    let current = true
    const timer = setTimeout(() => {
      axios.get(`${api_url}/period`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { source_id: record.source_id, date: record.date.slice(0, 10), next: !!record.next, ...(instalments ? { instalments } : {}) },
      })
      .then(res => {
        const answer = { period: res.data.period, last: res.data.last ?? null }

        answers.set(key, answer)

        if (current) {
          setInfo(answer)
        }
      })
      .catch(() => current && setInfo(null))
    }, 350)

    setInfo(null)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- `key` is everything that is asked

  return info
}

function money(value, currency) {
  return numberFormat(value, 2, currencySymbol(currency))
}

function Line({ children, color }) {
  return <Typography component="div" variant="body2" sx={{ color: color ?? "text.secondary", fontSize: ".8125rem" }}>{children}</Typography>
}

/**
 * One source: its balance, or what it owes when it is a card, before and after, and what is left of the debt from earlier periods. The
 * name goes first only when more than one source is shown (`named`; with just one it is the one chosen in the form), and the billing
 * month closes the first line (`billsIn`).
 */
function SourceLines({ preview, named, billsIn }) {
  const label = preview.card ? "owed" : "balance"
  const bad = !preview.card && preview.after < 0
  const settled = preview.card && preview.after <= 0.005
  const text = (words) => named ? `${preview.name} ${words}` : `${words[0].toUpperCase()}${words.slice(1)}`

  return <>
    {Math.abs(preview.change) >= 0.005 && <Line color={bad ? RED : settled ? GREEN : undefined}>
      {text(label)} {money(preview.before, preview.currency)} → <strong>{money(preview.after, preview.currency)}</strong>{billsIn && <>, bills in <strong>{billsIn}</strong></>}
    </Line>}
    {preview.lastOwed && Math.abs(preview.lastOwed.before - preview.lastOwed.after) >= 0.005 && <Line color={preview.lastOwed.after <= 0.005 ? GREEN : undefined}>
      {text("last month owed")} {money(preview.lastOwed.before, preview.currency)} → <strong>{money(preview.lastOwed.after, preview.currency)}</strong>{Math.abs(preview.change) < 0.005 && billsIn && <>, bills in <strong>{billsIn}</strong></>}
    </Line>}
  </>
}

/** The effect of an edit on every source it touches: the new record's effect and the old one's, reversed. */
function effectsBySource(entries, shown) {
  const bySource = new Map()

  for (const entry of entries) {
    const list = bySource.get(entry.sourceId) ?? []

    list.push(recordEffect(entry, shown))
    bySource.set(entry.sourceId, list)
  }

  return bySource
}

/**
 * Under the amount of a form of an expense, an income or a transfer: the month it is billed in (expenses and incomes) and how the
 * balance of the sources it touches would change with the amount that is written, with what is left of the debt from earlier
 * periods of a card and the month's budget. The sums use what `GET /data` already sent (`balance` and `previous_balance` as of the
 * month on screen); only the billing month of an expense or an income comes from the API.
 */
export function RecordPreview({ state, kind }) {
  const record = state[kind]
  const original = state[`${kind}Original`] ?? null
  const isTransfer = kind === "transfer"
  const info = usePeriod(isTransfer ? null : record)
  const oldInfo = usePeriod(isTransfer || !original ? null : original)
  const now = new Date()
  const shown = state.date ? state.date.slice(0, 7) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const sources = state.sources
  const find = id => sources.find(source => source.id === id)
  const amount = +record?.amount
  const hasAmount = Number.isFinite(amount) && amount !== 0 && record?.amount !== "" && record?.amount !== null

  const entries = []
  let ready = hasAmount
  let applies = null
  let budget = null

  if (isTransfer) {
    const month = `${record.date ?? ""}`.slice(0, 7)
    const from = find(record.from_source_id)
    const to = find(record.to_source_id)
    const received = from && to && from.currency !== to.currency ? +record.received_amount : amount

    if (from && /^\d{4}-\d{2}$/.test(month) && amount > 0) {
      entries.push({ sourceId: from.id, kind: "transfer", amount: -amount, period: month })
    }

    if (to && /^\d{4}-\d{2}$/.test(month) && Number.isFinite(received) && received > 0) {
      entries.push({ sourceId: to.id, kind: "transfer", amount: received, period: month })
    }

    if (original) {
      const oldMonth = `${original.date ?? ""}`.slice(0, 7)
      const oldFrom = find(original.from_source_id)
      const oldTo = find(original.to_source_id)
      const oldReceived = oldFrom && oldTo && oldFrom.currency !== oldTo.currency ? +original.received_amount : +original.amount

      if (oldFrom) entries.push({ sourceId: oldFrom.id, kind: "transfer", amount: +original.amount, period: oldMonth })
      if (oldTo && Number.isFinite(oldReceived)) entries.push({ sourceId: oldTo.id, kind: "transfer", amount: -oldReceived, period: oldMonth })
    }

    if (month > shown) {
      applies = month
    }
  } else {
    const source = find(record?.source_id)
    const delta = kind === "expense" ? expenseDelta(record ?? {}) : amount

    ready = hasAmount && !!source && !!info && (!original || !!oldInfo)

    if (ready) {
      entries.push({ sourceId: source.id, kind: "periodic", amount: delta, period: info.period, last: info.last })

      if (original) {
        const oldDelta = kind === "expense" ? expenseDelta(original) : +original.amount

        entries.push({ sourceId: original.source_id, kind: "periodic", amount: -oldDelta, period: oldInfo.period, last: oldInfo.last })
      }

      if (info.period > shown) {
        applies = info.period
      }

      // The budget of the month on screen: only what falls in it, and only when the source did not change.
      if (!original || original.source_id === record.source_id) {
        const budgetOf = (value, skip, at) => (at === shown && !skip ? value : 0)
        const next = budgetOf(delta, kind === "income" && record.skip_budget, info.period)
        const previous = original ? budgetOf(kind === "expense" ? expenseDelta(original) : +original.amount, kind === "income" && original.skip_budget, oldInfo.period) : 0

        budget = previewBudget(state.summary, state.rates, source.currency, next - previous, shown, shown)
      }
    }
  }

  const previews = ready || isTransfer
    ? [...effectsBySource(entries, shown)].map(([id, effects]) => previewSource(find(id), effects)).filter(Boolean)
    : []
  // A source that changed by nothing is not shown (an edit that keeps the amount, or a record that falls after the month on screen).
  const shownPreviews = hasAmount ? previews.filter(preview => Math.abs(preview.change) >= 0.005 || (preview.lastOwed && Math.abs(preview.lastOwed.before - preview.lastOwed.after) >= 0.005)) : []
  const billsIn = !isTransfer && info ? periodText(info.period, info.last, MONTHS) : null

  if (!billsIn && shownPreviews.length === 0 && !budget && !applies) {
    return null
  }

  const named = isTransfer || shownPreviews.length > 1
  const doesNotChange = applies ? ", it does not change this month" : ""

  return <Box sx={{ mb: "1rem" }}>
    {/* The billing month closes the first line of numbers; with no numbers (no amount yet, or it falls after the month on screen) it is a line of its own. */}
    {billsIn && shownPreviews.length === 0 && <Line>Bills in <strong>{billsIn}</strong>{doesNotChange}</Line>}
    {!billsIn && hasAmount && applies && <Line>Applies from <strong>{periodText(applies, null, MONTHS)}</strong>{doesNotChange}</Line>}
    {shownPreviews.map((preview, index) => <SourceLines key={preview.id} preview={preview} named={named} billsIn={index === 0 ? billsIn : null} />)}
    {budget && <Line color={budget.after < 0 ? RED : undefined}>Budget {money(budget.before, "MXN")} → <strong>{money(budget.after, "MXN")}</strong></Line>}
  </Box>
}
