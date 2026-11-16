import { api_url } from "@/env"
import { RecordPreview } from "@/components/RecordPreview/RecordPreview"
import { EVERY_OPTIONS, activeCategories, activeSources, billingOf, canCut, expenseError, expensePayload, filterCategories, formatDate, rememberPeriod, scopeOf, scopeQuery, sourceOptionLabel, startOf } from "@/utils/functions"
import { AttachMoneyTwoTone, CalendarMonthTwoTone, CategoryTwoTone, CreditCardTwoTone, EventRepeatTwoTone, RepeatTwoTone, TextSnippetTwoTone } from "@mui/icons-material"
import { Autocomplete, Button, Card, CardActions, CardContent, CardHeader, Checkbox, FormControl, FormControlLabel, FormGroup, Box, InputAdornment, InputLabel, MenuItem, Radio, RadioGroup, Select, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export function ExpensesModal({ state, setState }) {
  const navigate = useNavigate()

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
    const error = expenseError(state.expense)

    if (error) {
      alert(error)
      return
    }

    // Without the fields of the form itself, and with only what its way of billing uses (the others are cleared).
    const expense = expensePayload(state.expense)
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
    .then(res => {
      rememberPeriod(res?.data?.period)
      window.location.reload()
    })
    .catch(err => {
      setState(prev => ({ ...prev, loading: false }))

      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  function update() {
    const error = expenseError(state.expense)

    if (error) {
      alert(error)
      return
    }

    // Without the fields of the form itself, and with only what its way of billing uses (the others are cleared).
    const expense = expensePayload(state.expense)
    if (expense.category_id === 0) delete expense.category_id

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.put(
      `${api_url}/expenses/${expense.id}${scopeQuery(state.expense)}`,
      expense,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(res => {
      rememberPeriod(res?.data?.period)
      window.location.reload()
    })
    .catch(err => {
      setState(prev => ({ ...prev, loading: false }))

      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  /** How the expense bills: one payment, instalments or a repetition. Choosing one clears what the others use (the API takes only one of them). */
  function setBilling(mode) {
    setState(prev => ({
      ...prev,
      expense: {
        ...prev.expense,
        billing: mode,
        instalments: mode === "instalments" ? prev.expense.instalments : null,
        recurs_every: mode === "repeats" ? (prev.expense.recurs_every ?? 1) : null,
        ends_on: mode === "repeats" ? prev.expense.ends_on : null,
        custom_every: mode === "repeats" ? !!prev.expense.custom_every : false,
      },
    }))
  }

  /** The options of "Every" (month, 3 months, 6 months, year) or "Other", which shows a number of months of its own. */
  function selectEvery(value) {
    setState(prev => ({
      ...prev,
      expense: {
        ...prev.expense,
        recurs_every: value === "custom" ? (EVERY_OPTIONS.some(option => option.value === +prev.expense.recurs_every) ? 2 : prev.expense.recurs_every) : value,
        custom_every: value === "custom",
      },
    }))
  }

  /** What an edit of a charge of a rule applies to: this charge and the following ones, or all of them (the past ones too). */
  function setScope(scope) {
    setState(prev => ({ ...prev, expense: { ...prev.expense, scope } }))
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

  const billing = billingOf(state.expense ?? {})
  // Editing a charge of a rule: it can cut (this and the following) or change all of it; the first charge has nothing before it to keep.
  const cuts = !!state.expense?.id && canCut(state.expense) && billing === "repeats"
  const following = scopeOf(state.expense ?? {}) === "following"

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
                {activeSources(state.sources, state.expense?.source_id).map(source => <MenuItem key={`source_${source.id}`} value={source.id}>{sourceOptionLabel(source)}</MenuItem>)}
              </Select>
            </FormControl>
            {following ? <Typography variant="body2" color="text.secondary" sx={{ mb: ".5rem" }}>
              Starts on the charge of <strong>{formatDate(state.expense.occurrence_date)}</strong>
            </Typography> : <TextField
              sx={{ width: "100%" }}
              required
              type="date"
              label={billing === "repeats" ? "First charge" : "Date"}
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
            />}
            <FormGroup sx={{ float: "right" }}>
              <FormControlLabel
                control={<Checkbox
                  onChange={e => editExpense("expense", "next", e.target.checked)}
                  checked={state.expense?.next ?? false}
                  color="default"
                  sx={{ p: 0, m: "9px", mr: 0, ml: "4px", "& .MuiSvgIcon-root": { fontSize: "1rem" }}}
                />}
                label="Billed next period?"
                labelPlacement="start"
                sx={{ mr: 0, "& .MuiFormControlLabel-label": { fontSize: ".75rem" }}} />
            </FormGroup>
            <TextField
              required
              sx={{ width: "100%", mb: "1rem" }}
              label={billing === "repeats" ? "Amount per charge" : "Amount"}
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
                }
              }}
            />
            <Box sx={{ mb: "1rem" }}>
              <Typography variant="caption" color="text.secondary">How it bills</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" value={billing} onChange={(_, mode) => mode && setBilling(mode)} sx={{ mt: ".25rem" }}>
                <ToggleButton value="one">One payment</ToggleButton>
                <ToggleButton value="instalments">Instalments</ToggleButton>
                <ToggleButton value="repeats">Repeats</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {billing === "instalments" && <TextField
              sx={{ width: "100%", mb: "1rem" }}
              label="Instalments"
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
            />}
            {cuts && <Box sx={{ mb: "1rem" }}>
              <Typography variant="caption" color="text.secondary">Apply to</Typography>
              <RadioGroup value={following ? "following" : "all"} onChange={e => setScope(e.target.value)}>
                <FormControlLabel value="following" control={<Radio size="small" />} label={<>
                  This and following charges <Typography component="span" variant="caption" color="text.secondary">from {formatDate(state.expense.occurrence_date)}, the earlier ones stay</Typography>
                </>} />
                <FormControlLabel value="all" control={<Radio size="small" />} label={<>
                  All charges <Typography component="span" variant="caption" color="text.secondary">from {formatDate(state.expense.date)}, the past ones change too</Typography>
                </>} />
              </RadioGroup>
            </Box>}
            {billing === "repeats" && <Box sx={{ display: "flex", gap: ".5rem", mb: "1rem" }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel id="select-every">Every</InputLabel>
                <Select
                  labelId="select-every"
                  label="Every"
                  value={state.expense?.custom_every ? "custom" : (state.expense?.recurs_every ?? 1)}
                  onChange={e => selectEvery(e.target.value)}
                  startAdornment={<InputAdornment sx={{ mr: 1 }}>
                    <RepeatTwoTone />
                  </InputAdornment>}
                >
                  {EVERY_OPTIONS.map(option => <MenuItem key={`every_${option.value}`} value={option.value}>{option.label}</MenuItem>)}
                  <MenuItem value="custom">Other</MenuItem>
                </Select>
              </FormControl>
              {state.expense?.custom_every && <TextField
                sx={{ flex: 1 }}
                label="Months"
                type="number"
                value={state.expense?.recurs_every ?? ""}
                onChange={e => editExpense("expense", "recurs_every", e.target.value)}
                slotProps={{ htmlInput: { step: 1, min: 1, max: 60 } }}
              />}
              <TextField
                sx={{ flex: 1 }}
                type="date"
                label="Until"
                value={state.expense?.ends_on ?? ""}
                onChange={e => editExpense("expense", "ends_on", e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: startOf(state.expense ?? {}) ?? undefined } }}
              />
            </Box>}
            <RecordPreview state={state} kind="expense" />
            <Autocomplete
              fullWidth
              autoHighlight
              sx={{ mb: "1rem" }}
              options={activeCategories(state.categories, state.expense?.category_id)}
              value={activeCategories(state.categories, state.expense?.category_id).find(category => category.id === state.expense?.category_id) ?? null}
              onChange={(_, category) => selectCategory(category ? category.id : 0)}
              getOptionLabel={category => `${category.alias ?? ""} ${category.name}`.trim()}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, { inputValue }) => filterCategories(options, inputValue)}
              noOptionsText="No categories"
              renderInput={params => <TextField
                {...params}
                label="Category"
                placeholder="Search a category"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: <>
                      <InputAdornment sx={{ mr: 1 }}>
                        <CategoryTwoTone />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  },
                }}
              />}
            />
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