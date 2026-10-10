import { api_url } from "@/env"
import { formatDate, numberFormat } from "@/utils/functions"
import { Button, ButtonGroup, CardActions, CardContent, CardHeader, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import axios from "axios"
import { useNavigate } from "react-router-dom"

export function IncomesSection({ state, setState, openIncomeModal }) {
  const navigate = useNavigate()
  const total = state.sources.reduce((a, b) => a + b.incomes.reduce((c, d) => c + d.amount, 0), 0)

  function destroy(income) {
    if (!confirm("Delete?")) {
      return
    }

    setState(prev => ({
      ...prev,
      loading: true,
    }))

    axios.delete(
      `${api_url}/incomes/${income.id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
    .then(() => window.location.reload())
    .catch(err => {
      setState(prev => ({ ...prev, loading: false }))

      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
      }
    })
  }

  return <>
    <CardHeader subheader={`Income: ${numberFormat(total, 2, "$")}`} />
    <CardActions sx={{ p: "1rem", pt: 0 }}>
      <Button size="small" color="success" variant="contained" onClick={() => openIncomeModal()}>Add</Button>
    </CardActions>
    <CardContent sx={{ pt: 0 }}>
      {state.sources.map(source => source.incomes_count > 0 && <div key={`incomes_${source.id}`}>
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          {source.name} · {numberFormat(source.incomes.reduce((a, b) => a + b.amount, 0), 2, "$")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Description</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {source.incomes.map(income => <TableRow key={`income_${income.id}`}>
              <TableCell>{formatDate(income.date)}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{numberFormat(income.amount, 2, "$")}</TableCell>
              <TableCell>{income.description ?? "-"}</TableCell>
              <TableCell>
                <ButtonGroup size="small">
                  <Button variant="contained" color="warning" onClick={() => openIncomeModal({ ...income, source_id: source.id })}>✎</Button>
                  <Button variant="contained" color="error" onClick={() => destroy(income)}>⌫</Button>
                </ButtonGroup>
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>)}
    </CardContent>
  </>
}
