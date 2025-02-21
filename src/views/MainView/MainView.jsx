import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export function MainView({ }) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
    editing: null,
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

  function editExpense(field, value) {
    const editing = {
      ...state.editing,
      [field]: value !== "" ? value : null,
    }

    setState(prev => ({
      ...prev,
      editing,
    }))
  }

  function store(index) {
    const expense = { ...state.editing }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount
    const expenses = [ ...state.sources[index].expenses ]
    expenses.push(expense)
    const source = { ...state.sources[index], expenses }
    const sources = [ ...state.sources ]
    sources[index] = source

    setState(prev => ({
      ...prev,
      editing: null,
      sources
    }))
  }

  function update(index, index2) {
    const expense = { ...state.editing }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount
    const expenses = [ ...state.sources[index].expenses ]
    expenses[index2] = expense
    const source = { ...state.sources[index], expenses }
    const sources = [ ...state.sources ]
    sources[index] = source

    setState(prev => ({
      ...prev,
      editing: null,
      sources
    }))
  }

  function destroy(index, index2) {
    const expenses = [ ...state.sources[index].expenses ]
    expenses.splice(index2, 1)
    const source = { ...state.sources[index], expenses }
    const sources = [ ...state.sources ]
    sources[index] = source

    setState(prev => ({
      ...prev,
      sources
    }))
  }

  useEffect(() => {
    load()
  }, [])

  return (!state.loading ?
    <div>
      <h1>expenses</h1>
      <div>
        {state.sources.map((source, index) => <table key={`source${source.id}`} style={{ display: "inline-block", verticalAlign: "top", textAlign: "center" }} border={1}>
          <thead>
            <tr>
              <th colSpan={4}>{source.name}</th>
            </tr>
            <tr>
              <th>fecha</th>
              <th>monto</th>
              <th>descripción</th>
              <th>acción</th>
            </tr>
          </thead>
          <tbody>
            {source.expenses.map((expense, index2) => <tr key={`expense${expense.id}`}>
              {state.editing === null || state.editing?.id !== expense.id ?
                <>
                  <td>
                    {new Date(expense.date).toLocaleDateString()}
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
                    <input type="date" value={state.editing?.date} onChange={e => editExpense("date", e.target.value)} />
                  </td>
                  <td>
                    $<input type="number" min={0.01} step={0.01} value={state.editing?.amount} onChange={e => editExpense("amount", e.target.value)} />
                  </td>
                  <td>
                      <textarea rows={1} value={state.editing?.description ?? ""} onChange={e => editExpense("description", e.target.value)} ></textarea>
                  </td>
                  <td>
                    <button onClick={() => update(index, index2)}>✓</button>
                    <button onClick={() => setState(prev => ({ ...prev, editing: null }))}>x</button>
                  </td>
                </>
              }
            </tr>)}
            {state.editing?.source_id === source.id && state.editing?.id === undefined && <tr>
              <td>
                <input type="date" value={state.editing.date} onChange={e => editExpense("date", e.target.value)} />
              </td>
              <td>
                $ <input type="number" min={0.01} step={0.01} placeholder={"0.01"} value={state.editing.amount ?? ""} onChange={e => editExpense("amount", e.target.value)} />
              </td>
              <td>
                  <textarea rows={1} onChange={e => editExpense("description", e.target.value)} value={state.editing.description ?? ""}></textarea>
              </td>
              <td>
                <button onClick={() => store(index)}>✓</button>
                <button onClick={() => setState(prev => ({ ...prev, editing: null }))}>x</button>
              </td>
            </tr>}
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
            <tr>
              <td colSpan={4}>
                <button style={{ width: "100%" }} onClick={() => setState(prev => ({ ...prev, editing: { date: (new Date()).toISOString().split("T")[0], amount: null, description: null, source_id: source.id } }))}>+</button>
              </td>
            </tr>
          </tfoot>
        </table>)}
      </div>
    </div> :
    <div>loading</div>
  )
}