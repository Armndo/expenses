import { api_url } from "@/env"
import { BUDGET_COLORS, budgetColor, compactMoney, evolutionCharts, foregroundColor, numberFormat, overviewBars, overviewSlices, standardDate } from "@/utils/functions"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material"
import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const NEGATIVE = "#d32f2f"

/** A button that is on (contained) or off (outlined): both options of a pair are always visible, so it works as a toggle. */
function ToggleButton({ label, selected, color = "primary", onClick }) {
  return <Button size="small" color={color} variant={selected ? "contained" : "outlined"} onClick={onClick}>{label}</Button>
}

/** Value of a bar or slice: money by amount, a count by expenses. */
function valueText(value, byAmount) {
  return byAmount ? numberFormat(value, 2, "$") : numberFormat(value, 0)
}

/**
 * The tooltip of a category: its colour, name, number of expenses and total spent, always both whatever the view is
 * (the total as money, white on red when it is negative).
 */
function CategoryTooltip({ active, payload }) {
  const datum = active && payload?.[0]?.payload
  const sum = datum && +datum.expenses_sum_amount

  return datum && <div style={{ padding: ".25rem", background: datum.color, color: foregroundColor(datum.color), textAlign: "center", minWidth: "10rem", borderRadius: ".25rem" }}>
    <h3 style={{ margin: ".25rem" }}>{datum.name} <span style={{ textShadow: `0 0 4px ${foregroundColor(datum.color)}` }}>{datum.alias}</span></h3>
    <p style={{ margin: ".25rem" }}>{datum.expenses_count} expense{datum.expenses_count !== 1 && "s"}</p>
    <p style={{ margin: ".25rem" }}>
      <span style={sum < 0 ? { background: "#fff", color: NEGATIVE, padding: "0 .35rem", borderRadius: ".25rem" } : undefined}>
        {numberFormat(sum, 2, "$")}
      </span>
    </p>
  </div>
}

/** Short value for the bars and their axis: `$6.1k` by amount, a plain count by expenses. */
function shortValue(value, byAmount) {
  return byAmount ? compactMoney(value) : numberFormat(value, 0)
}

/**
 * Bars by category, one row each like the app's (emoji and name, bar, value), so that thirty categories stay legible: the
 * rows scroll inside the zone. A negative one (refunds) is drawn with its absolute value and a red outline, and its value is red.
 */
function CategoryBars({ bars, byAmount }) {
  const rows = bars.map(item => ({ ...item, label: `${item.alias ?? ""} ${item.name}`.trim(), shown: shortValue(item.value, byAmount) }))

  return <Box sx={{ height: "100%", overflowY: "auto" }}>
    <Box sx={{ height: rows.length * 30 + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 4 }} barCategoryGap={4}>
          <XAxis type="number" orientation="top" tick={{ fontSize: 12 }} tickFormatter={value => shortValue(value, byAmount)} />
          <YAxis type="category" dataKey="label" width={118} tickLine={false} interval={0} tick={({ x, y, payload }) => <text x={x - 4} y={y} dy=".35em" textAnchor="end" fontSize={13} fill="#212121">{payload.value.length > 17 ? `${payload.value.slice(0, 16)}…` : payload.value}</text>} />
          <Tooltip content={CategoryTooltip} cursor={{ fill: "rgba(0, 0, 0, .05)" }} />
          <Bar dataKey="abs" fill="#1976d2" isAnimationActive={false}>
            {rows.map(item => <Cell key={item.id ?? item.name} fill={item.color} stroke={item.value < 0 ? NEGATIVE : undefined} strokeWidth={item.value < 0 ? 2 : 0} />)}
            <LabelList dataKey="shown" content={props => <text x={props.x + props.width + 4} y={props.y + props.height / 2} dominantBaseline="middle" fontSize={12} fill={rows[props.index]?.value < 0 ? NEGATIVE : "#424242"}>{props.value}</text>} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  </Box>
}

/**
 * Pie of the positive values with a legend (colour, alias and name, value and percentage). The pie keeps its size and only
 * the legend scrolls: below the pie on a phone, beside it from `sm` up.
 */
function CategoryPie({ slices, byAmount }) {
  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "stretch" }, gap: "1rem" }}>
    <Box sx={{ flex: { xs: "0 0 min(240px, 50%)", sm: "0 0 260px" }, minHeight: 0, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" outerRadius="92%" stroke="#fff" strokeWidth={1.5} isAnimationActive={false}>
            {slices.map(item => <Cell key={item.id ?? item.name} fill={item.color} />)}
          </Pie>
          <Tooltip content={CategoryTooltip} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: ".35rem", fontSize: ".9rem" }}>
      {slices.map(item => <li key={item.id ?? item.name} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <span style={{ width: 12, height: 12, borderRadius: 2, background: item.color, flex: "none" }} />
        <span>{item.alias} {item.name}</span>
        <span style={{ marginLeft: "auto", paddingLeft: ".75rem", whiteSpace: "nowrap" }}>{valueText(item.value, byAmount)} · {numberFormat(item.share * 100, 1)}%</span>
      </li>)}
    </Box>
  </Box>
}

/** One line chart of the evolution; a `null` leaves a gap and the zero line shows when something is negative. */
function EvolutionChart({ chart }) {
  const values = chart.data.flatMap(row => chart.series.map(({ key }) => row[key])).filter(value => value !== null)
  const negative = values.some(value => value < 0)

  // The budget changes colour with its sign: a gradient with a hard stop at the zero of the line (top = highest value).
  const budget = chart.data.map(row => row.budget).filter(value => value !== null && value !== undefined)
  const budgetMixed = budget.length > 0 && Math.min(...budget) < 0 && Math.max(...budget) > 0
  const zeroAt = budgetMixed ? Math.max(...budget) / (Math.max(...budget) - Math.min(...budget)) : null
  const gradientId = `budget-sign-${chart.key}`

  function stroke(key, color) {
    if (key !== "budget" || budget.length === 0) {
      return color
    }

    return budgetMixed ? `url(#${gradientId})` : budgetColor(budget[0])
  }

  function dot(key) {
    return key === "budget"
      ? ({ cx, cy, payload }) => payload[key] == null || cx == null || cy == null ? null : <circle key={`${key}-${payload.month}`} cx={cx} cy={cy} r={3} fill={budgetColor(payload[key])} />
      : { r: 3 }
  }

  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: ".25rem" }}>{chart.title}</Typography>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {budgetMixed && <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset={zeroAt} stopColor={BUDGET_COLORS.positive} />
            <stop offset={zeroAt} stopColor={BUDGET_COLORS.negative} />
          </linearGradient>
        </defs>}
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} padding={{ left: 16, right: 16 }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis width="auto" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={compactMoney} />
        <Tooltip formatter={value => numberFormat(value, 2, "$")} />
        {negative && <ReferenceLine y={0} stroke="#9e9e9e" />}
        {chart.series.map(({ key, label, color }) => <Line key={key} type="monotone" dataKey={key} name={label} stroke={stroke(key, color)} strokeWidth={2} dot={dot(key)} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".25rem 1rem", fontSize: ".85rem" }}>
      {chart.series.map(({ key, label, color }) => {
        const last = [...chart.data].reverse().find(row => row[key] !== null)?.[key]

        return <Box key={key} sx={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: key === "budget" && last !== undefined ? budgetColor(last) : color, flex: "none" }} />
          <span>{label}{last !== undefined && ` · ${numberFormat(last, 2, "$")}`}</span>
        </Box>
      })}
    </Box>
  </Box>
}

/**
 * How the charts are laid out, by the width of the window: on a desktop Spent takes the two columns of the first row and
 * Balance and Debit, and Instalments and Budget go side by side in the next one; one column on a phone.
 */
const EVOLUTION_GRID = {
  display: "grid",
  gap: "1.5rem 1rem",
  gridTemplateColumns: "minmax(0, 1fr)",
  "@media (min-width: 720px)": {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    "& > :first-of-type": { gridColumn: "span 2" },
  },
}

/** The month by month evolution, asked to `GET /history` when the tab opens. */
function Evolution({ month }) {
  const navigate = useNavigate()
  const [history, setHistory] = useState({ loading: true, error: false, months: [] })

  useEffect(() => {
    axios.get(`${api_url}/history`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
    .then(res => setHistory({ loading: false, error: false, months: res.data.months ?? [] }))
    .catch(err => {
      if (err?.status === 401) {
        localStorage.removeItem("token")
        navigate("/login")
        return
      }

      setHistory({ loading: false, error: true, months: [] })
    })
  }, [])

  const charts = useMemo(() => evolutionCharts(history.months, month), [history.months, month])

  if (history.loading) {
    return <Typography>Loading...</Typography>
  }

  if (history.error) {
    return <Typography color="error">Could not load the evolution.</Typography>
  }

  return charts.length > 0
    ? <Box sx={EVOLUTION_GRID}>{charts.map(chart => <EvolutionChart key={chart.key} chart={chart} />)}</Box>
    : <Typography>Nothing to show.</Typography>
}

/*
 * The size of the modal is set by the tab and not by what it holds, so that changing the view or the data does not make
 * it jump: Categories always has the same width and the same height for bars, pie and the empty message (what does not
 * fit scrolls inside), and Evolution has its own, wider. On a phone the header and the Close button stay in view and
 * only the content scrolls.
 */
const CHROME = "17rem" // header, the two rows of buttons, Close and the margins of the card

const CATEGORIES_SIZE = {
  width: "min(92vw, 640px)",
  content: { height: `min(420px, calc(100dvh - ${CHROME}))`, minHeight: 220 },
}

// Evolution has a second row of buttons too (up to the month or all of it), so its chrome is the same.
const EVOLUTION_CHROME = CHROME

const EVOLUTION_SIZE = {
  width: "min(calc(100vw - 1rem), 1100px)",
  // One column on a phone and a tablet: a fixed height that scrolls. On a desktop: as tall as it needs.
  content: { height: { xs: `calc(100dvh - ${EVOLUTION_CHROME})`, md: "auto" }, minHeight: { md: 340 }, maxHeight: `calc(100dvh - ${EVOLUTION_CHROME})` },
}

export function OverviewModal({ state, setState }) {
  const [tab, setTab] = useState(() => localStorage.getItem("overviewTab") === "evolution" ? "evolution" : "categories")
  // Whether the evolution shows every month (the projection included) or stops at the month on the screen.
  const [evolutionAll, setEvolutionAll] = useState(() => localStorage.getItem("evolutionAll") === "true")

  const bars = useMemo(() => overviewBars(state.categories, state.byAmount), [state.categories, state.byAmount])
  const slices = useMemo(() => overviewSlices(state.categories, state.byAmount), [state.categories, state.byAmount])

  function closeModal() {
    setState(prev => ({ ...prev, overview: false }))
  }

  function selectTab(value) {
    localStorage.setItem("overviewTab", value)
    setTab(value)
  }

  function selectEvolutionRange(value) {
    localStorage.setItem("evolutionAll", value)
    setEvolutionAll(value)
  }

  function toggle(key, value) {
    localStorage.setItem(key, value)
    setState(prev => ({ ...prev, [key]: value }))
  }

  // The month on the screen (`YYYY-MM`): the evolution ends there.
  const shownMonth = (state.date ?? standardDate()).slice(0, 7)

  const size = tab === "evolution" ? EVOLUTION_SIZE : CATEGORIES_SIZE
  const empty = <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Typography>Nothing to show.</Typography></Box>

  return (
    state.overview && <div className="overview-modal" onClick={closeModal}>
      <Card
        elevation={5}
        sx={{ boxSizing: "border-box", borderRadius: "1rem", width: size.width, maxHeight: "calc(100dvh - 2rem)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .2s ease", fontFamily: "Roboto, Arial, sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        <CardHeader title="Overview" sx={{ flex: "none" }} />
        <Box sx={{ px: "1rem", pb: "1rem", display: "grid", gap: ".5rem", flex: "none" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton label="Categories" selected={tab === "categories"} onClick={() => selectTab("categories")} />
            <ToggleButton label="Evolution" selected={tab === "evolution"} onClick={() => selectTab("evolution")} />
          </Box>
          {tab === "evolution" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton color="success" label="Up to month" selected={!evolutionAll} onClick={() => selectEvolutionRange(false)} />
            <ToggleButton color="success" label="All" selected={evolutionAll} onClick={() => selectEvolutionRange(true)} />
          </Box>}
          {tab === "categories" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton color="success" label="By Amount" selected={state.byAmount} onClick={() => toggle("byAmount", true)} />
            <ToggleButton color="success" label="By Expenses" selected={!state.byAmount} onClick={() => toggle("byAmount", false)} />
            <ToggleButton color="success" label="Bars" selected={!state.overviewPie} onClick={() => toggle("overviewPie", false)} />
            <ToggleButton color="success" label="Pie" selected={state.overviewPie} onClick={() => toggle("overviewPie", true)} />
          </Box>}
        </Box>
        <CardContent sx={{ ...size.content, overflowY: tab === "evolution" ? "auto" : "hidden", pt: 0 }}>
          {tab === "evolution" ? <Evolution month={evolutionAll ? null : shownMonth} /> : state.overviewPie
            ? slices.length > 0 ? <CategoryPie slices={slices} byAmount={state.byAmount} /> : empty
            : bars.length > 0 ? <CategoryBars bars={bars} byAmount={state.byAmount} /> : empty}
        </CardContent>
        <CardActions sx={{ p: "1rem", flex: "none" }}>
          <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}
