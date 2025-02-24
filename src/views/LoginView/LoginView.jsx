import axios from "axios"
import { useEffect, useState } from "react"
import { api_url } from "@/env"
import { useNavigate } from "react-router-dom"

export function LoginView({}) {
  const [state, setState] = useState({
    email: "",
    password: "",
    loading: true,
  })
  const navigate = useNavigate()

  useEffect(() => {
    isLogged()
  }, [])
  
  function login(e) {
    e.preventDefault()

    axios.post(
      `${api_url}/login`,
      {
        email: state.email,
        password: state.password
      }
    ).then(res => {
      localStorage.setItem("token", res.data.token)
      navigate("/")
    }).catch(err => {
      console.error(err)
    })
  }

  function isLogged() {
    axios.get(
      `${api_url}/info`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    ).then(res => {
      navigate("/")
    }).catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
      }
    }).finally(() => setState(prev => ({ ...prev, loading: false })))
  }

  return (!state.loading ?
    <div>
      <h1>login</h1>
      <form onSubmit={login}>
        <span>email</span>
        <br /> 
        <input type="text" value={state.email} onChange={e => setState(prev => ({...prev, email: e.target.value}))} />
        <br /> 
        <span>password</span>
        <br /> 
        <input type="password" value={state.password} onChange={e => setState(prev => ({...prev, password: e.target.value}))} />
        <br />
        <button type="submit">log in</button> 
      </form>
    </div> :
    <div>loading</div>
  )
}