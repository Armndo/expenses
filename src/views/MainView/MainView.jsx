import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { formatNumber, standardDate } from "@/utils/functions"
import { ExpensesModal, ExpensesTable } from "@/components"
import "./MainView.css"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material"

export function MainView({ }) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
    editing: null,
    modal: false,
    expense: null,
    simple: localStorage.getItem("simple") === "true",
    lastSource: +localStorage.getItem("lastSource"),
    date: localStorage.getItem("date"),
  })

  const navigate = useNavigate()

  function load(date = null) {
    if (localStorage.getItem("date")) {
      date = localStorage.getItem("date")
    }

    setState(prev => ({ ...prev, loading: true }))

    axios.get(
      `${api_url}/expenses`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          date,
        }
      }
    )
    .then(res => setState(prev => ({ ...prev, date, sources: res.data })))
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false })))
  }

  function currentDate(date = null) {
    const d = date ? new Date(date) : new Date()
    d.setMinutes(d.getMinutes() - (new Date()).getTimezoneOffset())

    const months = [
      "January",
      "Febrary",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    return `${months[d.getMonth()]} ${d.getFullYear()} `
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
        source_id: state.sources.length === 1 ? state.sources[0].id : state.lastSource,
        ...expense,
      },
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
    <Box sx={{ width: "100vw", height: "calc(100vh - 1rem)" }}>
      <ExpensesModal
        state={state}
        setState={setState}
      />
      <Card sx={{ margin: "auto", mt: "1rem", maxHeight: "calc(100vh - 2rem)", maxWidth: "90vw", borderRadius: "1rem", zIndex: 1 }} elevation={5} >
        <CardHeader title={currentDate(state.date)} subheader={`Spent: ${formatNumber((state.sources.reduce((a, b) => a + b.expenses.reduce((c, d) => c + d.amount, 0), 0) + state.sources.reduce((a, b) => a + b.instalments.reduce((c, d) => c + d.amount / d.instalments, 0), 0)).toFixed(2), "$")}`} />
        <CardActions sx={{ p: "1rem", pt: 0 }}>
          <Button size="small" color="success" variant="contained" onClick={() => openModal()}>Add</Button>
          <Button size="small" color="info" variant={!state.simple ? "outlined" : "contained"} onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"}</Button>
          <Button size="small" color="secondary" variant="contained" onClick={() => changeDate()} disabled={state.editing}>prev</Button>
          <Button size="small" color="secondary" variant="contained" onClick={() => changeDate(true)} disabled={state.editing}>next</Button>
          <Button size="small" color="error" variant="contained" onClick={logout}>Logout</Button>
        </CardActions>
        <CardContent sx={{ width: "calc(100% - 2rem)", overflow: "scroll", p: 0, pl: "1rem", pb: 0, mb: "1rem", ":last-child": {mb: "1rem", pb: 0 } }}>
          <ExpensesTable
            state={state}
            setState={setState}
            openModal={openModal}
          />
        </CardContent>
        {/* <CardHeader subheader={`Incomes: ${formatNumber((state.sources.reduce((a, b) => a + b.incomes.reduce((c, d) => c + d.amount, 0), 0)).toFixed(2), "$")}`} /> */}
        {/* <CardActions sx={{ p: "1rem", pt: 0 }}>
          <Button variant="contained" onClick={() => null}>Add</Button>
        </CardActions>
        <CardContent>
          {state.sources.map(source => source.incomes_count > 0 && <>
            <h3>{source.name}</h3>
            <ul>
              {source.incomes.map(income => <li>
                {income.date} - {formatNumber(income.amount.toFixed(2), "$")} - {income.description}
              </li>)}
            </ul>
          </>)}
        </CardContent> */}
      </Card>
    </Box>
  </>
}