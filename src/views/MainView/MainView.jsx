import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { formatNumber, standardDate } from "@/utils/functions"
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

  function selectSource(value) {
    localStorage.setItem("lastSource", value)

    setState(prev => ({
      ...prev,
      expense: {
        ...prev.expense,
        source_id: value,
      },
      lastSource: value,
    }))
  }

  function editExpense(target, field, value) {
    const expense = {
      ...state[target],
      [field]: value !== "" ? value : null,
    }

    setState(prev => ({
      ...prev,
      [target]: expense,
    }))
  }

  function openModal() {
    setState(prev => ({
      ...prev,
      modal: true,
      expense: {
        date: standardDate(),
        amount: null,
        description: null,
        source_id: state.sources.length === 1 ? state.sources[0].id : state.lastSource,
      },
    }))
  }

  function closeModal() {
    setState(prev => ({
      ...prev,
      modal: false,
      expense: null,
    }))
  }

  function changeMode() {
    localStorage.setItem("simple", !state.simple)

    setState(prev => ({
      ...prev,
      simple: !prev.simple,
    }))
  }

  function store(index, target) {
    const expense = { ...state[target] }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.post(
      `${api_url}/expenses`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(res => {
      const expenses = [ ...state.sources[index].expenses ]
      expenses.push(res.data)
      const source = { ...state.sources[index], expenses }
      source.expenses_count++
      const sources = [ ...state.sources ]
      sources[index] = source
  
      setState(prev => ({
        ...prev,
        [target]: null,
        modal: false,
        sources,
      }))
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false, })))
  }

  function update(usource, index2) {
    const expense = { ...state.editing }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.put(
      `${api_url}/expenses/${expense.id}`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(res => {
      const expenses = [ ...usource.expenses ]
      expenses[index2] = res.data
      const source = { ...usource, expenses }
      const sources = [ ...state.sources ]
      sources[sources.indexOf(usource)] = source
  
      setState(prev => ({
        ...prev,
        editing: null,
        sources
      }))
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false, })))
  }

  function destroy(dsource, index) {
    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/expenses/${dsource.expenses[index].id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => {
      const expenses = [ ...dsource.expenses ]
      expenses.splice(index, 1)
      const source = { ...dsource, expenses }
      const sources = [ ...state.sources ]
      sources[sources.indexOf(dsource)] = source
  
      setState(prev => ({
        ...prev,
        sources
      }))
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, loading: false, })))
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
      <div className={`expenses-modal ${state.modal ? "show" : ""}`} onClick={closeModal}>
        <div className="expenses-modal-form" onClick={e => e.stopPropagation()}>
          <p>source</p>
          <select value={state.expense?.source_id ?? ""} onChange={e => selectSource(+e.target.value)}>
            <option value="">select a source</option>
            {state.sources.map(source => <option value={source.id}>{source.name}</option>)}
          </select>
          <p>date</p>
          <input type="date" value={state.expense?.date ?? ""} onChange={e => editExpense("expense", "date", e.target.value)} />
          <p>amount</p>
          <input type="number" min={0.01} step={0.01} placeholder={"0.01"} value={state.expense?.amount ?? ""} onChange={e => editExpense("expense", "amount", e.target.value)} />
          <p>description</p>
          <textarea type="text" rows={4} value={state.expense?.description ?? ""} onChange={e => editExpense("expense", "description", e.target.value)} />
          <p></p>
          <button onClick={() => store(state.sources.indexOf(state.sources.find(source => state.expense.source_id === source.id)), "expense")}>save</button>
        </div>
      </div>
      {state.sources.filter(source => source.expenses.length > 0).length > 0 ? <div className="expenses-container">
        <table border={1}>
          <thead>
            <tr>
              {state.sources.filter(source => source.expenses.length > 0).map(source => <th colSpan={state.simple ? 1 : 4}>{source.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array(state.sources.reduce((a, b) => b.expenses_count > a ? b.expenses_count : a, 0)).fill(null).map((_, index) => <tr>
              {state.sources.filter(source => source.expenses.length > 0).map(source => state.simple ? <td>
                {formatNumber(source.expenses?.[index]?.amount?.toFixed(2) ?? "-", "$")}
              </td> :
              (source.expenses?.[index] ?
                (state.editing === null || state.editing?.id !== source.expenses[index].id ? <>
                  <td>{source.expenses[index].date ?? "-"}</td>
                  <td>{formatNumber(source.expenses[index].amount.toFixed(2) ?? "-", "$")}</td>
                  <td>{source.expenses[index].description ?? "-"}</td>
                  <td>
                    <button onClick={() => setState(prev => ({ ...prev, editing: { ...source.expenses[index], source_id: source.id } }))}>✎</button>
                    <button onClick={() => destroy(source, index)}>⌫</button>
                  </td>
                </> : <>
                  <td>
                    <input type="date" value={state.editing?.date} onChange={e => editExpense("editing", "date", e.target.value)} />
                  </td>
                  <td>
                    <input type="number" min={0.01} step={0.01} placeholder={"0.01"} value={state.editing?.amount ?? ""} onChange={e => editExpense("editing", "amount", e.target.value)} />
                  </td>
                  <td>
                      <textarea rows={1} value={state.editing?.description ?? ""} onChange={e => editExpense("editing", "description", e.target.value)} ></textarea>
                  </td>
                  <td>
                    <button onClick={() => update(source, index)}>✓</button>
                    <button onClick={() => setState(prev => ({ ...prev, editing: null }))}>x</button>
                  </td>
                </>
              ) : <>
                {Array(4).fill(null).map((_, i) => <td>-</td>)}
              </>))}
            </tr>)}
          </tbody>
          <tfoot>
            <tr>
              {state.sources.filter(source => source.expenses.length > 0).map(source => <td colSpan={state.simple ? 1 : 4}>
                ${formatNumber(source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2))}
              </td>)}
            </tr>
          </tfoot>
        </table>
      </div> :
      <div className="expenses-container">
        <h2>no expenses recorded</h2>
      </div>}
      total: {formatNumber(state.sources.reduce((a, b) => a + b.expenses.reduce((c, d) => c + d.amount, 0), 0).toFixed(2), "$")}
    </div> :
    <div className="expenses-loading">loading</div>
  )
}