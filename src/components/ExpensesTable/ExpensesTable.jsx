import { ExpenseItem } from "@/components"
import { currencySymbol, isCard, kindLabel, lastMonthPaid, monthlyShare, numberFormat, visibleSources } from "@/utils/functions"
import { Fragment } from "react"
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material"

const INCOME_BG = "#c8e6c9"
const OWED_BG = "#ffcdd2"
const PAID_BG = "#c5e1a5"      // an acid, light green next to the green of the incomes
const UNPAID_BG = "#ef9a9a"    // a light red, stronger than the pink of Owed
const CREDIT_BG = "#e1bee7"    // soft purple, apart from the lilac of the instalments
const DEBIT_BG = "#d7ccc8"     // soft brown
const BALANCE_BG = "#bbdefb"   // the same as the Balance chip of the month summary
const TRANSFER_BG = "#ffe0b2"   // the same as the transfer rows (td.transfer)

/** The amounts of a source in the header, left out when they are 0 (to the cent), separated by a dot. */
function SourceChips({ source, rates }) {
  const cash = source.expenses.reduce((a, b) => a + b.amount, 0)
  const instalments = source.instalments.reduce((a, b) => a + monthlyShare(b), 0)
  const card = source.kind === "card"
  // What the card received in payments this month.
  const paid = (source.transfers ?? []).filter(t => t.direction === "in").reduce((a, b) => a + b.signed_amount, 0)

  const symbol = currencySymbol(source.currency)
  // A source in another currency also shows what it is worth in pesos, with the current exchange rate.
  const rate = source.currency && source.currency !== "MXN" ? rates?.[source.currency] : null
  const label = value => numberFormat(value, 2, symbol) + (rate ? ` ≈ ${numberFormat(value * rate, 2, "$")}` : "")

  const chips = [
    { title: "Income", sx: { background: INCOME_BG }, value: source.incomes.reduce((a, b) => a + b.amount, 0) },
    { title: "In full", sx: { background: "transparent", border: "1px solid #c0c0c0" }, value: cash },
    { title: "Instalments", sx: { background: "#bdbaff" }, value: instalments },
    { title: "Total", sx: { background: "#c0c0c0" }, value: cash + instalments, equivalent: true },
    card && { title: "Paid", sx: { background: TRANSFER_BG }, value: paid },
    source.balance != null && {
      title: card ? "Owed" : "Balance",
      sx: { background: card ? OWED_BG : BALANCE_BG },
      value: card ? -source.balance : source.balance,
      equivalent: true,
    },
  ].filter(chip => chip && Math.abs(chip.value) >= 0.005)

  return chips.map((chip, index) => <Fragment key={chip.title}>
    {index > 0 && <span className="chip-dot"> · </span>}
    <Tooltip title={chip.title}>
      <Chip size="small" sx={{ ...chip.sx, fontWeight: 400 }} label={chip.equivalent ? label(chip.value) : numberFormat(chip.value, 2, symbol)} />
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
                  <div className="source-title">
                    <Typography sx={{ fontSize: "1.25rem", fontWeight: "bold" }}>{source.name}</Typography>
                    <Chip size="small" sx={{ background: isCard(source) ? CREDIT_BG : DEBIT_BG, fontWeight: 400 }} label={kindLabel(source)} />
                    {lastMonthPaid(source) === true && <Tooltip title="No debt left from earlier periods">
                      <Chip size="small" sx={{ background: PAID_BG, fontWeight: 400 }} label="Last month paid" />
                    </Tooltip>}
                    {lastMonthPaid(source) === false && <Tooltip title="Debt left from earlier periods">
                      <Chip size="small" sx={{ background: UNPAID_BG, fontWeight: 400 }} label="Last month not paid" />
                    </Tooltip>}
                  </div>
                  <div className="source-chips">
                    <SourceChips source={source} rates={state.rates} />
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