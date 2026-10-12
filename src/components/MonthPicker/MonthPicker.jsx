import { ArrowDropDown, ChevronLeft, ChevronRight } from "@mui/icons-material"
import { Box, Button, IconButton, Popover, Typography } from "@mui/material"
import { useState } from "react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const LONGEST = ["September", "November", "December", "February"]

/** Nothing is billed beyond the month after the current one, so later months cannot be picked. */
function canSelect(year, month, now = new Date()) {
  return new Date(year, month, 1) <= new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

/** The month and year as a button; it opens a card with the year arrows and the twelve months. */
export function MonthPicker({ year, month, onSelect, disabled = false }) {
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
        <IconButton size="small" onClick={() => setShownYear(shownYear - 1)}><ChevronLeft /></IconButton>
        <Typography sx={{ fontWeight: "bold" }}>{shownYear}</Typography>
        <IconButton size="small" onClick={() => setShownYear(shownYear + 1)} disabled={!canSelect(shownYear + 1, 0)}><ChevronRight /></IconButton>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5 }}>
        {MONTHS.map((name, index) => <Button
          key={name}
          size="small"
          color={shownYear === year && index === month ? "primary" : "inherit"}
          variant={shownYear === year && index === month ? "contained" : "text"}
          disabled={!canSelect(shownYear, index)}
          onClick={() => select(index)}
        >
          {name.slice(0, 3)}
        </Button>)}
      </Box>
    </Popover>
  </>
}
