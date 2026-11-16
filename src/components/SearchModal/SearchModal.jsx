/* eslint-disable react/prop-types -- the project has no PropTypes; `state` is the one big object of MainView */
import { api_url } from "@/env"
import { DateRangeField } from "@/components/ViewBar/DateRangeField"
import { TYPE_COLORS, TypeChips } from "@/components/ViewBar/TypeChips"
import { FILTER_TYPES, currencySymbol, filterCategories, formatDate, numberFormat, periodText } from "@/utils/functions"
import { Autocomplete, Box, Button, Card, CardActions, CardContent, CardHeader, InputAdornment, TextField, Typography } from "@mui/material"
import axios from "axios"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** What a typed amount means: a number, or nothing while it is empty or not one. */
function parseAmount(text) {
  return /^\d+(\.\d+)?$/.test(text.trim()) ? text.trim() : null
}

/** The colour of the left edge of a row: the one of its type (the expenses are the grey of the `In full` chip). */
function edge(row) {
  const key = row.type === "income" ? "incomes" : row.type === "transfer" ? "transfers" : row.instalments ? "instalments" : "expenses"

  return TYPE_COLORS[key] === "transparent" ? "#c0c0c0" : TYPE_COLORS[key]
}

function ResultRow({ row, onGo }) {
  const symbol = currencySymbol(row.currency)
  const details = row.type === "transfer"
    ? [formatDate(row.date), `${row.source_name} → ${row.to_source_name}`]
    : [
      formatDate(row.date),
      // Only the alias of the category (its name when it has none).
      row.category_name ? (row.category_alias || row.category_name) : null,
      row.source_name,
    ].filter(Boolean)

  return <Box
    component="button"
    type="button"
    onClick={() => onGo(row)}
    sx={{
      display: "block", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit",
      background: "transparent", border: "none", borderLeft: `4px solid ${edge(row)}`, borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
      px: "0.75rem", py: ".5rem", "&:hover": { background: "rgba(0, 0, 0, 0.04)" },
    }}
  >
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>{row.description ?? "-"}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>{numberFormat(row.amount, 2, symbol)}</Typography>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{details.join(" · ")}</Typography>
    {row.instalments && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {row.instalments} MSI of {numberFormat(row.monthly_share, 2, symbol)} · {periodText(row.period, row.period_last, MONTHS)}
    </Typography>}
  </Box>
}

/** The panel: it is only mounted while the modal is open, so it starts from the text typed in the bar of the month. */
function SearchPanel({ state, setState, goToRecord }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    q: state.filters?.text ?? "",
    types: Object.fromEntries(FILTER_TYPES.map(type => [type.key, true])),
    category: null,
    min: "",
    max: "",
    from: "",
    to: "",
  })
  const [result, setResult] = useState({ rows: [], page: 0, lastPage: 1, total: 0, loading: true, error: null })

  const params = useMemo(() => {
    const on = FILTER_TYPES.filter(type => form.types[type.key]).map(type => type.key)

    if (on.length === 0) {
      return null
    }

    return {
      ...(form.q.trim() ? { q: form.q.trim() } : {}),
      ...(on.length < FILTER_TYPES.length ? { type: on.join(",") } : {}),
      ...(form.category ? { category_id: form.category.id } : {}),
      ...(parseAmount(form.min) ? { min: parseAmount(form.min) } : {}),
      ...(parseAmount(form.max) ? { max: parseAmount(form.max) } : {}),
      ...(form.from ? { from: form.from } : {}),
      ...(form.to ? { to: form.to } : {}),
    }
  }, [form])
  // Nothing is asked until something is filled in (a word, a type that is off, a category, an amount or dates).
  const filled = params !== null && Object.keys(params).length > 0
  const key = JSON.stringify(params)

  function fetchPage(page, append) {
    return axios.get(`${api_url}/search`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, params: { ...params, page } })
      .then(res => setResult(prev => ({
        rows: append ? [...prev.rows, ...res.data.data] : res.data.data,
        page: res.data.page,
        lastPage: res.data.last_page,
        total: res.data.total,
        loading: false,
        error: null,
      })))
      .catch(err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem("token")
          navigate("/login")
          return
        }

        // An API without `/search` (or any error): the search says so and the rest of the page keeps working.
        setResult(prev => ({ ...prev, loading: false, error: err?.response?.status === 404 ? "The search is not available on this server." : "The search failed." }))
      })
  }

  // Ask a moment after the last change, and again from the first page when a filter changes.
  useEffect(() => {
    if (!filled) {
      setResult({ rows: [], page: 0, lastPage: 1, total: 0, loading: false, error: null })
      return
    }

    setResult(prev => ({ ...prev, loading: true, error: null }))

    const timer = setTimeout(() => fetchPage(1, false), 350)

    return () => clearTimeout(timer)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- `key` is everything that is asked

  function close() {
    setState(prev => ({ ...prev, searchModal: false }))
  }

  const groups = []

  for (const row of result.rows) {
    if (groups.at(-1)?.period !== row.period) {
      groups.push({ period: row.period, rows: [] })
    }

    groups.at(-1).rows.push(row)
  }

  return <div className="expenses-modal show" onClick={close}>
    <Card elevation={5} sx={{ borderRadius: "1rem", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
      <CardHeader title="Search all months" />
      {/* The controls stay in view and only the results scroll (`min-height` keeps a few rows on a small screen, where the whole card scrolls). */}
      <CardContent sx={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
        <TextField
          size="small"
          fullWidth
          autoFocus
          placeholder="Search"
          value={form.q}
          onChange={e => setForm(prev => ({ ...prev, q: e.target.value }))}
          sx={{ mb: "1rem" }}
        />
        <Box sx={{ mb: "1rem" }}>
          <Typography variant="caption" color="text.secondary">Type</Typography>
          <TypeChips types={form.types} onChange={types => setForm(prev => ({ ...prev, types }))} />
        </Box>
        <Autocomplete
          size="small"
          options={state.categories}
          value={form.category}
          onChange={(_, category) => setForm(prev => ({ ...prev, category }))}
          getOptionLabel={category => `${category.alias ? `${category.alias} ` : ""}${category.name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) => filterCategories(options, inputValue)}
          renderInput={params => <TextField {...params} label="Category" />}
          sx={{ mb: "1rem" }}
        />
        <Box sx={{ display: "flex", gap: ".5rem", mb: "1rem" }}>
          {["min", "max"].map(field => <TextField
            key={field}
            size="small"
            label={field === "min" ? "Min" : "Max"}
            value={form[field]}
            onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value.replace(/[^\d.]/g, "") }))}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { inputMode: "decimal" },
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
          />)}
        </Box>
        <Box sx={{ mb: "1rem" }}>
          <DateRangeField from={form.from} to={form.to} onChange={(from, to) => setForm(prev => ({ ...prev, from, to }))} />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: ".5rem" }}>
          {result.error ?? (!filled ? "Type something or choose a filter to search." : result.loading ? "Searching..." : `${result.total} ${result.total === 1 ? "result" : "results"}`)}
        </Typography>

        <Box sx={{ flex: "1 1 auto", minHeight: "12rem", overflowY: "auto" }}>
          {groups.map(group => <Fragment key={group.period}>
            <Typography variant="subtitle2" sx={{ mt: ".75rem", mb: ".25rem" }}>{periodText(group.period, null, MONTHS)}</Typography>
            {group.rows.map(row => <ResultRow key={`${row.type}-${row.id}`} row={row} onGo={goToRecord} />)}
          </Fragment>)}

          {result.page > 0 && result.page < result.lastPage && <Button size="small" sx={{ mt: ".75rem" }} onClick={() => fetchPage(result.page + 1, true)} disabled={result.loading}>
            Load more ({result.rows.length} of {result.total})
          </Button>}
        </Box>
      </CardContent>
      <CardActions sx={{ p: "1rem" }}>
        <Button color="error" type="button" variant="contained" onClick={close}>Close</Button>
      </CardActions>
    </Card>
  </div>
}

/** The search over all the months, from the bar of the month: results by month, newest first; touching one goes to its month and highlights it. */
export function SearchModal({ state, setState, goToRecord }) {
  return state.searchModal && <SearchPanel state={state} setState={setState} goToRecord={goToRecord} />
}
