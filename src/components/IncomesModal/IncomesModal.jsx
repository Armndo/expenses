import { api_url } from "@/env"
import { AttachMoneyTwoTone, CalendarMonthTwoTone, CreditCardTwoTone, TextSnippetTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export function IncomesModal({ state, setState }) {
  const navigate = useNavigate()

  function selectSource(value) {
    localStorage.setItem("lastSource", value)

    setState(prev => ({
      ...prev,
      income: {
        ...prev.income,
        source_id: value,
      },
      lastSource: value,
    }))
  }

  function save() {
    const income = { ...state.income }

    if (income.amount === null || isNaN(income.amount) || +income.amount === 0) {
      alert("Incorrect 'Amount' format.")
      return
    }

    if (!income.source_id) {
      alert("Select a source.")
      return
    }

    income.amount = +income.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    const request = income.id
      ? axios.put(`${api_url}/incomes/${income.id}`, income, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      : axios.post(`${api_url}/incomes`, income, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })

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
      incomeModal: false,
      income: null,
    }))
  }

  function editIncome(field, value) {
    setState(prev => ({
      ...prev,
      income: {
        ...prev.income,
        [field]: value !== "" ? value : null,
      },
    }))
  }

  return (
    state.incomeModal && <div className="expenses-modal show" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title={state.income?.id ? "Edit Income" : "Add Income"} />
        <CardContent>
          <form onSubmit={e => e.preventDefault()}>
            <FormControl fullWidth>
              <InputLabel id="select-income-source" required>Source</InputLabel>
              <Select
                labelId="select-income-source"
                required
                onChange={e => selectSource(+e.target.value)}
                value={state.income?.source_id ?? ""}
                sx={{ width: "100%", mb: "1rem" }}
                label="Source"
                startAdornment={<InputAdornment sx={{ mr: 1 }}>
                  <CreditCardTwoTone />
                </InputAdornment>}
              >
                {state.sources.map(source => <MenuItem key={`income_source_${source.id}`} value={source.id}>{source.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              required
              type="date"
              label="Date"
              id="income-modal-date"
              value={state.income?.date ?? ""}
              onChange={e => editIncome("date", e.target.value)}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment sx={{ ml: 1, cursor: "pointer" }} onClick={() => document.querySelector("#income-modal-date").showPicker()}>
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
              value={state.income?.amount ?? ""}
              onChange={e => editIncome("amount", e.target.value)}
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
              value={state.income?.description ?? ""}
              onChange={e => editIncome("description", e.target.value)}
              placeholder="Describe your income..."
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
          <Button color="success" type="button" variant="contained" onClick={save}>{state.income?.id ? "update" : "save"}</Button>
          <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}
