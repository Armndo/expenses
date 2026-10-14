import { api_url, env_name } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { defaultTransferFrom, incomeSources, numberFormat, rateFormat, standardDate } from "@/utils/functions"
import { OverviewModal, ExpensesModal, ExpensesTable, IncomesModal, MonthPicker, RatesModal, SettingsModal, TransfersModal } from "@/components"
import "./MainView.css"
import { ChevronLeft, ChevronRight, Logout } from "@mui/icons-material"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Tooltip, Typography } from "@mui/material"

function money(value) {
  return numberFormat(value, 2, "$")
}

/** The month totals under the title, from `summary` (the API does the math). */
const SUMMARY_CHIPS = [
  { key: "spent", title: "Spent", sx: { background: "#c0c0c0" } },
  { key: "cash", title: "Debit", sx: { background: "#c8e6c9" } },
  { key: "debt", title: "Debt", sx: { background: "#ffcdd2" } },
  { key: "pending_instalments", title: "Pending instalments", sx: { background: "#bdbaff" } },
  { key: "total_money", title: "Balance", sx: { background: "#bbdefb" } },
]

/** The monthly budget chip: what is left of it (the carry included), negative (and red) when it was exceeded. */
function budgetChip(left) {
  return { label: money(left), background: left < 0 ? "#ef9a9a" : "#a5d6a7" }
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
    byAmount: localStorage.getItem("byAmount") === "true",
    overviewPie: localStorage.getItem("overviewPie") === "true",
    expense: null,
    incomeModal: false,
    income: null,
    transferModal: false,
    transfer: null,
    simple: localStorage.getItem("simple") === "true",
    date: localStorage.getItem("date"),
    sources: [],
    summary: null,
    rates: {},
    rateModal: false,
    rate: null,
    settingsModal: false,
    settings: null,
    lastSource: +localStorage.getItem("lastSource"),
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
      sources: res.data.expenses,
      categories: res.data.categories,
      summary: res.data.summary ?? null,
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
    setState(prev => ({
      ...prev,
      modal: true,
      expense: {
        date: standardDate(),
        amount: null,
        description: null,
        instalments: null,
        next: false,
        source_id: state.sources.length === 1 ? state.sources[0].id : state.lastSource,
        ...expense,
      },
    }))
  }

  function openIncomeModal(income = {}) {
    // An income goes to a debit account: the only one, or the last source used if it is one.
    const accounts = incomeSources(state.sources, null)

    setState(prev => ({
      ...prev,
      incomeModal: true,
      income: {
        date: standardDate(),
        amount: null,
        description: null,
        skip_budget: false,
        source_id: accounts.length === 1 ? accounts[0].id : (accounts.some(source => source.id === state.lastSource) ? state.lastSource : null),
        ...income,
      },
    }))
  }

  function openTransferModal(transfer = {}) {
    setState(prev => ({
      ...prev,
      transferModal: true,
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

  useEffect(() => {
    if (localStorage.getItem("token") === null) {
      navigate("/login")
      return
    }

    load()
  }, [])

  // Currencies other than pesos used by a source: each gets a chip with its exchange rate.
  const foreignCurrencies = [...new Set(state.sources.map(source => source.currency).filter(currency => currency && currency !== "MXN"))]

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
      <SettingsModal
        state={state}
        setState={setState}
      />
      <OverviewModal
        state={state}
        setState={setState}
      />
      <Card className="expenses-card" sx={{ margin: "1rem", maxHeight: "calc(100vh - 2rem)", width: "calc(100vw - 2rem)", borderRadius: "1rem", zIndex: 1 }} elevation={5} >
        <CardHeader
          title={<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", gap: { xs: ".25rem", sm: ".5rem" } }}>
            <Button size="small" color="secondary" variant="contained" aria-label="Previous month" sx={{ minWidth: 0, px: 1, height: 30 }} onClick={() => changeDate()} disabled={state.editing}><ChevronLeft fontSize="small" /></Button>
            <MonthPicker {...shownMonth()} onSelect={selectMonth} disabled={state.editing} />
            <Button size="small" color="secondary" variant="contained" aria-label="Next month" sx={{ minWidth: 0, px: 1, height: 30 }} onClick={() => changeDate(true)} disabled={state.editing}><ChevronRight fontSize="small" /></Button>
            {env_name && <Chip size="small" label={env_name} sx={{ background: "#c62828", color: "#fff", fontWeight: 500 }} />}
            <Button size="small" color="error" variant="contained" aria-label="Logout" sx={{ minWidth: 0, px: { xs: 1, sm: 1.5 }, height: 30 }} onClick={logout}>
              <Logout fontSize="small" sx={{ display: { xs: "block", sm: "none" } }} />
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Logout</Box>
            </Button>
          </Box>}
          subheader={<Box className="summary-chips" sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem", mt: ".5rem" }}>
            {/* The API sends null when there is no value (before the balance start month, or with a missing
                exchange rate): that chip is left out instead of showing a dash. */}
            {SUMMARY_CHIPS.filter(chip => state.summary?.[chip.key] != null && (chip.key !== "pending_instalments" || Math.abs(state.summary[chip.key]) >= 0.005)).map(chip => <Tooltip key={chip.key} title={chip.title}>
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
          <Button size="small" color="success" variant="contained" onClick={() => openModal()}>Expense</Button>
          <Button size="small" color="success" variant="outlined" onClick={() => openIncomeModal()}>Income</Button>
          <Button size="small" color="primary" variant="outlined" onClick={() => openTransferModal()}>Transfer</Button>
          <Button size="small" color="primary" variant="contained" onClick={openOverview}>Overview</Button>
          <Button size="small" color="secondary" variant="outlined" onClick={openSettingsModal} disabled={state.editing}>Settings</Button>
          <Button size="small" color="info" variant={!state.simple ? "outlined" : "contained"} onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"}</Button>
        </CardActions>
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