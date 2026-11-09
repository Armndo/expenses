import { api_url } from "@/env"
import { isCard, kindLabel, numberFormat, SPLIT_COLORS } from "@/utils/functions"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Chip, MenuItem, Select, TextField, Typography } from "@mui/material"
import axios from "axios"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

// Light indigo, the colour of the exchange rate chip of the main view.
const RATE_BG = "#9fa8da"

const CURRENCIES = ["MXN", "USD"]
const NAME_MAX = 50

/** A button that is on (contained) or off (outlined), like the toggles of the Overview. */
function Toggle({ label, selected, onClick, disabled = false }) {
  return <Button size="small" variant={selected ? "contained" : "outlined"} onClick={onClick} disabled={disabled}>{label}</Button>
}

/** Whether `name` is taken by another of `items` (a trimmed, case-insensitive match, ignoring the one being edited). */
function nameTaken(items, name, currentId) {
  return items.some(item => item.id !== currentId && item.name.trim().toLowerCase() === name.trim().toLowerCase())
}

/** An integer written in a text field, or `null` when it is empty or not a whole number. */
function whole(value) {
  return /^\d+$/.test(`${value ?? ""}`.trim()) ? +value : null
}

/**
 * Creates, edits, disables and enables sources and categories. Nothing is ever deleted: a disabled one is hidden from the
 * pickers and takes no new movements, but it keeps showing in the months where it has movements and its money still counts.
 * `state.sources` and `state.categories` come from `GET /data`; after a change `reload` fetches them again and the modal
 * stays open so several can be changed in a row.
 */
export function ManageModal({ state, setState, reload }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState("sources")
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  function closeModal() {
    setForm(null)
    setState(prev => ({ ...prev, manageModal: false }))
  }

  /** Sends a request, reloads the data on success and handles the expired session like the rest of the app. */
  function send(request) {
    setSaving(true)

    request
    .then(() => {
      setForm(null)
      reload()
    })
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
        return
      }

      alert("The change could not be saved. Check the name is not repeated and the values are valid.")
    })
    .finally(() => setSaving(false))
  }

  const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })

  // ---- sources
  function newSource() {
    setForm({ type: "source", name: "", credit: false, cutoff: "", currency: "MXN" })
  }

  function editSource(source) {
    setForm({ type: "source", id: source.id, name: source.name, credit: isCard(source), cutoff: source.cutoff ?? "", currency: source.currency, hasMovements: source.has_movements, original: source })
  }

  function saveSource() {
    const name = form.name.trim()
    const cutoff = form.credit ? whole(form.cutoff) : null

    if (name === "" || name.length > NAME_MAX) {
      alert(`The name is required and has up to ${NAME_MAX} characters.`)
      return
    }

    if (nameTaken(state.sources, name, form.id)) {
      alert("There is already a source with that name (the disabled ones count: enable it instead).")
      return
    }

    if (form.credit && (cutoff === null || cutoff > 27)) {
      alert("The cutoff is a whole number from 0 to 27 (0 bills by calendar month).")
      return
    }

    if (!form.id) {
      send(axios.post(`${api_url}/sources`, { name, cutoff, currency: form.currency }, config()))
      return
    }

    const original = form.original
    const body = {}

    if (name !== original.name) body.name = name
    if (cutoff !== original.cutoff) body.cutoff = cutoff
    if (form.currency !== original.currency) body.currency = form.currency

    if (Object.keys(body).length === 0) {
      setForm(null)
      return
    }

    // Changing the cutoff of a card, or the currency, rewrites how its past months are counted.
    if (form.hasMovements && "cutoff" in body && body.cutoff !== null && original.cutoff !== null
      && !confirm(`Changing the cutoff of ${original.name} from ${original.cutoff} to ${body.cutoff} moves every past and future expense of this card to other periods: the balances, the debt and the budget carry of the past months will change. Continue?`)) {
      return
    }

    if (form.hasMovements && "currency" in body
      && !confirm(`Changing the currency of ${original.name} to ${body.currency} changes how all its history is converted to pesos. Continue?`)) {
      return
    }

    send(axios.put(`${api_url}/sources/${form.id}`, body, config()))
  }

  function toggleSource(source) {
    if (!source.disabled) {
      const enabled = state.sources.filter(item => !item.disabled)
      const accounts = enabled.filter(item => !isCard(item))

      if (enabled.length <= 1) {
        alert("At least one source has to stay enabled.")
        return
      }

      if (!isCard(source) && accounts.length <= 1) {
        alert("At least one debit account has to stay enabled: the incomes need one.")
        return
      }

      const owes = isCard(source) && source.balance < 0 ? ` It still owes ${numberFormat(-source.balance, 2, "$")}: enable it again to record its payments.` : ""

      if (!confirm(`Disable ${source.name}? It will be hidden from the pickers and will not take new movements. It keeps showing in the months where it has movements, and its money still counts in the balance and the budget.${owes}`)) {
        return
      }
    }

    send(axios.put(`${api_url}/sources/${source.id}`, { disabled: !source.disabled }, config()))
  }

  // ---- categories
  function newCategory() {
    setForm({ type: "category", name: "", alias: "", color: "#9e9e9e", order: "" })
  }

  function editCategory(category) {
    setForm({ type: "category", id: category.id, name: category.name, alias: category.alias ?? "", color: category.color ?? "#9e9e9e", order: category.order ?? "", original: category })
  }

  function saveCategory() {
    const name = form.name.trim()
    const order = `${form.order}`.trim() === "" ? null : whole(form.order)

    if (name === "" || name.length > NAME_MAX) {
      alert(`The name is required and has up to ${NAME_MAX} characters.`)
      return
    }

    if (nameTaken(state.categories, name, form.id)) {
      alert("There is already a category with that name (the disabled ones count: enable it instead).")
      return
    }

    if ([...form.alias].length > 8) {
      alert("The alias is an emoji or a few characters, up to 8.")
      return
    }

    if (`${form.order}`.trim() !== "" && (order === null || order > 255)) {
      alert("The order is a whole number from 0 to 255.")
      return
    }

    const body = { name, alias: form.alias.trim() === "" ? null : form.alias.trim(), color: form.color, order }

    if (!form.id) {
      send(axios.post(`${api_url}/categories`, body, config()))
      return
    }

    send(axios.put(`${api_url}/categories/${form.id}`, body, config()))
  }

  function toggleCategory(category) {
    if (!category.disabled && !confirm(`Disable ${category.name}? It will be hidden from the pickers and no new expense can use it. Its old expenses keep it and still add up.`)) {
      return
    }

    send(axios.put(`${api_url}/categories/${category.id}`, { disabled: !category.disabled }, config()))
  }

  // Name and chips on the left (the chips go under the name when there is no room), the buttons on the right in one line.
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", py: ".5rem", borderBottom: "1px solid #0000001f" }
  const info = { minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: ".25rem" }
  const chips = { display: "flex", flexWrap: "wrap", gap: ".25rem" }
  const actions = { flex: "none", display: "flex", gap: ".25rem" }

  function sourceList() {
    return <>
      {state.sources.map(source => <Box key={source.id} sx={row}>
        <Box sx={{ ...info, opacity: source.disabled ? 0.55 : 1 }}>
          <Typography sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>{source.name}</Typography>
          <Box sx={chips}>
            <Chip size="small" sx={{ background: isCard(source) ? SPLIT_COLORS.credit : SPLIT_COLORS.debit }} label={kindLabel(source)} />
            {isCard(source) && <Chip size="small" variant="outlined" label={`Cutoff ${source.cutoff}`} />}
            {source.currency !== "MXN" && <Chip size="small" sx={{ background: RATE_BG }} label={source.currency} />}
            {source.disabled && <Chip size="small" color="warning" label="Disabled" />}
          </Box>
        </Box>
        <Box sx={actions}>
          <Button size="small" variant="outlined" onClick={() => editSource(source)} disabled={saving || source.disabled}>Edit</Button>
          <Button size="small" variant="outlined" color={source.disabled ? "success" : "warning"} onClick={() => toggleSource(source)} disabled={saving}>{source.disabled ? "Enable" : "Disable"}</Button>
        </Box>
      </Box>)}
      {state.sources.length === 0 && <Typography>No sources yet.</Typography>}
    </>
  }

  function categoryList() {
    return <>
      {state.categories.map(category => <Box key={category.id} sx={row}>
        <Box sx={{ ...info, flexDirection: "row", alignItems: "center", gap: ".5rem", flexWrap: "nowrap", opacity: category.disabled ? 0.55 : 1 }}>
          {category.order != null && <Typography sx={{ flex: "none", minWidth: "2ch", textAlign: "right", color: "text.secondary" }}>{category.order}.</Typography>}
          <span style={{ width: 14, height: 14, borderRadius: 3, background: category.color ?? "#9e9e9e", flex: "none" }} />
          <Typography sx={{ fontWeight: 500, overflowWrap: "anywhere", minWidth: 0 }}>{category.alias} {category.name}</Typography>
          {category.disabled && <Chip size="small" color="warning" label="Disabled" />}
        </Box>
        <Box sx={actions}>
          <Button size="small" variant="outlined" onClick={() => editCategory(category)} disabled={saving || category.disabled}>Edit</Button>
          <Button size="small" variant="outlined" color={category.disabled ? "success" : "warning"} onClick={() => toggleCategory(category)} disabled={saving}>{category.disabled ? "Enable" : "Disable"}</Button>
        </Box>
      </Box>)}
      {state.categories.length === 0 && <Typography>No categories yet.</Typography>}
    </>
  }

  function sourceForm() {
    const kindLocked = Boolean(form.id) && form.hasMovements

    return <form onSubmit={e => { e.preventDefault(); saveSource() }}>
      <TextField
        required
        autoFocus
        sx={{ width: "100%", mb: "1rem" }}
        label="Name"
        value={form.name}
        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
        slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
      />
      <Box sx={{ mb: "1rem" }}>
        <Box sx={{ display: "flex", gap: ".5rem" }}>
          <Toggle label="Debit" selected={!form.credit} disabled={kindLocked} onClick={() => setForm(prev => ({ ...prev, credit: false }))} />
          <Toggle label="Credit" selected={form.credit} disabled={kindLocked} onClick={() => setForm(prev => ({ ...prev, credit: true, cutoff: prev.cutoff === "" ? 0 : prev.cutoff }))} />
        </Box>
        {kindLocked && <Typography variant="caption" color="text.secondary">The kind cannot change once the source has movements.</Typography>}
      </Box>
      {form.credit && <TextField
        required
        sx={{ width: "100%", mb: "1rem" }}
        label="Cutoff day"
        type="number"
        helperText="The day the statement closes, from 0 to 27. 0 bills by calendar month."
        value={form.cutoff}
        onChange={e => setForm(prev => ({ ...prev, cutoff: e.target.value }))}
        slotProps={{ htmlInput: { min: 0, max: 27, step: 1 } }}
      />}
      <Select
        sx={{ width: "100%" }}
        value={form.currency}
        onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
      >
        {CURRENCIES.map(currency => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
      </Select>
    </form>
  }

  function categoryForm() {
    return <form onSubmit={e => { e.preventDefault(); saveCategory() }}>
      <TextField
        required
        autoFocus
        sx={{ width: "100%", mb: "1rem" }}
        label="Name"
        value={form.name}
        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
        slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
      />
      <TextField
        sx={{ width: "100%", mb: "1rem" }}
        label="Alias"
        helperText="An emoji or a few characters, shown before the name."
        value={form.alias}
        onChange={e => setForm(prev => ({ ...prev, alias: e.target.value }))}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: ".75rem", mb: "1rem" }}>
        <Typography>Colour</Typography>
        <input type="color" value={form.color} onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))} style={{ width: 48, height: 32, border: 0, padding: 0, background: "none", cursor: "pointer" }} />
        <Typography variant="caption" color="text.secondary">{form.color}</Typography>
      </Box>
      <TextField
        sx={{ width: "100%" }}
        label="Order"
        type="number"
        helperText="Where it goes in the lists (0 to 255); the lower ones come first."
        value={form.order}
        onChange={e => setForm(prev => ({ ...prev, order: e.target.value }))}
        slotProps={{ htmlInput: { min: 0, max: 255, step: 1 } }}
      />
    </form>
  }

  return (
    state.manageModal && <div className="expenses-modal show" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem", width: "min(92vw, 560px)", height: "min(540px, calc(100dvh - 2rem))", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <CardHeader title={form ? `${form.id ? "Edit" : "New"} ${form.type}` : "Manage"} sx={{ flex: "none" }} />
        {!form && <Box sx={{ px: "1rem", pb: ".5rem", display: "flex", gap: ".5rem", flex: "none" }}>
          <Toggle label="Sources" selected={tab === "sources"} onClick={() => setTab("sources")} />
          <Toggle label="Categories" selected={tab === "categories"} onClick={() => setTab("categories")} />
        </Box>}
        <CardContent sx={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {form ? (form.type === "source" ? sourceForm() : categoryForm()) : (tab === "sources" ? sourceList() : categoryList())}
        </CardContent>
        <CardActions sx={{ p: "1rem", flex: "none" }}>
          {form
            ? <>
              <Button color="success" type="button" variant="contained" onClick={form.type === "source" ? saveSource : saveCategory} disabled={saving}>{form.id ? "update" : "save"}</Button>
              <Button color="error" type="button" variant="contained" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            </>
            : <>
              <Button color="success" type="button" variant="contained" onClick={tab === "sources" ? newSource : newCategory}>{tab === "sources" ? "New source" : "New category"}</Button>
              <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
            </>}
        </CardActions>
      </Card>
    </div>
  )
}
