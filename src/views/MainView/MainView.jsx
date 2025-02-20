import { api_url } from "@/env"
import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export function MainView({}) {
  const [state, setState] = useState({
    sources: [],
    loading: true,
  })
  const navigate = useNavigate()

  function load() {
    axios.get(
      `${api_url}/sources`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
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
      sources:
      <ul>
        {state.sources.map(source => <li key={source.id}>{source.name}</li>)}
      </ul>
    </div> :
    <div>loading</div>
  )
}