import { api_url, env_name } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CHIP_COLORS, DEFAULT_SORT, EVERY_OPTIONS, billingOf, chargesIn, emptyFilters, SORT_OPTIONS, activeSources, defaultTransferFrom, incomeSources, numberFormat, rateFormat, sortSources, standardDate, withRecurring } from "@/utils/functions"
import { OverviewModal, ExpensesModal, ExpensesTable, IncomesModal, ManageModal, MonthPicker, RatesModal, SearchModal, SettingsModal, TransfersModal, ViewBar } from "@/components"
import { TYPE_COLORS } from "@/components/ViewBar/TypeChips"
import "./MainView.css"
import { ChevronLeft, ChevronRight, Logout } from "@mui/icons-material"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Tooltip, Typography } from "@mui/material"

/**
 * The buttons that add a record are the same outline for the three, with a dot of the colour of its type (the `In full` outline, the green of the
 * incomes, the amber of the transfers); under the pointer the button fills with that colour (the grey of `Spent` for the expenses, which have no fill).
 */
const HOVER_COLORS = { expenses: CHIP_COLORS.spent, incomes: TYPE_COLORS.incomes, transfers: TYPE_COLORS.transfers }

function typeButton(type) {
  return {
    color: "text.primary",
    borderColor: "#c0c0c0",
    "&:hover": { borderColor: type === "expenses" ? "#9e9e9e" : HOVER_COLORS[type], background: HOVER_COLORS[type], "& .type-dot": { borderColor: "#fff" } },
  }
}

// The dot is filled in the colour of its type (the grey of `Spent` for the expenses, whose chip has no fill).
const DOT_COLORS = { expenses: CHIP_COLORS.spent, incomes: TYPE_COLORS.incomes, transfers: TYPE_COLORS.transfers }

function TypeDot({ type }) {
  return <Box component="span" className="type-dot" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: DOT_COLORS[type], border: `1px solid ${DOT_COLORS[type]}` }} />
}

function money(value) {
  return numberFormat(value, 2, "$")
}

/** The month totals under the title, from `summary` (the API does the math). */
const SUMMARY_CHIPS = [
  { key: "spent", title: "Spent", sx: { background: CHIP_COLORS.spent } },
  { key: "cash", title: "Debit", sx: { background: CHIP_COLORS.debit } },
  { key: "debt", title: "Debt", sx: { background: CHIP_COLORS.debt } },
  { key: "last_month_owed", title: "Last month owed", sx: { background: CHIP_COLORS.lastMonthOwed } },
  { key: "last_month_paid", title: "Last month paid", sx: { background: CHIP_COLORS.lastMonthPaid } },
  { key: "pending_instalments", title: "Pending instalments", sx: { background: CHIP_COLORS.instalments } },
  { key: "total_money", title: "Balance", sx: { background: CHIP_COLORS.balance } },
]

/** The monthly budget chip: what is left of it (the carry included), negative (and red) when it was exceeded. */
function budgetChip(left) {
  return { label: money(left), background: left < 0 ? CHIP_COLORS.budgetOver : CHIP_COLORS.budget }
}

/** What the previous months left over or owe (`budget_carry`): outlined in the colour of its sign, and left out at 0. */
function carryChip(carry) {
  return { label: money(carry), color: carry < 0 ? "#c62828" : "#2e7d32" }
}

export function MainView({ }) {
  const [state, setState] = useState({
    loading: true,
    editing: null,
    modal: false,
    overview: false,
    manageModal: false,
    byAmount: localStorage.getItem("byAmount") === "true",
    overviewPie: localStorage.getItem("overviewPie") === "true",
    sourcesByType: localStorage.getItem("sourcesByType") === "true",
    expense: null,
    incomeModal: false,
    income: null,
    transferModal: false,
    transfer: null,
    simple: localStorage.getItem("simple") === "true",
    date: localStorage.getItem("date"),
    sources: [],
    // What the API sent, in its order: `sources` is this with the rows of each group sorted by `sort`.
    rawSources: [],
    sort: SORT_OPTIONS.some(option => option.value === localStorage.getItem("sort")) ? localStorage.getItem("sort") : DEFAULT_SORT,
    // The search and the filters of the month on screen (`@/utils/functions/filters.js`); they are cleared when the month changes.
    filters: emptyFilters(),
    filtersMonth: null,
    // The search over all the months, and the record the page went to from it (`{ type, id }`, highlighted for a moment).
    searchModal: false,
    highlight: null,
    summary: null,
    range: null,
    rates: {},
    rateModal: false,
    rate: null,
    settingsModal: false,
    settings: null,
    lastSource: +localStorage.getItem("lastSource"),
    lastIncomeSource: +localStorage.getItem("lastIncomeSource"),
    lastTransferFrom: +localStorage.getItem("lastTransferFrom"),
    categories: [],
    lastCategory: +localStorage.getItem("lastCategory"),
  })

  const navigate = useNavigate()

  function load(date = null) {
    if (localStorage.getItem("date")) {
      date = localStorage.getItem("date")
    }

    setState(prev => ({ ...prev, loading: true }))

    axios.get(
      `${api_url}/data`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          date,
        }
      }
    )
    .then(res => setState(prev => ({
      ...prev,
      date,
      // The recurring expenses come in `expenses`: here they are a group of their own (`recurring`).
      rawSources: withRecurring(res.data.expenses),
      sources: sortSources(withRecurring(res.data.expenses), prev.sort, res.data.categories),
      categories: res.data.categories,
      filters: prev.filtersMonth === date ? prev.filters : emptyFilters(prev.filters.types),
      filtersMonth: date,
      summary: res.data.summary ?? null,
      range: res.data.range ?? null,
      rates: res.data.rates ?? {},
    })))
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false })))
  }

  /** Year and month (0 to 11) being shown: the saved date, or the current month. */
  function shownMonth() {
    if (!state.date) {
      const now = new Date()

      return { year: now.getFullYear(), month: now.getMonth() }
    }

    const [year, month] = state.date.split("-").map(Number)

    return { year, month: month - 1 }
  }

  /** The first and the last month the user can go to (`YYYY-MM`), or `null` until `GET /data` has sent the range. */
  function monthBounds() {
    return state.range ? { min: state.range.first.slice(0, 7), max: state.range.last.slice(0, 7) } : null
  }

  function selectMonth(year, month) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-02`

    localStorage.setItem("date", date)
    load(date)
  }

  function changeDate(next = false) {
    const date = state.date ? new Date(state.date) : new Date();

    if (state.date === null) {
      date.setMinutes(date.getMinutes() - (new Date()).getTimezoneOffset())
    }

    date.setDate(2)

    if (next) {
      date.setMonth(date.getMonth() + 1)
    } else {
      date.setMonth(date.getMonth() - 1)
    }

    localStorage.setItem("date", date.toISOString().split("T")[0])
    load(date.toISOString().split("T")[0])
  }

  /** Back to the current month, without the arrows or the calendar. */
  function goToday() {
    const now = new Date()

    selectMonth(now.getFullYear(), now.getMonth())
  }

  /** Goes to the month of a result of the search (an instalment, the one on screen when it falls in its range) and highlights the record. */
  function goToRecord(row) {
    const on = shownMonth()
    const shown = `${on.year}-${String(on.month + 1).padStart(2, "0")}`
    // An instalment, or a recurring expense, stays on the month on screen when it has a charge there.
    const inRange = (row.period_last || row.recurs_every) && shown >= row.period && (!row.period_last || shown <= row.period_last) && (!row.recurs_every || chargesIn(row.period, row.period_last, shown, row.recurs_every))
    const [year, month] = (inRange ? shown : row.period).split("-").map(Number)

    setState(prev => ({ ...prev, searchModal: false, highlight: { type: row.type, id: row.id } }))
    selectMonth(year, month - 1)
  }

  function changeSort(sort) {
    localStorage.setItem("sort", sort)
    setState(prev => ({ ...prev, sort, sources: sortSources(prev.rawSources, sort, prev.categories) }))
  }

  function logout() {
    axios.post(
      `${api_url}/logout`,
      null,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    )
    .catch(() => {})
    .finally(() => {
      localStorage.removeItem("token")
      navigate("/login")
    })
  }

  function openModal(expense = {}) {
    // A new expense goes to an enabled source: the only one, or the last one used if it is still enabled.
    const enabled = activeSources(state.sources, null)
    const defaultSource = enabled.length === 1 ? enabled[0].id : (enabled.some(source => source.id === state.lastSource) ? state.lastSource : null)

    setState(prev => ({
      ...prev,
      modal: true,
      // What it was before editing (null for a new one): the balance already counts it, so the preview subtracts it.
      expenseOriginal: expense.id ? { ...expense } : null,
      expense: {
        date: standardDate(),
        amount: null,
        description: null,
        instalments: null,
        recurs_every: null,
        ends_on: null,
        next: false,
        source_id: defaultSource,
        ...expense,
        // The form's own fields: how it bills, and whether "Every" is a number of its own (not one of the options).
        billing: billingOf(expense),
        custom_every: !!expense.recurs_every && !EVERY_OPTIONS.some(option => option.value === +expense.recurs_every),
      },
    }))
  }

  function openIncomeModal(income = {}) {
    // An income goes to a debit account: the only one, or the last source used if it is one.
    const accounts = incomeSources(state.sources, null)

    setState(prev => ({
      ...prev,
      incomeModal: true,
      incomeOriginal: income.id ? { ...income } : null,
      income: {
        date: standardDate(),
        amount: null,
        description: null,
        skip_budget: false,
        source_id: accounts.length === 1 ? accounts[0].id : (accounts.some(source => source.id === state.lastIncomeSource) ? state.lastIncomeSource : null),
        ...income,
      },
    }))
  }

  function openTransferModal(transfer = {}) {
    setState(prev => ({
      ...prev,
      transferModal: true,
      transferOriginal: transfer.id ? { ...transfer } : null,
      transfer: {
        date: standardDate(),
        amount: null,
        description: null,
        from_source_id: defaultTransferFrom(state.sources, state.lastTransferFrom),
        to_source_id: null,
        ...transfer,
      },
    }))
  }

  function openRateModal(currency) {
    setState(prev => ({
      ...prev,
      rateModal: true,
      rate: { currency, rate: prev.rates[currency] ?? null },
    }))
  }

  function openSettingsModal() {
    setState(prev => ({ ...prev, loading: true }))

    axios.get(
      `${api_url}/settings`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    )
    .then(res => setState(prev => ({
      ...prev,
      settingsModal: true,
      settings: {
        balance_start: res.data.balance_start.slice(0, 7),
        budget_start: res.data.budget_start?.slice(0, 7) ?? null,
        monthly_budget: res.data.monthly_budget,
      },
    })))
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false })))
  }

  function openOverview() {
    setState(prev => ({
      ...prev,
      overview: true,
    }))
  }

  function changeMode() {
    localStorage.setItem("simple", !state.simple)

    setState(prev => ({
      ...prev,
      simple: !prev.simple,
    }))
  }

  // The highlight of the record the search went to lasts a few seconds.
  useEffect(() => {
    if (!state.highlight) {
      return
    }

    const timer = setTimeout(() => setState(prev => ({ ...prev, highlight: null })), 6000)

    return () => clearTimeout(timer)
  }, [state.highlight])

  useEffect(() => {
    if (localStorage.getItem("token") === null) {
      navigate("/login")
      return
    }

    load()
  }, [])

  // Currencies other than pesos used by a source: each gets a chip with its exchange rate.
  const foreignCurrencies = [...new Set(state.sources.map(source => source.currency).filter(currency => currency && currency !== "MXN"))]

  // The arrows stop at the first and the last month with expenses (the last counts the instalments still to bill).
  const bounds = monthBounds()
  const shown = shownMonth()
  const shownKey = `${shown.year}-${String(shown.month + 1).padStart(2, "0")}`
  const atFirstMonth = bounds !== null && shownKey <= bounds.min
  const atLastMonth = bounds !== null && shownKey >= bounds.max
  const today = new Date()
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  return <>
    {state.loading && <div className="expenses-loading"><div><Typography variant="h6">Loading...</Typography></div></div>}
    <Box sx={{ width: "100vw", height: "fit-content" }}>
      <ExpensesModal
        state={state}
        setState={setState}
      />
      <IncomesModal
        state={state}
        setState={setState}
      />
      <TransfersModal
        state={state}
        setState={setState}
      />
      <RatesModal
        state={state}
        setState={setState}
      />
      <ManageModal
        state={state}
        setState={setState}
        reload={() => load()}
      />
      <SettingsModal
        state={state}
        setState={setState}
      />
      <OverviewModal
        state={state}
        setState={setState}
      />
      <SearchModal
        state={state}
        setState={setState}
        goToRecord={goToRecord}
      />
      <Card className="expenses-card" sx={{ margin: "1rem", maxHeight: "calc(100vh - 2rem)", width: "calc(100vw - 2rem)", borderRadius: "1rem", zIndex: 1 }} elevation={5} >
        <CardHeader
          title={<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", gap: { xs: ".25rem", sm: ".5rem" } }}>
            <Button size="small" color="secondary" variant="contained" aria-label="Previous month" sx={{ minWidth: 0, px: 1, height: 30 }} onClick={() => changeDate()} disabled={state.editing || atFirstMonth}><ChevronLeft fontSize="small" /></Button>
            <MonthPicker {...shownMonth()} min={monthBounds()?.min} max={monthBounds()?.max} onSelect={selectMonth} disabled={state.editing} />
            <Button size="small" color="secondary" variant="contained" aria-label="Next month" sx={{ minWidth: 0, px: 1, height: 30 }} onClick={() => changeDate(true)} disabled={state.editing || atLastMonth}><ChevronRight fontSize="small" /></Button>
            {shownKey !== currentKey && <Button size="small" color="secondary" variant="outlined" aria-label="Go to the current month" sx={{ minWidth: 0, px: 1.25, height: 30 }} onClick={goToday} disabled={state.editing}>Today</Button>}
            {env_name && <Chip size="small" label={env_name} sx={{ background: "#c62828", color: "#fff", fontWeight: 500 }} />}
            <Button size="small" color="error" variant="contained" aria-label="Logout" sx={{ minWidth: 0, px: { xs: 1, sm: 1.5 }, height: 30 }} onClick={logout}>
              <Logout fontSize="small" sx={{ display: { xs: "block", sm: "none" } }} />
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Logout</Box>
            </Button>
          </Box>}
          subheader={<Box className="summary-chips" sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem", mt: ".5rem" }}>
            {/* The API sends null when there is no value (before the balance start month, or with a missing
                exchange rate): that chip is left out instead of showing a dash. */}
            {SUMMARY_CHIPS.filter(chip => state.summary?.[chip.key] != null && (!["pending_instalments", "last_month_owed", "last_month_paid"].includes(chip.key) || Math.abs(state.summary[chip.key]) >= 0.005)).map(chip => <Tooltip key={chip.key} title={chip.title}>
              <Chip size="small" sx={chip.sx} label={money(state.summary[chip.key])} />
            </Tooltip>)}
            {state.summary?.budget_carry != null && Math.abs(state.summary.budget_carry) >= 0.005 && (({ label, color }) => <Tooltip title="Budget carried over from the previous months">
              <Chip size="small" variant="outlined" sx={{ color, borderColor: color }} label={label} />
            </Tooltip>)(carryChip(state.summary.budget_carry))}
            {state.summary?.budget_left != null && (({ label, background }) => <Tooltip title="Budget">
              <Chip size="small" sx={{ background }} label={label} />
            </Tooltip>)(budgetChip(state.summary.budget_left))}
            {foreignCurrencies.map(currency => <Tooltip key={currency} title={state.rates[currency] ? `Exchange rate ${currency}` : `Exchange rate ${currency} missing: set it to see the totals`}>
              <Chip
                size="small"
                sx={state.rates[currency] ? { background: "#9fa8da" } : undefined}
                color={state.rates[currency] ? "default" : "error"}
                disabled={state.editing}
                onClick={() => openRateModal(currency)}
                label={state.rates[currency] ? rateFormat(state.rates[currency]) : "?"}
              />
            </Tooltip>)}
          </Box>}
          subheaderTypographyProps={{ component: "div" }}
        />
        <CardActions disableSpacing className="main-actions" sx={{ p: "1rem", pt: 0, flexWrap: "wrap", gap: ".5rem" }}>
          <Button size="small" variant="outlined" sx={typeButton("expenses")} startIcon={<TypeDot type="expenses" />} onClick={() => openModal()}>Expense</Button>
          <Button size="small" variant="outlined" sx={typeButton("incomes")} startIcon={<TypeDot type="incomes" />} onClick={() => openIncomeModal()}>Income</Button>
          <Button size="small" variant="outlined" sx={typeButton("transfers")} startIcon={<TypeDot type="transfers" />} onClick={() => openTransferModal()}>Transfer</Button>
          <Button size="small" color="primary" variant="contained" onClick={openOverview}>Overview</Button>
          <Button size="small" color="secondary" variant="outlined" onClick={() => setState(prev => ({ ...prev, manageModal: true }))} disabled={state.editing}>Manage</Button>
          <Button size="small" color="secondary" variant="outlined" onClick={openSettingsModal} disabled={state.editing}>Settings</Button>
          <Button size="small" color="info" variant={!state.simple ? "outlined" : "contained"} onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"}</Button>
        </CardActions>
        <ViewBar state={state} setState={setState} changeSort={changeSort} />
        <CardContent sx={{ width: "calc(100% - 2rem)", p: 0, pl: "1rem", pb: 0, mb: "1rem", ":last-child": {mb: "1rem", pb: 0 } }}>
          <ExpensesTable
            state={state}
            setState={setState}
            openModal={openModal}
            openIncomeModal={openIncomeModal}
            openTransferModal={openTransferModal}
          />
        </CardContent>
      </Card>
    </Box>
  </>
}