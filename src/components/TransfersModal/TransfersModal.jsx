import { api_url } from "@/env"
import { AttachMoneyTwoTone, CalendarMonthTwoTone, CreditCardTwoTone, TextSnippetTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export function TransfersModal({ state, setState }) {
  const navigate = useNavigate()

  function save() {
    const transfer = { ...state.transfer }

    if (!transfer.from_source_id || !transfer.to_source_id) {
      alert("Select the origin and the destination.")
      return
    }

    if (transfer.from_source_id === transfer.to_source_id) {
      alert("The origin and the destination must be different.")
      return
    }

    if (transfer.amount === null || isNaN(transfer.amount) || +transfer.amount <= 0) {
      alert("Incorrect 'Amount' format.")
      return
    }

    transfer.amount = +transfer.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    const request = transfer.id
      ? axios.put(`${api_url}/transfers/${transfer.id}`, transfer, config)
      : axios.post(`${api_url}/transfers`, transfer, config)

    request
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
    setState(prev => ({
      ...prev,
      transferModal: false,
      transfer: null,
    }))
  }

  function editTransfer(field, value) {
    setState(prev => ({
      ...prev,
      transfer: {
        ...prev.transfer,
        [field]: value !== "" ? value : null,
      },
    }))
  }

  function sourceSelect(field, label, labelId) {
    return (
      <FormControl fullWidth>
        <InputLabel id={labelId} required>{label}</InputLabel>
        <Select
          labelId={labelId}
          required
          onChange={e => editTransfer(field, +e.target.value)}
          value={state.transfer?.[field] ?? ""}
          sx={{ width: "100%", mb: "1rem" }}
          label={label}
          startAdornment={<InputAdornment sx={{ mr: 1 }}>
            <CreditCardTwoTone />
          </InputAdornment>}
        >
          {state.sources.map(source => <MenuItem key={`${field}_${source.id}`} value={source.id}>{source.name}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }

  return (
    state.transferModal && <div className="expenses-modal show" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title={state.transfer?.id ? "Edit Transfer" : "Add Transfer"} />
        <CardContent>
          <form onSubmit={e => e.preventDefault()}>
            {sourceSelect("from_source_id", "From", "select-transfer-from")}
            {sourceSelect("to_source_id", "To", "select-transfer-to")}
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              required
              type="date"
              label="Date"
              id="transfer-modal-date"
              value={state.transfer?.date ?? ""}
              onChange={e => editTransfer("date", e.target.value)}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment sx={{ ml: 1, cursor: "pointer" }} onClick={() => document.querySelector("#transfer-modal-date").showPicker()}>
                    <CalendarMonthTwoTone />
                  </InputAdornment>
                }
              }}
            />
            <TextField
              required
              sx={{ width: "100%", mb: "1rem" }}
              label="Amount"
              type="number"
              placeholder={"0.01"}
              value={state.transfer?.amount ?? ""}
              onChange={e => editTransfer("amount", e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <AttachMoneyTwoTone />
                  </InputAdornment>
                },
                htmlInput: {
                  step: 0.01,
                }
              }}
            />
            <TextField
              sx={{ width: "100%" }}
              label="Description"
              multiline
              rows={4}
              value={state.transfer?.description ?? ""}
              onChange={e => editTransfer("description", e.target.value)}
              placeholder="Describe your transfer..."
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <TextSnippetTwoTone />
                  </InputAdornment>,
                  sx: {
                    alignItems: "flex-start"
                  }
                }
              }}
            />
          </form>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="success" type="button" variant="contained" onClick={save}>{state.transfer?.id ? "update" : "save"}</Button>
          <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}
