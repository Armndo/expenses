import { api_url } from "@/env"
import axios from "axios"

export function ExpensesModal({ state, setState }) {

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

  function store() {
    const expense = { ...state.expense }

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
    .then(() => window.location.reload())
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function update() {
    const expense = { ...state.expense }

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
    .then(() => window.location.reload())
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function closeModal() {
    setState(prev => ({
      ...prev,
      modal: false,
      expense: null,
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

  return (
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
        <p>instalments</p>
        <input type="number" min={2} step={1} max={36} placeholder={"3"} value={state.expense?.instalments ?? ""} onChange={e => editExpense("expense", "instalments", e.target.value)} />
        <p></p>
        <button onClick={() => state.expense?.id ? update() : store()}>{state.expense?.id ? "update" : "save"}</button>
      </div>
    </div>
  )
}