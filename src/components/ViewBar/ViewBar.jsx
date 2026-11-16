/* eslint-disable react/prop-types -- the project has no PropTypes; `state` is the one big object of MainView */
import { FILTER_TYPES, SORT_OPTIONS, activeFilterCount, emptyFilters, filterBounds, filterCategories, filterCounts, filterSources, hasFilters, numberFormat, saveTypes } from "@/utils/functions"
import { Clear, FilterList, Search, Sort } from "@mui/icons-material"
import { Autocomplete, Badge, Box, Button, IconButton, InputAdornment, MenuItem, Popover, Select, TextField, Typography } from "@mui/material"
import { useMemo, useState } from "react"
import { TypeChips } from "./TypeChips"

const FIELD = { height: 30, fontSize: ".8125rem" }

/**
 * The bar above the table: a live search, the filters of the month in a panel and the order of the rows, with how many records and
 * sources are left. Everything works on what `GET /data` already sent (the totals of the month do not change).
 */
export function ViewBar({ state, setState, changeSort }) {
  const [anchor, setAnchor] = useState(null)
  const filters = state.filters
  const bounds = useMemo(() => filterBounds(state.sources, state.rates), [state.sources, state.rates])
  const counts = useMemo(
    () => filterCounts(state.sources, filterSources(state.sources, filters, { categories: state.categories, rates: state.rates })),
    [state.sources, state.categories, state.rates, filters],
  )
  const active = activeFilterCount(filters)
  // What is typed in the amount fields, so "1." or "" survive while the number it means is the filter.
  const [typed, setTyped] = useState({ min: "", max: "" })
  const amountText = key => {
    const value = filters[key]

    return (typed[key] === "" && value === null) || (typed[key] !== "" && Number(typed[key]) === value) ? typed[key] : value === null ? "" : String(value)
  }

  function change(patch) {
    const next = { ...filters, ...patch }

    if (patch.types) {
      saveTypes(patch.types)
    }

    setState(prev => ({ ...prev, filters: next }))
  }

  function clear() {
    const next = emptyFilters(Object.fromEntries(FILTER_TYPES.map(type => [type.key, true])))

    saveTypes(next.types)
    setState(prev => ({ ...prev, filters: next }))
  }

  function changeAmount(key, text) {
    const clean = text.replace(/[^\d.]/g, "")
    const number = clean === "" || clean === "." ? null : Number(clean)

    setTyped(prev => ({ ...prev, [key]: clean }))
    change({ [key]: number })
  }

  return <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".5rem", px: "1rem", pb: "1rem" }}>
    <TextField
      size="small"
      placeholder="Search"
      value={filters.text}
      onChange={e => change({ text: e.target.value })}
      disabled={state.editing}
      slotProps={{
        htmlInput: { "aria-label": "Search the records of the month" },
        input: {
          startAdornment: <Search fontSize="small" sx={{ mr: .5, color: "text.secondary" }} />,
          endAdornment: filters.text !== "" && <IconButton size="small" aria-label="Clear the search" onClick={() => change({ text: "" })}><Clear fontSize="small" /></IconButton>,
        },
      }}
      sx={{ flex: { xs: "1 1 100%", sm: "0 1 260px" }, "& .MuiInputBase-root": FIELD }}
    />
    <Badge badgeContent={active} color="primary">
      <Button size="small" variant="outlined" startIcon={<FilterList />} sx={{ height: 30 }} onClick={e => setAnchor(e.currentTarget)} disabled={state.editing}>Filters</Button>
    </Badge>
    <Select
      size="small"
      value={state.sort}
      onChange={e => changeSort(e.target.value)}
      disabled={state.editing}
      inputProps={{ "aria-label": "Sort the rows" }}
      startAdornment={<Sort fontSize="small" sx={{ mr: .5 }} />}
      sx={{ ...FIELD, minWidth: { xs: 0, sm: 190 } }}
    >
      {SORT_OPTIONS.map(option => <MenuItem dense key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </Select>
    <Button size="small" variant="outlined" startIcon={<Search />} sx={{ height: 30 }} onClick={() => setState(prev => ({ ...prev, searchModal: true }))} disabled={state.editing}>
      Global
    </Button>
    {hasFilters(filters) && <Typography variant="body2" sx={{ color: "text.secondary", ml: { sm: "auto" } }}>
      {counts.records} of {counts.totalRecords} records · {counts.sources} of {counts.totalSources} sources
    </Typography>}

    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ p: "1rem", width: "min(92vw, 360px)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Type</Typography>
          <TypeChips types={filters.types} onChange={types => change({ types })} />
        </Box>

        <Autocomplete
          multiple
          size="small"
          options={state.categories}
          value={state.categories.filter(category => filters.categories.includes(category.id))}
          onChange={(_, value) => change({ categories: value.map(category => category.id) })}
          getOptionLabel={category => `${category.alias ? `${category.alias} ` : ""}${category.name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) => filterCategories(options, inputValue)}
          renderInput={params => <TextField {...params} label="Categories" helperText={filters.categories.length > 0 ? "Incomes and transfers have no category." : undefined} />}
        />

        <Box>
          <Typography variant="caption" color="text.secondary">Amount in pesos, of expenses and instalments</Typography>
          <Box sx={{ display: "flex", gap: ".5rem", mt: ".25rem" }}>
            {["min", "max"].map(key => <TextField
              key={key}
              size="small"
              label={key === "min" ? "Min" : "Max"}
              value={amountText(key)}
              onChange={e => changeAmount(key, e.target.value)}
              placeholder={bounds[key] === null ? "" : numberFormat(bounds[key], 0, "")}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { inputMode: "decimal" },
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
              }}
            />)}
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">{counts.records} of {counts.totalRecords} records</Typography>
          <Button size="small" onClick={clear} disabled={!hasFilters(filters)}>Clear</Button>
        </Box>
      </Box>
    </Popover>
  </Box>
}
