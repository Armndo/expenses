/* eslint-disable react/prop-types -- the project has no PropTypes */
import { CalendarMonthTwoTone, ChevronLeft, ChevronRight, Clear } from "@mui/icons-material"
import { Box, Button, IconButton, InputAdornment, Popover, TextField, Typography } from "@mui/material"
import { useState } from "react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

function iso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function short(date) {
  const [, month, day] = date.split("-").map(Number)

  return `${MONTHS[month - 1].slice(0, 3)} ${day}`
}

/** What the field says: `Nov 3 – Nov 12`, `From Nov 3` while only the first day is chosen, `Until Nov 12`, or nothing. */
function rangeText(from, to) {
  if (from && to) {
    return from === to ? short(from) : `${short(from)} – ${short(to)}`
  }

  return from ? `From ${short(from)}` : to ? `Until ${short(to)}` : ""
}

/**
 * One field for a range of dates: it opens a small calendar, the first day touched is the start and the second the end (in either
 * order). `min` and `max` (`YYYY-MM-DD`) limit the days and the months it can move through.
 */
export function DateRangeField({ from, to, min, max, onChange, label = "Dates" }) {
  const [anchor, setAnchor] = useState(null)
  const [picking, setPicking] = useState(false)
  const start = from || max || min || iso(new Date().getFullYear(), new Date().getMonth(), 1)
  const [shown, setShown] = useState(null)
  const [year, month] = (shown ?? (to || start)).split("-").map(Number).map((value, index) => index === 1 ? value - 1 : value)
  const firstMonth = min ? min.slice(0, 7) : null
  const lastMonth = max ? max.slice(0, 7) : null
  const current = iso(year, month, 1).slice(0, 7)

  function open(event) {
    setPicking(false)
    setShown(null)
    setAnchor(event.currentTarget)
  }

  function move(step) {
    const date = new Date(year, month + step, 1)

    setShown(iso(date.getFullYear(), date.getMonth(), 1))
  }

  function choose(day) {
    if (!picking) {
      onChange(day, "")
      setPicking(true)
      return
    }

    onChange(...(day < from ? [day, from] : [from, day]))
    setPicking(false)
    setAnchor(null)
  }

  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)]
  const last = to || from

  return <>
    <TextField
      size="small"
      label={label}
      value={rangeText(from, to)}
      placeholder="Any date"
      onClick={open}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { readOnly: true, style: { cursor: "pointer" } },
        input: {
          endAdornment: <InputAdornment position="end">
            {from || to ? <IconButton size="small" aria-label="Clear the dates" onClick={e => { e.stopPropagation(); onChange("", "") }}><Clear fontSize="small" /></IconButton> : <CalendarMonthTwoTone fontSize="small" />}
          </InputAdornment>,
        },
      }}
      sx={{ width: "100%", cursor: "pointer", "& .MuiInputBase-root": { cursor: "pointer" } }}
    />
    <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
      <Box sx={{ p: "1rem", width: 7 * 36 + 32 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: ".5rem" }}>
          <IconButton size="small" aria-label="Previous month" onClick={() => move(-1)} disabled={!!firstMonth && current <= firstMonth}><ChevronLeft /></IconButton>
          <Typography variant="subtitle2">{MONTHS[month]} {year}</Typography>
          <IconButton size="small" aria-label="Next month" onClick={() => move(1)} disabled={!!lastMonth && current >= lastMonth}><ChevronRight /></IconButton>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)" }}>
          {WEEKDAYS.map((weekday, index) => <Typography key={index} variant="caption" color="text.secondary" sx={{ textAlign: "center", lineHeight: "28px" }}>{weekday}</Typography>)}
          {cells.map((day, index) => {
            if (day === null) {
              return <Box key={`blank-${index}`} />
            }

            const date = iso(year, month, day)
            const edge = date === from || date === last
            const inside = from && last && date > from && date < last
            const blocked = (!!min && date < min) || (!!max && date > max)

            return <Button
              key={date}
              size="small"
              disabled={blocked}
              onClick={() => choose(date)}
              sx={{
                minWidth: 0, width: 36, height: 32, p: 0, borderRadius: edge ? "50%" : inside ? 0 : "50%", fontSize: ".8125rem",
                ...(edge ? { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } } : inside ? { bgcolor: "action.selected", color: "text.primary" } : { color: "text.primary" }),
              }}
            >{day}</Button>
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: ".5rem" }}>{picking ? "Now the last day" : "Choose the first day"}</Typography>
      </Box>
    </Popover>
  </>
}
