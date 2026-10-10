import { ExpenseItem } from "@/components"
import { monthlyShare, numberFormat, visibleSources } from "@/utils/functions"
import { Fragment } from "react"
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material"

const INCOME_BG = "#c8e6c9"
const OWED_BG = "#ffcdd2"
const TRANSFER_BG = "#ffe0b2"   // the same as the transfer rows (td.transfer)

/** The amounts of a source in the header, left out when they are 0 (to the cent), separated by a dot. */
function SourceChips({ source }) {
  const cash = source.expenses.reduce((a, b) => a + b.amount, 0)
  const instalments = source.instalments.reduce((a, b) => a + monthlyShare(b), 0)
  const card = source.kind === "card"
  // What the card received in payments this month.
  const paid = (source.transfers ?? []).filter(t => t.direction === "in").reduce((a, b) => a + b.signed_amount, 0)

  const chips = [
    { title: "Income", sx: { background: INCOME_BG }, value: source.incomes.reduce((a, b) => a + b.amount, 0) },
    { title: "In full", sx: { background: "transparent", border: "1px solid #c0c0c0" }, value: cash },
    { title: "Instalments", sx: { background: "#bdbaff" }, value: instalments },
    { title: "Total", sx: { background: "#c0c0c0" }, value: cash + instalments },
    card && { title: "Paid", sx: { background: TRANSFER_BG }, value: paid },
    source.balance != null && {
      title: card ? "Owed" : "Balance",
      sx: card ? { background: OWED_BG } : { background: "transparent", border: "1px solid #c0c0c0" },
      value: card ? -source.balance : source.balance,
    },
  ].filter(chip => chip && Math.abs(chip.value) >= 0.005)

  return chips.map((chip, index) => <Fragment key={chip.title}>
    {index > 0 && <span className="chip-dot"> · </span>}
    <Tooltip title={chip.title}>
      <Chip size="small" sx={chip.sx} label={numberFormat(chip.value, 2, "$")} />
    </Tooltip>
  </Fragment>)
}

export function ExpensesTable({ state, setState, openModal, openIncomeModal, openTransferModal }) {
  let categories = {}

  for (const category of state?.categories ?? []) {
    categories[category.id] = category.alias
  }

  const sources = visibleSources(state)
  const rows = {
    incomes: Math.max(0, ...sources.map(source => source.incomes.length)),
    transfers: Math.max(0, ...sources.map(source => source.transfers?.length ?? 0)),
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
                  <div className="source-chips">
                    <SourceChips source={source} />
                  </div>
                </div>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array(rows.incomes + rows.transfers + rows.expenses + rows.instalments).fill(null).map((_, index) =>
            <ExpenseItem
              key={index}
              index={index}
              rows={rows}
              state={state}
              setState={setState}
              openModal={openModal}
              openIncomeModal={openIncomeModal}
              openTransferModal={openTransferModal}
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