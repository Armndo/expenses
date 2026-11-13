import { ExpenseItem } from "@/components"
import { currencySymbol, emptyFilters, hasFilters, isCard, kindLabel, lastMonthCleared, lastMonthOwed, lastMonthPaid, monthlyShare, numberFormat, visibleSources } from "@/utils/functions"
import { Fragment } from "react"
import { Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material"

const INCOME_BG = "#c8e6c9"
const OWED_BG = "#ffcdd2"
const PAID_BG = "#c5e1a5"      // an acid, light green next to the green of the incomes
const UNPAID_BG = "#ef9a9a"    // a light red, stronger than the pink of Owed
const CREDIT_BG = "#e1bee7"    // soft purple, apart from the lilac of the instalments
const DEBIT_BG = "#d7ccc8"     // soft brown
const BALANCE_BG = "#bbdefb"   // the same as the Balance chip of the month summary
const TRANSFER_BG = "#ffe0b2"   // the same as the transfer rows (td.transfer)

/** The amounts of a source in the header, left out when they are 0 (to the cent), separated by a dot. */
// The chips that add up rows stay at the whole month's value; one is dimmed when the filters leave out part of what it adds up, so it is not read
// as what is shown.
const DIMMED = 0.5

/** What the chips that add up rows say for a source: incomes, expenses in full, instalments (their monthly share) and payments received. */
function sums(source) {
  return {
    income: source.incomes.reduce((a, b) => a + b.amount, 0),
    cash: source.expenses.reduce((a, b) => a + b.amount, 0),
    instalments: source.instalments.reduce((a, b) => a + monthlyShare(b), 0),
    // What the card received in payments this month.
    paid: (source.transfers ?? []).filter(t => t.direction === "in").reduce((a, b) => a + b.signed_amount, 0),
  }
}

function SourceChips({ source, shown, rates }) {
  const { cash, instalments, paid } = sums(source)
  const now = sums(shown ?? source)
  // A chip is dimmed when what is shown adds up to something else than the whole month.
  const differs = (whole, part) => Math.abs(whole - part) >= 0.005
  const card = source.kind === "card"

  const symbol = currencySymbol(source.currency)
  // A source in another currency also shows what it is worth in pesos, with the current exchange rate.
  const rate = source.currency && source.currency !== "MXN" ? rates?.[source.currency] : null
  const label = value => numberFormat(value, 2, symbol) + (rate ? ` ≈ ${numberFormat(value * rate, 2, "$")}` : "")

  const chips = [
    { title: "Income", dim: differs(sums(source).income, now.income), sx: { background: INCOME_BG }, value: sums(source).income },
    { title: "In full", dim: differs(cash, now.cash), sx: { background: "transparent", border: "1px solid #c0c0c0" }, value: cash },
    { title: "Instalments", dim: differs(instalments, now.instalments), sx: { background: "#bdbaff" }, value: instalments },
    { title: "Total", dim: differs(cash + instalments, now.cash + now.instalments), sx: { background: "#c0c0c0" }, value: cash + instalments, equivalent: true },
    card && { title: "Paid", dim: differs(paid, now.paid), sx: { background: TRANSFER_BG }, value: paid },
    source.balance != null && {
      title: card ? "Owed" : "Balance",
      sx: { background: card ? OWED_BG : BALANCE_BG },
      value: card ? -source.balance : source.balance,
      equivalent: true,
    },
  ].filter(chip => chip && Math.abs(chip.value) >= 0.005)

  return chips.map((chip, index) => <Fragment key={chip.title}>
    {index > 0 && <span className="chip-dot"> · </span>}
    <Tooltip title={chip.dim ? `${chip.title} (hidden rows)` : chip.title}>
      <Chip size="small" sx={{ ...chip.sx, fontWeight: 400, ...(chip.dim ? { opacity: DIMMED } : {}) }} label={chip.equivalent ? label(chip.value) : numberFormat(chip.value, 2, symbol)} />
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
            {sources.map(shown => {
              // The header says what the source is for the whole month (what it owes, what was paid): the filters only hide rows.
              const source = state.sources.find(candidate => candidate.id === shown.id) ?? shown

              return (
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
                    {lastMonthPaid(source) === true && <Tooltip title="Last month paid">
                      <Chip size="small" sx={{ background: PAID_BG, fontWeight: 400 }} label={lastMonthCleared(source) === null ? "Last month paid" : `Last month paid ${currencySymbol(source.currency)}${numberFormat(lastMonthCleared(source), 2)}`} />
                    </Tooltip>}
                    {lastMonthPaid(source) === false && <Tooltip title="Last month owed">
                      <Chip size="small" sx={{ background: UNPAID_BG, fontWeight: 400 }} label={`Last month owed ${currencySymbol(source.currency)}${numberFormat(lastMonthOwed(source), 2)}`} />
                    </Tooltip>}
                  </div>
                  <div className="source-chips">
                    <SourceChips source={source} shown={shown} rates={state.rates} />
                  </div>
                </div>
              </TableCell>
              )
            })}
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
              <Typography variant="h6" >{hasFilters(state.filters) ? "Nothing matches the filters." : "No expenses."}</Typography>
              {hasFilters(state.filters) && <Button size="small" sx={{ mt: ".5rem" }} onClick={() => setState(prev => ({ ...prev, filters: emptyFilters(Object.fromEntries(Object.keys(prev.filters.types).map(key => [key, true]))) }))}>Clear the filters</Button>}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}