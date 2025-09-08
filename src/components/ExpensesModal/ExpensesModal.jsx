import { api_url } from "@/env"
import { AttachMoneyTwoTone, CalendarMonthTwoTone, CategoryTwoTone, CreditCardTwoTone, EventRepeatTwoTone, TextSnippetTwoTone } from "@mui/icons-material"
import { Button, Card, CardActions, CardContent, CardHeader, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material"
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

  function selectCategory(value) {
    localStorage.setItem("lastCategory", value)

    setState(prev => ({
      ...prev,
      expense: {
        ...prev.expense,
        category_id: value,
      },
      lastCategory: value,
    }))
  }

  function store() {
    const expense = { ...state.expense }

    if (expense.amount === null || isNaN(expense.amount) || expense.amount < 0.01 ) {
      alert("Incorrect 'Amount' format.")
      return
    }

    if (expense.instalments !== null && (!Number.isInteger(+expense.instalments) || +expense.instalments < 2)) {
      alert("Incorrect 'Installments' format.")
      return
    }

    expense.amount = +expense.amount
    if (expense.category_id === 0) delete expense.category_id

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

    if (expense.amount === null || isNaN(expense.amount) || expense.amount < 0.01 ) {
      alert("Incorrect 'Amount' format.")
      return
    }

    if (expense.instalments !== null && (!Number.isInteger(+expense.instalments) || +expense.instalments < 2)) {
      alert("Incorrect 'Installments' format.")
      return
    }

    expense.amount = +expense.amount
    if (expense.category_id === 0) delete expense.category_id

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
    state.modal && <div className={`expenses-modal show`} onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title="Add Expense" />
        <CardContent>
          <form onSubmit={() => null}>
            <FormControl fullWidth>
              <InputLabel id="select-source" required>Source</InputLabel>
              <Select
                labelId="select-source"
                required
                onChange={e => selectSource(+e.target.value)}
                value={state.expense?.source_id ?? ""}
                sx={{ width: "100%", mb: "1rem" }}
                label="Source"
                startAdornment={<InputAdornment sx={{ mr: 1 }}>
                  <CreditCardTwoTone />
                </InputAdornment>}
              >
                {state.sources.map(source => <MenuItem value={source.id}>{source.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              required
              type="date"
              label="Date"
              id="modal-date"
              value={state.expense?.date ?? ""}
              onChange={e => editExpense("expense", "date", e.target.value)}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment sx={{ ml: 1, cursor: "pointer" }} onClick={() => document.querySelector("#modal-date").showPicker()}>
                    <CalendarMonthTwoTone/>
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
              value={state.expense?.amount ?? ""}
              onChange={e => editExpense("expense", "amount", e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <AttachMoneyTwoTone />
                  </InputAdornment>
                },
                htmlInput: {
                  step: 0.01,
                  min: 0.01,
                }
              }}
            />
            <FormControl fullWidth>
              <InputLabel id="select-category">Category</InputLabel>
              <Select
                labelId="select-category"
                onChange={e => selectCategory(+e.target.value)}
                value={state.expense?.category_id ?? 0}
                sx={{ width: "100%", mb: "1rem" }}
                label="Category"
                startAdornment={<InputAdornment sx={{ mr: 1 }}>
                  <CategoryTwoTone />
                </InputAdornment>}
              >
                <MenuItem dense value={0}>Select a category</MenuItem>
                {state.categories.map(category => <MenuItem dense value={category.id}>{category.alias} {category.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              sx={{ width: "100%", mb: "1rem" }}
              label="Description"
              multiline
              rows={4}
              value={state.expense?.description ?? ""}
              onChange={e => editExpense("expense", "description", e.target.value)}
              placeholder="Describe your expense..."
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
            <TextField
              sx={{ width: "100%" }}
              label="Installments"
              placeholder={"2"}
              type="number"
              value={state.expense?.instalments ?? ""}
              onChange={e => editExpense("expense", "instalments", e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment sx={{ mr: 1 }}>
                    <EventRepeatTwoTone />
                  </InputAdornment>
                },
                htmlInput: {
                  step: 1,
                  min: 2,
                  max: 36,
                }
              }}
            />
          </form>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="success" type="button" variant="contained" onClick={() => state.expense?.id ? update() : store()}>{state.expense?.id ? "update" : "save"}</Button>
          <Button color="error" type="button" variant="contained"  onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}