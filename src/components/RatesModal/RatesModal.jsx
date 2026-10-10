import { api_url } from "@/env"
import { AttachMoneyTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, InputAdornment, TextField } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

/** Edits the exchange rate (pesos per unit) of a currency: `state.rate` is `{ currency, rate }`. */
export function RatesModal({ state, setState }) {
  const navigate = useNavigate()

  function save() {
    const rate = state.rate

    if (rate.rate === null || isNaN(rate.rate) || +rate.rate <= 0) {
      alert("Incorrect 'Exchange rate' format.")
      return
    }

    setState(prev => ({ ...prev, loading: true }))

    axios.put(
      `${api_url}/rates/${rate.currency}`,
      { rate: +rate.rate },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    )
    .then(() => window.location.reload())
    .catch(err => {
      setState(prev => ({ ...prev, loading: false }))

      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function closeModal() {
    setState(prev => ({ ...prev, rateModal: false, rate: null }))
  }

  return (
    state.rateModal && <div className="expenses-modal show" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title={`Exchange rate ${state.rate?.currency ?? ""}`} subheader="Pesos for one unit; it values every amount of that currency." />
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); save() }}>
            <TextField
              required
              autoFocus
              sx={{ width: "100%" }}
              label="Pesos per unit"
              type="number"
              placeholder="17.85"
              value={state.rate?.rate ?? ""}
              onChange={e => setState(prev => ({ ...prev, rate: { ...prev.rate, rate: e.target.value !== "" ? e.target.value : null } }))}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <AttachMoneyTwoTone />
                  </InputAdornment>
                },
                htmlInput: {
                  step: 0.0001,
                }
              }}
            />
          </form>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="success" type="button" variant="contained" onClick={save}>save</Button>
          <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}
