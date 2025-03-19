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

function ShownItem({ setState, item, index, source, offset = 0, target = "expenses", className = null, openModal }) {
  function destroy(dsource, index) {
    if (!confirm("Delete?")) {
      return
    }

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
      window.location.reload()
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  return (
    <>
      <td className={className}>{item.date ?? "-"}</td>
      <td className={className}>{formatNumber(monthlyAmount(item) ?? "-", "$")}</td>
      <td className={className}>{item.description ?? "-"}</td>
      <td className={className}>
        <button onClick={() => openModal(item)}>✎</button>
        <button onClick={() => destroy(source, index)}>⌫</button>
      </td>
    </>
  )
}

export function ExpenseItem({ index, offset, state, setState, openModal }) {
  return (
    <tr>
      {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(
        source => state.simple ?
          <td className={index >= offset ? "instalment" : ""}>
            {formatNumber(source.expenses?.[index]?.amount?.toFixed(2) ?? monthlyAmount(source.instalments?.[index - offset]) ?? "-", "$")}
          </td> :
          (
            source.expenses?.[index] ?
              <ShownItem state={state} index={index} setState={setState} source={source} item={source.expenses[index]} openModal={openModal} />
            : source.instalments?.[index - offset] ?
              <ShownItem state={state} index={index} setState={setState} source={source} openModal={openModal} className="instalment" offset={offset} target={"instalments"} item={source.instalments[index - offset]} />
            : <>
              {Array(4).fill(null).map((_, i) => <td className={index >= offset ? "instalment" : ""}>-</td>)}
            </>
          )
        )}
    </tr>
  )
}