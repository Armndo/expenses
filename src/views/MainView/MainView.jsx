import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./MainView.css"

export function MainView({ }) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
    editing: null,
    modal: false,
    expense: null,
  })
  const navigate = useNavigate()

  function load() {
    axios.get(
      `${api_url}/expenses`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    ).then(res => {
      setState(prev => ({ ...prev, sources: res.data }))
    }).catch(err => {
      if (err?.status === 401) {
        sessionStorage.removeItem("token")
        navigate("/login")
      }
    }).finally(() => setState(prev => ({ ...prev, loading: false })))
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
        date: (new Date()).toISOString().split("T")[0],
        amount: null,
        description: null,
        source_id: state.sources.length === 1 ? state.sources[0].id : null,
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

  function store(index, target) {
    const expense = { ...state[target] }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    axios.post(
      `${api_url}/expenses`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    ).then(res => {
      const expenses = [ ...state.sources[index].expenses ]
      expenses.push(res.data)
      const source = { ...state.sources[index], expenses }
      const sources = [ ...state.sources ]
      sources[index] = source
  
      setState(prev => ({
        ...prev,
        [target]: null,
        modal: false,
        sources,
      }))
    }).catch(err => {
      console.log(err)
    })
  }

  function update(index, index2) {
    const expense = { ...state.editing }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    axios.put(
      `${api_url}/expenses/${expense.id}`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    ).then(res => {
      const expenses = [ ...state.sources[index].expenses ]
      expenses[index2] = res.data
      const source = { ...state.sources[index], expenses }
      const sources = [ ...state.sources ]
      sources[index] = source
  
      setState(prev => ({
        ...prev,
        editing: null,
        sources
      }))
    }).catch(err => {
      console.log(err)
    })
  }

  function destroy(index, index2) {
    axios.delete(
      `${api_url}/expenses/${state.sources[index].expenses[index2].id}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        params: {
          source_id: state.sources[index].id,
        },
      }
    ).then(() => {
      const expenses = [ ...state.sources[index].expenses ]
      expenses.splice(index2, 1)
      const source = { ...state.sources[index], expenses }
      const sources = [ ...state.sources ]
      sources[index] = source
  
      setState(prev => ({
        ...prev,
        sources
      }))
    }).catch(err => {
      console.log(err)
    })
  }

  useEffect(() => {
    load()
  }, [])

  return (!state.loading ?
    <div>
      <div className="expenses-title">
        <h1>expenses</h1>
        <button onClick={openModal}>add expense</button>
        <button>add source</button>
      </div>
      <div className={`expenses-modal ${state.modal ? "show" : ""}`} onClick={closeModal}>
        <div className="expenses-modal-form" onClick={e => e.stopPropagation()}>
          <p>source</p>
          <select value={state.expense?.source_id ?? ""} onChange={e => editExpense("expense", "source_id", +e.target.value)}>
            <option value="">select a source</option>
            {state.sources.map(source => <option key={`option${source.id}`} value={source.id}>{source.name}</option>)}
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
        {state.sources.filter(source => source.expenses.length > 0).map((source, index) => <div key={`source${source.id}`}>
          <table border={1}>
            <thead>
              <tr>
                <th colSpan={4}>{source.name}</th>
              </tr>
              <tr>
                <th>date</th>
                <th>amount</th>
                <th>description</th>
                <th>action</th>
              </tr>
            </thead>
            <tbody>
              {source.expenses.map((expense, index2) => <tr key={`expense${expense.id}`}>
                {state.editing === null || state.editing?.id !== expense.id ?
                  <>
                    <td>
                      {expense.date}
                    </td>
                    <td>
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td>
                        {expense.description ?? "-"}
                    </td>
                    <td>
                      <button onClick={() => setState(prev => ({ ...prev, editing: { ...expense, source_id: source.id } }))}>✎</button>
                      <button onClick={() => destroy(index, index2)}>⌫</button>
                    </td>
                  </> :
                  state.editing && <>
                    <td>
                      <input type="date" value={state.editing?.date} onChange={e => editExpense("editing", "date", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min={0.01} step={0.01} placeholder={"0.01"} value={state.editing?.amount} onChange={e => editExpense("editing", "amount", e.target.value)} />
                    </td>
                    <td>
                        <textarea rows={1} value={state.editing?.description ?? ""} onChange={e => editExpense("editing", "description", e.target.value)} ></textarea>
                    </td>
                    <td>
                      <button onClick={() => update(index, index2)}>✓</button>
                      <button onClick={() => setState(prev => ({ ...prev, editing: null }))}>x</button>
                    </td>
                  </>
                }
              </tr>)}
            </tbody>
            <tfoot>
              <tr>
                <th>
                  total
                </th>
                <td colSpan={3}>
                  ${source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>)}
      </div> :
      <div className="expenses-container">
        <h2>no expenses recorded</h2>
      </div>}
    </div> :
    <div className="expenses-loading">loading</div>
  )
}