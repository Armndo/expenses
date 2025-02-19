import axios from "axios"
import { useState } from "react"
import { api_url } from "@/env"

export function LoginView({}) {
  const [state, setState] = useState({
    email: "",
    password: "",
  })
  
  function login(e) {
    e.preventDefault()

    axios.post(
      `${api_url}/login`,
      state
    ).then(res => {
      sessionStorage.setItem("logged", true)
      sessionStorage.setItem("token", res.data.token)
    }).catch(err => {
      console.error(err)
    })
  }

  function isLogged() {
    axios.get(
      `${api_url}/info`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      }
    ).then(res => {
      console.log(res.data)
    }).catch(err => {
      console.err(err)
      sessionStorage.removeItem("token")
    })
  }

  return <div>
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
    <button onClick={isLogged}>is logged?</button>
    </div>
}