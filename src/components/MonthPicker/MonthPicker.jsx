import { ArrowDropDown, ChevronLeft, ChevronRight } from "@mui/icons-material"
import { Box, Button, IconButton, Popover, Typography } from "@mui/material"
import { useState } from "react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const LONGEST = ["September", "November", "December", "February"]

/**
 * Whether a month can be picked: it must be inside `min` and `max` (`YYYY-MM`, the first and last month with expenses
 * that `GET /data` sends as `range`). Until the range is known, nothing after the month following the current one.
 */
function canSelect(year, month, min = null, max = null, now = new Date()) {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`

  if (!min || !max) {
    return new Date(year, month, 1) <= new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  return key >= min && key <= max
}

/** The month and year as a button; it opens a card with the year arrows and the twelve months. */
export function MonthPicker({ year, month, onSelect, min = null, max = null, disabled = false }) {
  const [anchor, setAnchor] = useState(null)
  const [shownYear, setShownYear] = useState(year)

  function open(event) {
    setShownYear(year)
    setAnchor(event.currentTarget)
  }

  function select(selected) {
    setAnchor(null)
    onSelect(shownYear, selected)
  }

  // The year arrows stop at the years of the first and the last month.
  const bounded = Boolean(min && max)
  const hasPreviousYear = !bounded || shownYear - 1 >= +min.slice(0, 4)
  const hasNextYear = bounded ? shownYear + 1 <= +max.slice(0, 4) : canSelect(shownYear + 1, 0)

  return <>
    <Button
      color="inherit"
      disabled={disabled}
      onClick={open}
      endIcon={<ArrowDropDown />}
      sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" }, fontWeight: 400, textTransform: "none", lineHeight: 1.3, px: 1 }}
    >
      {/* The longest names, hidden, share the cell with the real one so the button (and the arrows beside it)
          keep the same width in every month. */}
      <Box component="span" sx={{ display: "inline-grid", justifyItems: "center" }}>
        {LONGEST.map(name => <Box key={name} component="span" aria-hidden sx={{ gridArea: "1 / 1", visibility: "hidden" }}>{name} {year}</Box>)}
        <Box component="span" sx={{ gridArea: "1 / 1" }}>{MONTHS[month]} {year}</Box>
      </Box>
    </Button>
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{ paper: { sx: { borderRadius: "1rem", p: 1.5, width: 280 } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <IconButton size="small" onClick={() => setShownYear(shownYear - 1)} disabled={!hasPreviousYear}><ChevronLeft /></IconButton>
        <Typography sx={{ fontWeight: "bold" }}>{shownYear}</Typography>
        <IconButton size="small" onClick={() => setShownYear(shownYear + 1)} disabled={!hasNextYear}><ChevronRight /></IconButton>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5 }}>
        {MONTHS.map((name, index) => <Button
          key={name}
          size="small"
          color={shownYear === year && index === month ? "primary" : "inherit"}
          variant={shownYear === year && index === month ? "contained" : "text"}
          disabled={!canSelect(shownYear, index, min, max)}
          onClick={() => select(index)}
        >
          {name.slice(0, 3)}
        </Button>)}
      </Box>
    </Popover>
  </>
}
