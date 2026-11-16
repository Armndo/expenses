import { api_url } from "@/env"
import { canCut, currencySymbol, deleteQuery, formatDate, monthlyShare, numberFormat, visibleSources } from "@/utils/functions"
import { Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, TableCell, TableRow, Typography } from "@mui/material"
import axios from "axios"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

function monthlyAmount(instalment) {
  if (!instalment) {
    return null
  }

  // A transfer shows what it means for this source: negative when it leaves, positive when it arrives.
  if (instalment.signed_amount !== undefined) {
    return instalment.signed_amount.toFixed(2)
  }

  return monthlyShare(instalment).toFixed(2)
}

const RESOURCES = { incomes: "incomes", transfers: "transfers", expenses: "expenses", recurring: "expenses", instalments: "expenses" }

/** A transfer shows an arrow (out or in) and its description; the other account is not shown. */
function describe(item, target) {
  if (target !== "transfers") {
    return item?.description ?? "-"
  }

  const arrow = item.direction === "out" ? "→" : "←"

  // A non-breaking space keeps the arrow with the first word of the description.
  return item.description ? `${arrow}\u00A0${item.description}` : arrow
}

function ShownItem({ categories, setState, item, source, target = "expenses", className = null, openModal = () => null }) {
  const navigate = useNavigate()

  // A recurring expense is one rule: on a charge after the first one it asks whether to end the rule from there or to delete all of it
  // (the past charges too); the first charge has nothing before it to keep, so it only asks to delete the rule. The API asks for the scope.
  const recurring = target === "recurring"
  const [asking, setAsking] = useState(false)
  const [scope, setScope] = useState("following")

  function destroy() {
    if (recurring && canCut(item)) {
      setScope("following")
      setAsking(true)
      return
    }

    if (!confirm(recurring ? "Delete this recurring expense and all its charges?" : "Delete?")) {
      return
    }

    remove(recurring ? "?scope=all" : "")
  }

  function remove(query) {
    setAsking(false)
    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/${RESOURCES[target]}/${item.id}${query}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => {
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

  return (
    <>
      <TableCell className={className}>{formatDate(item?.occurrence_date ?? item?.date)}</TableCell>
      <TableCell className={className} sx={{ whiteSpace: "nowrap" }}>{numberFormat(monthlyAmount(item) ?? "-", 2, currencySymbol(source.currency))}</TableCell>
      {/* Incomes and transfers have no category: the description takes its column too. */}
      {target === "incomes" || target === "transfers" ?
        <TableCell className={className} colSpan={2}>{describe(item, target)}</TableCell> :
        <>
          <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
          <TableCell className={className}>{item?.description ?? "-"}</TableCell>
        </>
      }
      <TableCell className={className}>
        <ButtonGroup size="small">
          <Button variant="contained" color="warning" onClick={() => openModal(target === "transfers" ? item : { ...item, source_id: source.id })}>✎</Button>
          <Button variant="contained" color="error" onClick={destroy}>⌫</Button>
        </ButtonGroup>
        {asking && <Dialog open onClose={() => setAsking(false)}>
          <DialogTitle>Delete recurring expense</DialogTitle>
          <DialogContent>
            <RadioGroup value={scope} onChange={e => setScope(e.target.value)}>
              <FormControlLabel value="following" control={<Radio size="small" />} label={<>
                This and following charges <Typography component="span" variant="caption" color="text.secondary">stops charging from {formatDate(item.occurrence_date)}, the earlier ones stay</Typography>
              </>} />
              <FormControlLabel value="all" control={<Radio size="small" />} label={<>
                The whole rule <Typography component="span" variant="caption" color="text.secondary">deletes it with all its charges, the past ones too</Typography>
              </>} />
            </RadioGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={() => remove(deleteQuery(item, scope))}>Delete</Button>
          </DialogActions>
        </Dialog>}
      </TableCell>
    </>
  )
}

function SimpleItem({ categories, className, item, source, target = "expenses" }) {
  return (
    <>
      <TableCell className={className}>{formatDate(item?.occurrence_date ?? item?.date)}</TableCell>
      <TableCell className={className} sx={{ whiteSpace: "nowrap" }}>{numberFormat(monthlyAmount(item) ?? "-", 2, currencySymbol(source.currency))}</TableCell>
      {target === "incomes" || target === "transfers" ?
        <TableCell className={className} colSpan={2}>{item ? describe(item, target) : "-"}</TableCell> :
        <>
          <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
          <TableCell className={className}>{item?.description ?? "-"}</TableCell>
        </>
      }
    </>
  )
}

/** Rows go cash expenses, instalments, transfers and incomes; `rows` has the height of each group. */
export function ExpenseItem({ index, rows, state, setState, openModal, openIncomeModal, openTransferModal, categories }) {
  const groups = ["expenses", "recurring", "instalments", "transfers", "incomes"]
  let position = index
  let group = groups[0]

  for (const name of groups) {
    group = name

    if (position < rows[name]) break

    position -= rows[name]
  }

  const className = { incomes: "income", transfers: "transfer", expenses: null, recurring: "recurring", instalments: "instalment" }[group]
  // The record the search went to: its cells are marked for a moment (`td.highlight`).
  const type = { incomes: "income", transfers: "transfer", expenses: "expense", recurring: "expense", instalments: "expense" }[group]
  const marked = item => !!item && state.highlight?.type === type && state.highlight?.id === item.id
  const open = { incomes: openIncomeModal, transfers: openTransferModal, expenses: openModal, recurring: openModal, instalments: openModal }[group]

  return (
    <TableRow key={`row_${index}`}>
      {visibleSources(state).map((source, idx) => {
        const item = source[group]?.[position]

        if (state.simple) return <SimpleItem
          key={`r${index}c${idx}`}
          categories={categories}
          className={`simple ${className ?? ""}${marked(item) ? " highlight" : ""}`}
          target={group}
          item={item}
          source={source}
        />

        if (item) return <ShownItem
          key={`r${index}c${idx}`}
          categories={categories}
          setState={setState}
          source={source}
          target={group}
          className={marked(item) ? `${className ?? ""} highlight` : className}
          item={item}
          openModal={open}
        />

        return Array(5).fill(null).map((_, i) => <TableCell key={`r${index}esp_${i}`} className={className}>-</TableCell>)
      })}
    </TableRow>
  )
}
