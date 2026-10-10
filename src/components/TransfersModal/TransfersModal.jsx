import { api_url } from "@/env"
import { currencySymbol, numberFormat } from "@/utils/functions"
import { AttachMoneyTwoTone, CalendarMonthTwoTone, CreditCardTwoTone, TextSnippetTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export function TransfersModal({ state, setState }) {
  const navigate = useNavigate()
  const from = state.sources.find(source => source.id === state.transfer?.from_source_id)
  const to = state.sources.find(source => source.id === state.transfer?.to_source_id)
  // Between currencies the amount that arrives is asked for; within one it is the same as the amount sent.
  const crosses = !!from && !!to && from.currency !== to.currency
  // The currency that is not pesos, and what one unit of it is worth according to the two amounts.
  const foreign = crosses ? (from.currency === "MXN" ? to.currency : from.currency) : null
  const impliedRate = crosses && +state.transfer.amount > 0 && +state.transfer.received_amount > 0
    ? (from.currency === "MXN" ? +state.transfer.amount / +state.transfer.received_amount : +state.transfer.received_amount / +state.transfer.amount)
    : null

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

    if (crosses) {
      if (transfer.received_amount === null || transfer.received_amount === undefined || isNaN(transfer.received_amount) || +transfer.received_amount <= 0) {
        alert("Incorrect 'Received' format.")
        return
      }

      transfer.received_amount = +transfer.received_amount
    } else {
      transfer.received_amount = null
    }

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

  /**
   * The origin of a transfer is a debit account (a card does not send money; paying one is a transfer from an
   * account to it), while the destination can be any source. An existing transfer keeps its current origin in
   * the list even when it is a card, so it can still be shown and edited.
   */
  function optionsFor(field) {
    if (field !== "from_source_id") {
      return state.sources
    }

    return state.sources.filter(source => source.kind !== "card" || source.id === state.transfer?.from_source_id)
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
          {optionsFor(field).map(source => <MenuItem key={`${field}_${source.id}`} value={source.id}>{source.name}</MenuItem>)}
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
              label={from && from.currency !== "MXN" ? `Amount sent (${from.currency})` : "Amount"}
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
            {crosses && <TextField
              required
              sx={{ width: "100%", mb: "1rem" }}
              label={`Received (${to.currency})`}
              type="number"
              placeholder={"0.01"}
              value={state.transfer?.received_amount ?? ""}
              onChange={e => editTransfer("received_amount", e.target.value)}
              helperText={impliedRate
                ? `1 ${foreign} = ${numberFormat(impliedRate, 4, "$")}${state.rates?.[foreign] ? ` (rate ${numberFormat(state.rates[foreign], 4, "$")})` : ""}`
                : `What arrives in ${to.name}, in ${to.currency} (${currencySymbol(to.currency)}).`}
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
            />}
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
