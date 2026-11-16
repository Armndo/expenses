/* eslint-disable react/prop-types -- the project has no PropTypes */
import { CHIP_COLORS, FILTER_TYPES } from "@/utils/functions"
import { Box, Chip } from "@mui/material"

// The type chips take the colour of that type everywhere else (the `In full` outline for the expenses, the lilac of the instalments, the green of the incomes and the
// amber of the transfers); off, they are dimmed like the chips of a source that lose rows (`DIMMED` in `ExpensesTable`).
const DIMMED = 0.5

// `Expenses` is the `In full` chip of a source: no fill and a grey border.
export const TYPE_COLORS = { expenses: "transparent", instalments: CHIP_COLORS.instalments, incomes: CHIP_COLORS.debit, transfers: "#ffe0b2" }

/** The four types as chips, in their colour and dimmed when off; `types` is `{ expenses: true, ... }` and `onChange` gets the new one. */
export function TypeChips({ types, onChange }) {
  return <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem", mt: ".25rem" }}>
    {FILTER_TYPES.map(type => <Chip
      key={type.key}
      size="small"
      label={type.label}
      sx={{
        fontWeight: 400,
        color: "text.primary",
        background: TYPE_COLORS[type.key],
        border: type.key === "expenses" ? "1px solid #c0c0c0" : undefined,
        opacity: types[type.key] ? 1 : DIMMED,
        "&:hover": { background: TYPE_COLORS[type.key] },
      }}
      onClick={() => onChange({ ...types, [type.key]: !types[type.key] })}
    />)}
  </Box>
}
