import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { numberFormat, standardDate } from "@/utils/functions"
import { OverviewModal, ExpensesModal, ExpensesTable, IncomesModal, MonthPicker, TransfersModal } from "@/components"
import "./MainView.css"
import { ChevronLeft, ChevronRight } from "@mui/icons-material"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material"

/** `-` when the API has no value (the balance does not exist before its start month). */
function money(value) {
  return value != null ? numberFormat(value, 2, "$") : "-"
}

export function MainView({ }) {
  const [state, setState] = useState({
    loading: true,
    editing: null,
    modal: false,
    overview: false,
    byAmount: localStorage.getItem("byAmount") === "true",
    expense: null,
    incomeModal: false,
    income: null,
    transferModal: false,
    transfer: null,
    simple: localStorage.getItem("simple") === "true",
    date: localStorage.getItem("date"),
    sources: [],
    summary: null,
    lastSource: +localStorage.getItem("lastSource"),
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
    setState(prev => ({
      ...prev,
      incomeModal: true,
      income: {
        date: standardDate(),
        amount: null,
        description: null,
        source_id: state.sources.length === 1 ? state.sources[0].id : state.lastSource,
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
        from_source_id: null,
        to_source_id: null,
        ...transfer,
      },
    }))
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
      <OverviewModal
        state={state}
        setState={setState}
      />
      <Card className="expenses-card" sx={{ margin: "1rem", maxHeight: "calc(100vh - 2rem)", width: "calc(100vw - 2rem)", borderRadius: "1rem", zIndex: 1 }} elevation={5} >
        <CardHeader
          title={<Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", gap: ".5rem" }}>
            <Button size="small" color="secondary" variant="contained" aria-label="Previous month" sx={{ minWidth: 0, px: 1 }} onClick={() => changeDate()} disabled={state.editing}><ChevronLeft fontSize="small" /></Button>
            <MonthPicker {...shownMonth()} onSelect={selectMonth} disabled={state.editing} />
            <Button size="small" color="secondary" variant="contained" aria-label="Next month" sx={{ minWidth: 0, px: 1 }} onClick={() => changeDate(true)} disabled={state.editing}><ChevronRight fontSize="small" /></Button>
          </Box>}
          subheader={`Spent: ${money(state.summary?.spent ?? 0)} · Debit: ${money(state.summary?.cash)} · Debt: ${money(state.summary?.debt)} · Balance: ${money(state.summary?.total_money)}`}
        />
        <CardActions disableSpacing sx={{ p: "1rem", pt: 0, flexWrap: "wrap", gap: ".5rem" }}>
          <Button size="small" color="success" variant="contained" onClick={() => openModal()}>Expense</Button>
          <Button size="small" color="success" variant="outlined" onClick={() => openIncomeModal()}>Income</Button>
          <Button size="small" color="primary" variant="outlined" onClick={() => openTransferModal()}>Transfer</Button>
          <Button size="small" color="primary" variant="contained" onClick={openOverview}>Overview</Button>
          <Button size="small" color="info" variant={!state.simple ? "outlined" : "contained"} onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"}</Button>
          <Button size="small" color="error" variant="contained" onClick={logout}>Logout</Button>
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