import { api_url } from "@/env"
import { compactMoney, evolutionCharts, foregroundColor, numberFormat, overviewBars, overviewSlices } from "@/utils/functions"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material"
import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const NEGATIVE = "#d32f2f"

/** A button that is on (contained) or off (outlined): both options of a pair are always visible, so it works as a toggle. */
function ToggleButton({ label, selected, color = "primary", onClick }) {
  return <Button size="small" color={color} variant={selected ? "contained" : "outlined"} onClick={onClick}>{label}</Button>
}

/** Value of a bar or slice: money by amount, a count by expenses. */
function valueText(value, byAmount) {
  return byAmount ? numberFormat(value, 2, "$") : numberFormat(value, 0)
}

/** The tooltip of a category: its colour, name, number of expenses and value (white on red when it is negative). */
function CategoryTooltip({ active, payload, byAmount }) {
  const datum = active && payload?.[0]?.payload

  return datum && <div style={{ padding: ".25rem", background: datum.color, color: foregroundColor(datum.color), textAlign: "center", minWidth: "10rem", borderRadius: ".25rem" }}>
    <h3 style={{ margin: ".25rem" }}>{datum.name} <span style={{ textShadow: `0 0 4px ${foregroundColor(datum.color)}` }}>{datum.alias}</span></h3>
    <p style={{ margin: ".25rem" }}>{datum.expenses_count} expense{datum.expenses_count > 1 && "s"}</p>
    <p style={{ margin: ".25rem" }}>
      <span style={datum.value < 0 ? { background: "#fff", color: NEGATIVE, padding: "0 .35rem", borderRadius: ".25rem" } : undefined}>
        {valueText(datum.value, byAmount)}
      </span>
    </p>
  </div>
}

/** Bars by category; a negative one (refunds) is drawn with its absolute value and a red outline, and its value is red. */
function CategoryBars({ bars, byAmount }) {
  return <ResponsiveContainer width="100%" height={400}>
    <BarChart data={bars}>
      <YAxis width="auto" tickFormatter={value => valueText(value, byAmount)} />
      <XAxis dataKey="alias" tickSize={0} tickMargin={8} tick={{ fontSize: 14 }} />
      <Tooltip content={props => <CategoryTooltip {...props} byAmount={byAmount} />} />
      <Bar dataKey="abs" fill="#1976d2">
        {bars.map(item => <Cell key={item.id ?? item.name} fill={item.color} stroke={item.value < 0 ? NEGATIVE : undefined} strokeWidth={item.value < 0 ? 3 : 0} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
}

/** Pie of the positive values with a legend: colour, alias and name, value and percentage. */
function CategoryPie({ slices, byAmount }) {
  return <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
    <PieChart width={260} height={260}>
      <Pie data={slices} dataKey="value" nameKey="name" innerRadius={0} outerRadius={120} stroke="#fff" strokeWidth={1.5} isAnimationActive={false}>
        {slices.map(item => <Cell key={item.id ?? item.name} fill={item.color} />)}
      </Pie>
      <Tooltip content={props => <CategoryTooltip {...props} byAmount={byAmount} />} />
    </PieChart>
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: ".35rem", fontSize: ".9rem" }}>
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

  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: ".25rem" }}>{chart.title}</Typography>
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} padding={{ left: 16, right: 16 }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis width="auto" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={compactMoney} />
        <Tooltip formatter={value => numberFormat(value, 2, "$")} />
        {negative && <ReferenceLine y={0} stroke="#9e9e9e" />}
        {chart.series.map(({ key, label, color }) => <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".25rem 1rem", fontSize: ".85rem" }}>
      {chart.series.map(({ key, label, color }) => {
        const last = [...chart.data].reverse().find(row => row[key] !== null)?.[key]

        return <Box key={key} sx={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flex: "none" }} />
          <span>{label}{last !== undefined && ` · ${numberFormat(last, 2, "$")}`}</span>
        </Box>
      })}
    </Box>
  </Box>
}

/** The month by month evolution, asked to `GET /history` when the tab opens. */
function Evolution() {
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

  const charts = useMemo(() => evolutionCharts(history.months), [history.months])

  if (history.loading) {
    return <Typography>Loading...</Typography>
  }

  if (history.error) {
    return <Typography color="error">Could not load the evolution.</Typography>
  }

  return charts.length > 0
    ? <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "1.5rem 1rem" }}>{charts.map(chart => <EvolutionChart key={chart.key} chart={chart} />)}</Box>
    : <Typography>Nothing to show.</Typography>
}

export function OverviewModal({ state, setState }) {
  const [tab, setTab] = useState("categories")

  const bars = useMemo(() => overviewBars(state.categories, state.byAmount), [state.categories, state.byAmount])
  const slices = useMemo(() => overviewSlices(state.categories, state.byAmount), [state.categories, state.byAmount])

  function closeModal() {
    setTab("categories")
    setState(prev => ({ ...prev, overview: false }))
  }

  function toggle(key, value) {
    localStorage.setItem(key, value)
    setState(prev => ({ ...prev, [key]: value }))
  }

  return (
    state.overview && <div className="overview-modal" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem", maxHeight: "calc(100dvh - 2rem)", overflow: "auto", fontFamily: "Roboto, Arial, sans-serif" }} onClick={e => e.stopPropagation()}>
        <CardHeader title="Overview" />
        <Box sx={{ px: "1rem", pb: "1rem", display: "grid", gap: ".5rem" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton label="Categories" selected={tab === "categories"} onClick={() => setTab("categories")} />
            <ToggleButton label="Evolution" selected={tab === "evolution"} onClick={() => setTab("evolution")} />
          </Box>
          {tab === "categories" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton color="success" label="By Amount" selected={state.byAmount} onClick={() => toggle("byAmount", true)} />
            <ToggleButton color="success" label="By Expenses" selected={!state.byAmount} onClick={() => toggle("byAmount", false)} />
            <ToggleButton color="success" label="Bars" selected={!state.overviewPie} onClick={() => toggle("overviewPie", false)} />
            <ToggleButton color="success" label="Pie" selected={state.overviewPie} onClick={() => toggle("overviewPie", true)} />
          </Box>}
        </Box>
        <CardContent>
          {tab === "evolution" ? <Evolution /> : state.overviewPie
            ? slices.length > 0 ? <CategoryPie slices={slices} byAmount={state.byAmount} /> : <Typography>Nothing to show.</Typography>
            : bars.length > 0 ? <CategoryBars bars={bars} byAmount={state.byAmount} /> : <Typography>Nothing to show.</Typography>}
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="error" type="button" variant="contained" onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}
