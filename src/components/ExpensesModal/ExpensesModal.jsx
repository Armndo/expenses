import { api_url } from "@/env"
import { Button, Card, CardActions, CardContent, CardHeader, MenuItem, Select, TextField } from "@mui/material"
import axios from "axios"

export function ExpensesModal({ state, setState }) {

  function selectSource(value) {
    localStorage.setItem("lastSource", value)

    setState(prev => ({
      ...prev,
      expense: {
        ...prev.expense,
        source_id: value,
      },
      lastSource: value,
    }))
  }

  function store() {
    const expense = { ...state.expense }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.post(
      `${api_url}/expenses`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => window.location.reload())
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function update() {
    const expense = { ...state.expense }

    if (expense.amount === null || isNaN(expense.amount)) {
      alert("Monto en formato incorrecto.")
      return
    }

    expense.amount = +expense.amount

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.put(
      `${api_url}/expenses/${expense.id}`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => window.location.reload())
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function closeModal() {
    setState(prev => ({
      ...prev,
      modal: false,
      expense: null,
    }))
  }

  function editExpense(target, field, value) {
    const expense = {
      ...state[target],
      [field]: value !== "" ? value : null,
    }

    setState(prev => ({
      ...prev,
      [target]: expense,
    }))
  }

  return (
    <div className={`expenses-modal ${state.modal ? "show" : ""}`}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} >
        <CardHeader title="Add Expense" />
        <CardContent>
          <form onSubmit={() => null}>
            <Select
              required
              onChange={e => selectSource(+e.target.value)}
              value={state.expense?.source_id}
              sx={{ width: "100%", mb: "1rem" }}
            >
              {state.sources.map(source => <MenuItem value={source.id}>{source.name}</MenuItem>)}
            </Select>
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              required
              type="date"
              label="Date"
              value={state.expense?.date ?? ""}
              onChange={e => editExpense("expense", "date", e.target.value)}
            />
            <TextField
              required
              sx={{ width: "100%", mb: "1rem" }}
              label="Amount"
              type="number"
              min={0.01}
              step={0.01}
              placeholder={"0.01"}
              value={state.expense?.amount ?? ""}
              onChange={e => editExpense("expense", "amount", e.target.value)}
            />
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              label="Description"
              multiline
              rows={4}
              value={state.expense?.description ?? ""}
              onChange={e => editExpense("expense", "description", e.target.value)}
            />
            <TextField
              sx={{ width: "100%" }}
              label="Installments"
              min={2}
              max={36}
              step={1}
              placeholder={"2"}
              type="number"
              value={state.expense?.instalments ?? ""}
              onChange={e => editExpense("expense", "instalments", e.target.value)}
            />
          </form>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="success" variant="contained" onClick={() => state.expense?.id ? update() : store()}>{state.expense?.id ? "update" : "save"}</Button>
          <Button color="error" variant="contained"  onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}