import { api_url } from "@/env"
import { formatNumber } from "@/utils/functions"
import axios from "axios"

function monthlyAmount(instalment) {
  if (!instalment) {
    return null
  }

  if (!instalment.instalments) {
    return instalment.amount.toFixed(2)
  }

  return (instalment.amount / instalment.instalments).toFixed(2)
}

function ShownItem({ state, setState, item, index, source, offset = 0, target = "expenses", className = null }) {
  function destroy(dsource, index) {
    console.log(index);

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/expenses/${dsource[target][index - offset].id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => {
      const expenses = [ ...dsource[target] ]
      expenses.splice(index - offset, 1)
      const source = { ...dsource, [target]: expenses }
      source[`${target}_count`]--;
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
  return (
    <>
      <td className={className}>{item.date ?? "-"}</td>
      <td className={className}>{formatNumber(monthlyAmount(item) ?? "-", "$")}</td>
      <td className={className}>{item.description ?? "-"}</td>
      <td className={className}>
        <button onClick={() => setState(prev => ({ ...prev, editing: { ...item, source_id: source.id } }))}>✎</button>
        <button onClick={() => destroy(source, index)}>⌫</button>
      </td>
    </>
  )
}

function EditItem({ state, setState, source, index, offset = 0, target = "expenses", className = null }) {
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
      const expenses = [ ...usource[target] ]
      console.log(expenses);
      
      expenses[index2 - offset] = res.data
      const source = { ...usource, [target]: expenses }
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

  return (
    <>
      <td className={className}>
        <input type="date" value={state.editing?.date} onChange={e => editExpense("editing", "date", e.target.value)} />
      </td>
      <td className={className}>
        <input type="number" min={0.01} step={0.01} placeholder={"0.01"} value={state.editing?.amount ?? ""} onChange={e => editExpense("editing", "amount", e.target.value)} />
      </td>
      <td className={className}>
          <textarea rows={1} value={state.editing?.description ?? ""} onChange={e => editExpense("editing", "description", e.target.value)} ></textarea>
      </td>
      <td className={className}>
        <button onClick={() => update(source, index )}>✓</button>
        <button onClick={() => setState(prev => ({ ...prev, editing: null }))}>x</button>
      </td>
    </>
  )
}

export function ExpenseItem({ index, offset, state, setState }) {
  return (
    <tr>
      {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(
        source => state.simple ?
          <td className={index >= offset ? "instalment" : ""}>
            {formatNumber(source.expenses?.[index]?.amount?.toFixed(2) ?? monthlyAmount(source.instalments?.[index - offset]) ?? "-", "$")}
          </td> :
          (
            source.expenses?.[index] ? (
              state.editing === null || state.editing?.id !== source.expenses[index].id ? <ShownItem state={state} index={index} setState={setState} source={source} item={source.expenses[index]} /> : <EditItem state={state} setState={setState} source={source} index={index} />
            ) :
            source.instalments?.[index - offset] ? (
              state.editing === null || state.editing?.id !== source.instalments[index - offset].id ? <ShownItem state={state} index={index} setState={setState} source={source} className="instalment" offset={offset} target={"instalments"} item={source.instalments[index - offset]} /> : <EditItem state={state} setState={setState} source={source} index={index} offset={offset} target={"instalments"} className="instalment" />
            ) :
            <>
              {Array(4).fill(null).map((_, i) => <td className={index >= offset ? "instalment" : ""}>-</td>)}
            </>
          )
        )}
    </tr>
  )
}