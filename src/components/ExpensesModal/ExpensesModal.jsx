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
        sources,
      }))
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
    .finally(() => setState(prev => ({ ...prev, modal: false, loading: false, })))
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
        <input type="number" min={0} step={1} max={36} placeholder={"0"} value={state.expense?.instalments ?? ""} onChange={e => editExpense("expense", "instalments", e.target.value)} />
        <p></p>
        <button onClick={() => store(state.sources.indexOf(state.sources.find(source => state.expense.source_id === source.id)), "expense")}>save</button>
      </div>
    </div>
  )
}