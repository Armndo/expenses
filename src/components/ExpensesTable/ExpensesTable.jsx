import { ExpenseItem } from "@/components"
import { numberFormat, visibleSources } from "@/utils/functions"
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material"

const INCOME_BG = "#c8e6c9"

export function ExpensesTable({ state, setState, openModal, openIncomeModal }) {
  let categories = {}

  for (const category of state?.categories ?? []) {
    categories[category.id] = category.alias
  }

  const sources = visibleSources(state)
  const rows = {
    incomes: Math.max(0, ...sources.map(source => source.incomes.length)),
    expenses: Math.max(0, ...sources.map(source => source.expenses.length)),
    instalments: Math.max(0, ...sources.map(source => source.instalments.length)),
  }

  return (
    sources.length > 0 ?
    <TableContainer className="expenses-table-container" sx={{ maxHeight: "calc(100vh - 12rem)", overflow: "auto" }}>
      <Table size="small" stickyHeader className="expenses_table">
        <TableHead>
          <TableRow>
            {sources.map(source => (
              <TableCell
                colSpan={state.simple ? 4 : 5}
                align="center"
                sx={{ zIndex: 1 }}
                key={source.name}
              >
                <div>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: "bold" }}>{source.name}</Typography>
                  {source.incomes.length > 0 && <>
                    <Tooltip title="Income">
                      <Chip
                        size="small"
                        sx={{ background: INCOME_BG }}
                        label={numberFormat(source.incomes.reduce((a, b) => a + b.amount, 0), 2, "$")}
                      />
                    </Tooltip>
                    {" · "}
                  </>}
                  <Tooltip title="In full">
                    <Chip
                      size="small"
                      sx={{ background: "transparent", border: "1px solid #c0c0c0" }}
                      label={numberFormat(source.expenses.reduce((a, b) => a + b.amount, 0), 2, "$")}
                    />
                  </Tooltip>
                  {" · "}
                  <Tooltip title="Instalments">
                    <Chip
                      size="small"
                      sx={{ background: "#bdbaff" }}
                      label={numberFormat(source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0), 2, "$")}
                    />
                  </Tooltip>
                  {" · "}
                  <Tooltip title="Total">
                    <Chip
                      size="small"
                      sx={{ background: "#c0c0c0" }}
                      label={numberFormat((source.expenses.reduce((a, b) => a + b.amount, 0) + source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0)), 2, "$")}
                    />
                  </Tooltip>
                </div>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array(rows.incomes + rows.expenses + rows.instalments).fill(null).map((_, index) =>
            <ExpenseItem
              key={index}
              index={index}
              rows={rows}
              state={state}
              setState={setState}
              openModal={openModal}
              openIncomeModal={openIncomeModal}
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