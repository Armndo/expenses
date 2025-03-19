import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { formatNumber, standardDate } from "@/utils/functions"
import { ExpensesModal, ExpensesTable } from "@/components"
import "./MainView.css"

export function MainView({ }) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
    editing: null,
    modal: false,
    expense: null,
    simple: localStorage.getItem("simple") === "true",
    lastSource: +localStorage.getItem("lastSource"),
    date: null,
  })

  const navigate = useNavigate()

  function load(date = null) {
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

  return (!state.loading ?
    <div>
      <h1>{currentDate(state.date)}</h1>
      <div className="expenses-title">
        <h2>expenses {formatNumber((state.sources.reduce((a, b) => a + b.expenses.reduce((c, d) => c + d.amount, 0), 0) + state.sources.reduce((a, b) => a + b.instalments.reduce((c, d) => c + d.amount / d.instalments, 0), 0)).toFixed(2), "$")}</h2>
        <button onClick={() => openModal()}>add expense</button>
        <button onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"} mode</button>
        <button onClick={() => changeDate()} disabled={state.editing}>previous month</button>
        <button onClick={() => changeDate(true)} disabled={state.editing}>next month</button>
        <button onClick={logout}>logout</button>
      </div>
      <ExpensesModal
        state={state}
        setState={setState}
      />
      <ExpensesTable
        state={state}
        setState={setState}
        openModal={openModal}
      />
      <div>
        <h2>incomes {formatNumber((state.sources.reduce((a, b) => a + b.incomes.reduce((c, d) => c + d.amount, 0), 0)).toFixed(2), "$")}</h2>
        {state.sources.map(source => source.incomes_count > 0 && <>
          <h3>{source.name}</h3>
          <ul>
            {source.incomes.map(income => <li>
              {income.date} - {formatNumber(income.amount.toFixed(2), "$")} - {income.description}
            </li>)}
          </ul>
        </>)}
      </div>
    </div> :
    <div className="expenses-loading">loading</div>
  )
}