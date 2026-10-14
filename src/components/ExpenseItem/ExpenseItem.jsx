import { api_url } from "@/env"
import { currencySymbol, formatDate, monthlyShare, numberFormat, visibleSources } from "@/utils/functions"
import { Button, ButtonGroup, TableCell, TableRow } from "@mui/material"
import axios from "axios"
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

const RESOURCES = { incomes: "incomes", transfers: "transfers", expenses: "expenses", instalments: "expenses" }

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

  function destroy() {
    if (!confirm("Delete?")) {
      return
    }

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/${RESOURCES[target]}/${item.id}`,
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
      <TableCell className={className}>{formatDate(item?.date)}</TableCell>
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
      </TableCell>
    </>
  )
}

function SimpleItem({ categories, className, item, source, target = "expenses" }) {
  return (
    <>
      <TableCell className={className}>{formatDate(item?.date)}</TableCell>
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
  const groups = ["expenses", "instalments", "transfers", "incomes"]
  let position = index
  let group = groups[0]

  for (const name of groups) {
    group = name

    if (position < rows[name]) break

    position -= rows[name]
  }

  const className = { incomes: "income", transfers: "transfer", expenses: null, instalments: "instalment" }[group]
  const open = { incomes: openIncomeModal, transfers: openTransferModal, expenses: openModal, instalments: openModal }[group]

  return (
    <TableRow key={`row_${index}`}>
      {visibleSources(state).map((source, idx) => {
        const item = source[group]?.[position]

        if (state.simple) return <SimpleItem
          key={`r${index}c${idx}`}
          categories={categories}
          className={`simple ${className ?? ""}`}
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
          className={className}
          item={item}
          openModal={open}
        />

        return Array(5).fill(null).map((_, i) => <TableCell key={`r${index}esp_${i}`} className={className}>-</TableCell>)
      })}
    </TableRow>
  )
}
