import { api_url } from "@/env"
import { AttachMoneyTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, InputAdornment, TextField } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

/** Edits the settings: `state.settings` is `{ balance_start: "YYYY-MM", monthly_budget }` (an empty budget means none). */
export function SettingsModal({ state, setState }) {
  const navigate = useNavigate()

  function save() {
    const { balance_start, monthly_budget } = state.settings

    if (!/^\d{4}-\d{2}$/.test(balance_start ?? "")) {
      alert("Incorrect 'Balance start' format.")
      return
    }

    if (monthly_budget !== null && (isNaN(monthly_budget) || +monthly_budget < 0)) {
      alert("Incorrect 'Monthly budget' format.")
      return
    }

    setState(prev => ({ ...prev, loading: true }))

    axios.put(
      `${api_url}/settings`,
      { balance_start, monthly_budget: monthly_budget === null ? null : +monthly_budget },
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
    setState(prev => ({ ...prev, settingsModal: false, settings: null }))
  }

  return (
    state.settingsModal && <div className="expenses-modal show" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title="Settings" />
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); save() }}>
            <TextField
              required
              sx={{ width: "100%", mb: "1rem" }}
              label="Balance start"
              type="month"
              helperText="First month counted by the Balance; what is dated before it is left out."
              value={state.settings?.balance_start ?? ""}
              onChange={e => setState(prev => ({ ...prev, settings: { ...prev.settings, balance_start: e.target.value !== "" ? e.target.value : null } }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              sx={{ width: "100%" }}
              label="Monthly budget"
              type="number"
              placeholder="No budget"
              helperText="Pesos a month; the Spent of each month is compared with it. Leave it empty for none."
              value={state.settings?.monthly_budget ?? ""}
              onChange={e => setState(prev => ({ ...prev, settings: { ...prev.settings, monthly_budget: e.target.value !== "" ? e.target.value : null } }))}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <AttachMoneyTwoTone />
                  </InputAdornment>
                },
                htmlInput: {
                  min: 0,
                  step: 0.01,
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
