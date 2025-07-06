import { ExpenseItem } from "@/components"
import { formatNumber } from "@/utils/functions"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material"

export function ExpensesTable({ state, setState, openModal }) {
  return (
    state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).length > 0 ?
    <TableContainer sx={{ maxHeight: "80vh" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => (
              <TableCell
                colSpan={state.simple ? 1 : 4}
                align="center"
                sx={{ zIndex: 1 }}
              >
                <div>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: "bold", }}>{source.name}</Typography>
                  <Typography sx={{ fontSize: ".75rem", fontStyle: "italic" }}>
                    Contado: {formatNumber(source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2), "$")}
                  </Typography>
                  <Typography sx={{ fontSize: ".75rem", fontStyle: "italic" }}>
                    Mensualidades: {formatNumber(source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0).toFixed(2), "$")}
                  </Typography>
                  <Typography sx={{ fontSize: ".75rem", fontStyle: "italic" }}>
                    Total: {formatNumber((source.expenses.reduce((a, b) => a + b.amount, 0) + source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0)).toFixed(2), "$")}
                  </Typography>
                </div>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array(state.sources.reduce((a, b) => b.expenses_count > a ? b.expenses_count : a, 0) + state.sources.reduce((a, b) => b.instalments_count > a ? b.instalments_count : a, 0)).fill(state.sources.reduce((a, b) => b.expenses_count > a ? b.expenses_count : a, 0)).map((offset, index) => 
            <ExpenseItem
              index={index}
              offset={offset}
              state={state}
              setState={setState}
              openModal={openModal}
            />
          )}
        </TableBody>
        {/* <TableFooter>
          {state.sources.filter(source => source.expenses.length > 0).length > 0 && <TableRow>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <TableCell sx={{ textAlign: "center", fontSize: ".875rem", fontWeight: "bold" }} colSpan={state.simple ? 1 : 4}>
              {formatNumber(source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2), "$")}
            </TableCell>)}
          </TableRow>}
          {state.sources.filter(source => source.instalments.length > 0).length > 0 && <TableRow>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <TableCell sx={{ textAlign: "center", fontSize: ".875rem", fontWeight: "bold" }} className={!(state.sources.filter(source => source.expenses.length > 0).length > 0 ^ state.sources.filter(source => source.instalments.length > 0).length > 0) ? "instalment" : null} colSpan={state.simple ? 1 : 4}>
              {formatNumber(source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0).toFixed(2), "$")}
            </TableCell>)}
          </TableRow>}
          {!(state.sources.filter(source => source.expenses.length > 0).length > 0 ^ state.sources.filter(source => source.instalments.length > 0).length > 0) ? <TableRow>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <TableCell sx={{ textAlign: "center", fontSize: ".875rem", fontWeight: "bold" }} colSpan={state.simple ? 1 : 4}>
              {formatNumber((source.expenses.reduce((a, b) => a + b.amount, 0) + source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0)).toFixed(2), "$")}
            </TableCell>)}
          </TableRow> : null}
        </TableFooter> */}
      </Table>
    </TableContainer> :
    <div className="expenses-container">
      <h2>no expenses recorded</h2>
    </div>
  )
}