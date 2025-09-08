import { api_url } from "@/env"
import { formatDate, formatNumber } from "@/utils/functions"
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

function ShownItem({ categories, setState, item, index, source, offset = 0, target = "expenses", className = null, openModal = () => null }) {
  function destroy(dsource, index) {
    if (!confirm("Delete?")) {
      return
    }

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/expenses/${dsource[target][index - offset].id}`,
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
      <TableCell className={className}>{formatNumber(monthlyAmount(item) ?? "-", "$")}</TableCell>
      <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
      <TableCell className={className}>{item?.description ?? "-"}</TableCell>
      <TableCell className={className}>
        <ButtonGroup size="small">
          <Button variant="contained" color="warning" onClick={() => openModal({ ...item, source_id: source.id })}>✎</Button>
          <Button variant="contained" color="error" onClick={() => destroy(source, index)}>⌫</Button>
        </ButtonGroup>
      </TableCell>
    </>
  )
}

function SimpleItem({ categories, className, item }) {
  return (
    <>
      <TableCell className={className}>{formatDate(item?.date)}</TableCell>
      <TableCell className={className}>{formatNumber(monthlyAmount(item) ?? "-", "$")}</TableCell>
      <TableCell className={className}>{categories[item?.category_id] ?? "-"}</TableCell>
      <TableCell className={className}>{item?.description ?? "-"}</TableCell>
    </>
  )
}

let aux = null

export function ExpenseItem({ index, offset, state, setState, openModal, categories }) {
  return (
    <TableRow>
      {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(
        source => state.simple ?
          // <TableCell className={`simple ${index >= offset ? "instalment" : ""}`}>
          //   {aux = (source.expenses?.[index]?.description ?? source.instalments?.[index - offset]?.description)}{aux ? " - " : ""}{formatNumber(source.expenses?.[index]?.amount?.toFixed(2) ?? monthlyAmount(source.instalments?.[index - offset]) ?? "-", "$")}
          // </TableCell> :
          <SimpleItem categories={categories} className={`simple ${index >= offset ? "instalment" : ""}`} item={source.expenses?.[index] || source.instalments?.[index - offset]} /> :
          (
            source.expenses?.[index] ?
              <ShownItem categories={categories} state={state} index={index} setState={setState} source={source} item={source.expenses[index]} openModal={openModal} />
            : source.instalments?.[index - offset] ?
              <ShownItem categories={categories} state={state} index={index} setState={setState} source={source} openModal={openModal} className="instalment" offset={offset} target={"instalments"} item={source.instalments[index - offset]} />
            : <>
              {Array(5).fill(null).map((_, i) => <TableCell className={index >= offset ? "instalment" : ""}>-</TableCell>)}
            </>
          )
        )}
    </TableRow>
  )
}