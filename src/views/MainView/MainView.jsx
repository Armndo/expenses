import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export function MainView({ }) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
  })
  const navigate = useNavigate()

  function load() {
    axios.get(
      `${api_url}/expenses`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
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

  useEffect(() => {
    load()
  }, [])

  return (!state.loading ?
    <div>
      <h1>expenses</h1>
      <div>
        {state.sources.map(source => <table key={`source${source.id}`} style={{ display: "inline-block", verticalAlign: "top", textAlign: "center" }} border={1}>
          <thead>
            <tr>
              <th colSpan={4}>{source.name}</th>
            </tr>
            <tr>
              <th>fecha</th>
              <th>monto</th>
              <th>descripción</th>
              <th>eliminar</th>
            </tr>
          </thead>
          <tbody>
            {source.expenses.map(expense => <tr key={`expense${expense.id}`}>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>${(+expense.amount).toFixed(2)}</td>
              <td>{expense.description ?? "-"}</td>
              <td>
                <button style={{ width: "100%" }}>x</button>
              </td>
            </tr>)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <button style={{ width: "100%" }}>+</button>
              </td>
            </tr>
          </tfoot>
        </table>)}
      </div>
    </div> :
    <div>loading</div>
  )
}