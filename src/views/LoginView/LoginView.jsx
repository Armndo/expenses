import axios from "axios"
import { useEffect, useState } from "react"
import { api_url } from "@/env"
import { useNavigate } from "react-router-dom"
import "./LoginView.css"
import { Box, Button, Card, CardActions, CardContent, CardHeader, TextField } from "@mui/material"

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
    <Box sx={{ width: "100vw", height: "100vh" }}>
      <Card sx={{ width: "50%", maxWidth: "40rem", margin: "auto", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "unset", borderRadius: "1rem" }} elevation={5} >
        <CardHeader title="Login" />
        <CardContent>
          <form onSubmit={login} id="login-form">
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              required
              label="Email"
              value={state.email}
              onChange={e => setState(prev => ({...prev, email: e.target.value}))}
            />
            <TextField
              sx={{ width: "100%" }}
              required
              type="password"
              label="Password"
              value={state.password}
              onChange={e => setState(prev => ({...prev, password: e.target.value}))}
            />
          </form>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button variant="outlined" size="large" type="submit" form="login-form" >
            Send
          </Button>
        </CardActions>
      </Card>
    </Box> :
    <div className="login-loading">loading</div>
  )
}