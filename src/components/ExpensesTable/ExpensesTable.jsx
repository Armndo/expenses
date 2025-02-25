import { api_url } from "@/env";
import { formatNumber } from "@/utils/functions";
import axios from "axios";

export function ExpensesTable({ state, setState }) {
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

  return (state.sources.filter(source => source.expenses.length > 0).length > 0 ?
    <div className="expenses-container">
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
    </div>
  )
}