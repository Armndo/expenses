import { ExpenseItem } from "@/components"
import { formatNumber } from "@/utils/functions"
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material"

export function ExpensesTable({ state, setState, openModal }) {
  let categories = {}

  for (const category of state?.categories ?? []) {
    categories[category.id] = category.alias
  }

  return (
    state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).length > 0 ?
    <TableContainer className="expenses-table-container" sx={{ maxHeight: "calc(100vh - 12rem)", overflow: "auto" }}>
      <Table size="small" stickyHeader className="expenses_table">
        <TableHead>
          <TableRow>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => (
              <TableCell
                colSpan={state.simple ? 4 : 5}
                align="center"
                sx={{ zIndex: 1 }}
              >
                <div>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: "bold" }}>{source.name}</Typography>
                  <Tooltip title="De contado">
                    <Chip size="small" sx={{ background: "transparent", border: "1px solid #c0c0c0" }} label={formatNumber(source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2), "$")} />
                  </Tooltip>
                  {" + "}
                  <Tooltip title="A meses">
                    <Chip size="small" sx={{ background: "#bdbaff" }} label={formatNumber(source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0).toFixed(2), "$")} />
                  </Tooltip>
                  {" = "}
                  <Tooltip title="Total">
                    <Chip size="small" sx={{ background: "#c0c0c0" }} label={formatNumber((source.expenses.reduce((a, b) => a + b.amount, 0) + source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0)).toFixed(2), "$")} />
                  </Tooltip>
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
              categories={categories}
            />
          )}
        </TableBody>
      </Table>
    </TableContainer> :
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography variant="h6" >No expenses.</Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}