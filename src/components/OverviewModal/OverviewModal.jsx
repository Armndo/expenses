import { api_url } from "@/env"
import { evolutionCharts, foregroundColor, numberFormat, overviewBars, overviewSlices } from "@/utils/functions"
import { Box, Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material"
import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const NEGATIVE = "#d32f2f"

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

  return <Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{chart.title}</Typography>
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chart.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis width="auto" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={value => numberFormat(value, 0, "$")} />
        <Tooltip formatter={value => numberFormat(value, 2, "$")} />
        {chart.series.length > 1 && <Legend />}
        {negative && <ReferenceLine y={0} stroke="#9e9e9e" />}
        {chart.series.map(({ key, label, color }) => <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
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
    ? <Box sx={{ display: "grid", gap: "1rem" }}>{charts.map(chart => <EvolutionChart key={chart.key} chart={chart} />)}</Box>
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
        <CardActions sx={{ p: "1rem", pt: 0, flexWrap: "wrap", gap: ".5rem", "& > :not(style) ~ :not(style)": { ml: 0 } }}>
          <Button size="small" color="primary" variant={tab === "categories" ? "contained" : "outlined"} onClick={() => setTab("categories")}>Categories</Button>
          <Button size="small" color="primary" variant={tab === "evolution" ? "contained" : "outlined"} onClick={() => setTab("evolution")}>Evolution</Button>
          {tab === "categories" && <>
            <Button size="small" color="success" variant="contained" onClick={() => toggle("byAmount", !state.byAmount)}>{state.byAmount ? "By Expenses" : "By Amount"}</Button>
            <Button size="small" color="success" variant="outlined" onClick={() => toggle("overviewPie", !state.overviewPie)}>{state.overviewPie ? "Bars" : "Pie"}</Button>
          </>}
        </CardActions>
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
