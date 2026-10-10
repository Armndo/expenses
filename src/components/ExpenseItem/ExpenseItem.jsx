import { api_url } from "@/env"
import { formatDate, numberFormat, visibleSources } from "@/utils/functions"
import { Button, ButtonGroup, TableCell, TableRow } from "@mui/material"
import axios from "axios"

function monthlyAmount(instalment) {
  if (!instalment) {
    return null
  }

  if (!instalment.instalments) {
    return instalment.amount.toFixed(2)
  }

  return (instalment.amount / instalment.instalments).toFixed(2)
}

function ShownItem({ categories, setState, item, source, target = "expenses", className = null, openModal = () => null }) {
  function destroy() {
    if (!confirm("Delete?")) {
      return
    }

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/${target === "incomes" ? "incomes" : "expenses"}/${item.id}`,
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
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  return (
    <>
      <TableCell className={className}>{formatDate(item?.date)}</TableCell>
      <TableCell className={className} sx={{ whiteSpace: "nowrap" }}>{numberFormat(monthlyAmount(item) ?? "-", 2, "$")}</TableCell>
      {/* Incomes have no category: the description takes its column too. */}
      {target === "incomes" ?
        <TableCell className={className} colSpan={2}>{item?.description ?? "-"}</TableCell> :
        <>
          <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
          <TableCell className={className}>{item?.description ?? "-"}</TableCell>
        </>
      }
      <TableCell className={className}>
        <ButtonGroup size="small">
          <Button variant="contained" color="warning" onClick={() => openModal({ ...item, source_id: source.id })}>✎</Button>
          <Button variant="contained" color="error" onClick={destroy}>⌫</Button>
        </ButtonGroup>
      </TableCell>
    </>
  )
}

function SimpleItem({ categories, className, item, target = "expenses" }) {
  return (
    <>
      <TableCell className={className}>{formatDate(item?.date)}</TableCell>
      <TableCell className={className} sx={{ whiteSpace: "nowrap" }}>{numberFormat(monthlyAmount(item) ?? "-", 2, "$")}</TableCell>
      {target === "incomes" ?
        <TableCell className={className} colSpan={2}>{item?.description ?? "-"}</TableCell> :
        <>
          <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
          <TableCell className={className}>{item?.description ?? "-"}</TableCell>
        </>
      }
    </>
  )
}

/** Rows go incomes first, then cash expenses, then instalments; `rows` has the height of each group. */
export function ExpenseItem({ index, rows, state, setState, openModal, openIncomeModal, categories }) {
  const group = index < rows.incomes ? "incomes" : index < rows.incomes + rows.expenses ? "expenses" : "instalments"
  const position = index - (group === "incomes" ? 0 : rows.incomes + (group === "expenses" ? 0 : rows.expenses))
  const className = group === "incomes" ? "income" : group === "instalments" ? "instalment" : null

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
        />

        if (item) return <ShownItem
          key={`r${index}c${idx}`}
          categories={categories}
          setState={setState}
          source={source}
          target={group}
          className={className}
          item={item}
          openModal={group === "incomes" ? openIncomeModal : openModal}
        />

        return Array(5).fill(null).map((_, i) => <TableCell key={`r${index}esp_${i}`} className={className}>-</TableCell>)
      })}
    </TableRow>
  )
}
