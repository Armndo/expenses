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
  })

  const navigate = useNavigate()

  function load() {
    axios.get(
      `${api_url}/expenses`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(res => setState(prev => ({ ...prev, sources: res.data })))
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false })))
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

  function openModal() {
    setState(prev => ({
      ...prev,
      modal: true,
      expense: {
        date: standardDate(),
        amount: null,
        description: null,
        instalments: null,
        source_id: state.sources.length === 1 ? state.sources[0].id : state.lastSource,
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
      <div className="expenses-title">
        <h1>expenses</h1>
        <button onClick={openModal}>add expense</button>
        <button onClick={changeMode} disabled={state.editing}>{state.simple ? "advanced" : "simple"} mode</button>
        <button onClick={logout}>logout</button>
      </div>
      <ExpensesModal
        state={state}
        setState={setState}
      />
      <ExpensesTable
        state={state}
        setState={setState}
      />
      total: {formatNumber(state.sources.reduce((a, b) => a + b.expenses.reduce((c, d) => c + d.amount, 0), 0).toFixed(2), "$")}
    </div> :
    <div className="expenses-loading">loading</div>
  )
}