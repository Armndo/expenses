import { api_url } from "@/env"
import { BUDGET_COLORS, budgetColor, chartAxis, compactMoney, evolutionCharts, foregroundColor, numberFormat, overviewBars, overviewSlices, standardDate, logScale, unlogScale } from "@/utils/functions"
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
/** The colour of a month of a line: the budget by its sign; a negative month (a refund) in the colour of the case (green); the line's own otherwise. */
function pointColor(key, value, color) {
  if (key === "budget") {
    return budgetColor(value)
  }

  return value < 0 ? BUDGET_COLORS.positive : color
}

/** The tooltip of a month: every line with its real value, and a note when the month is a projection or a refund. */
function EvolutionTooltip({ active, payload, label, series, projected }) {
  if (!active || !payload?.length) {
    return null
  }

  const row = payload[0].payload

  return <div style={{ background: "#fff", border: "1px solid #ccc", padding: ".5rem .75rem", fontSize: ".85rem" }}>
    <div style={{ fontWeight: 500 }}>{label}{row.at > projected && " · projected"}</div>
    {series.map(({ key, label: name, color }) => {
      const value = row[`${key}_value`]

      return value == null ? null : <div key={key} style={{ color: pointColor(key, value, color) }}>{name} : {numberFormat(value, 2, "$")}{key === "spent" && value < 0 && " · refund"}</div>
    })}
  </div>
}

/** The colour of the line where a negative value is (on a log axis, drawn as its absolute value): red for the budget, green for the rest. */
function negativeColor(key) {
  return key === "budget" ? BUDGET_COLORS.negative : BUDGET_COLORS.positive
}

/**
 * A gradient along the line that paints green (red, for the budget) the segments that touch a negative month: on a log
 * axis a negative value is drawn as its absolute value, and the colour is what says it is negative; on a linear axis it
 * is drawn where it is, and the colour marks it. `points` are
 * `[index, negative]` of the months the line has a value in, in order; the line is as wide as its first and last one.
 */
function negativeGradient(id, key, color, points) {
  const first = points[0][0]
  const width = points[points.length - 1][0] - first || 1
  const stops = []

  points.slice(0, -1).forEach(([index, negative], position) => {
    const [next, nextNegative] = points[position + 1]
    const paint = negative || nextNegative ? negativeColor(key) : color

    stops.push(<stop key={`${index}-a`} offset={(index - first) / width} stopColor={paint} />, <stop key={`${index}-b`} offset={(next - first) / width} stopColor={paint} />)
  })

  return <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">{stops}</linearGradient>
}

/**
 * One chart. The months after `now` (`YYYY-MM`, the real current month) are a projection and are drawn with a dotted
 * line, joined to the last real month; the legend shows the value of the month on the screen (`shown`). With `log` the
 * Y axis is a log scale (linear up to `LOG_FROM`, logarithmic above), for the charts whose values are very far apart;
 * a negative value is drawn as its absolute value, in another colour.
 */
function EvolutionChart({ chart, now, shown, log }) {
  const values = chart.data.flatMap(row => chart.series.map(({ key }) => row[key])).filter(value => value !== null)
  // On a log axis a negative value has no place: it is drawn as its absolute value (green, or red for the budget).
  const drawn = log ? values.map(Math.abs) : values
  const negative = !log && values.some(value => value < 0)
  const yAxis = chartAxis(Math.min(...drawn), Math.max(...drawn), log)
  // On a log axis the lines are drawn at the position of their value (`logScale`) and the real value travels in `<key>_value`.
  const place = log && yAxis ? value => logScale(Math.abs(value)) : value => value

  // Each line is split in two: the real months (`key`) and the projected ones (`key_projected`, from the current month on).
  const data = chart.data.map(row => {
    const copy = { ...row }

    chart.series.forEach(({ key }) => {
      const value = row[key]
      copy[`${key}_value`] = value
      copy[key] = value === null ? null : place(value)
      copy[`${key}_drawn`] = copy[key]

      if (row.at >= now) {
        copy[`${key}_projected`] = copy[key]
      }

      if (row.at > now) {
        copy[key] = null
      }
    })

    return copy
  })

  // The gradients along each line that has a negative month, one for the real part and one for the projection: they paint
  // red (the budget) or green (the rest) the segments that touch it, in the same way on a linear and on a log axis.
  const negativeKeys = chart.series.filter(({ key }) => chart.data.some(row => row[key] < 0)).map(({ key }) => key)
  const alongId = (key, suffix) => `negative-${chart.key}-${key}${suffix}`
  const gradients = negativeKeys.flatMap(key => ["", "_projected"].map(suffix => {
    const points = data.flatMap((row, index) => row[`${key}${suffix}`] == null ? [] : [[index, row[`${key}_value`] < 0]])

    return points.length > 1 ? negativeGradient(alongId(key, suffix), key, key === "budget" ? BUDGET_COLORS.positive : chart.series.find(item => item.key === key).color, points) : null
  }))

  function stroke(key, color, suffix = "") {
    return negativeKeys.includes(key) ? `url(#${alongId(key, suffix)})` : color
  }

  // The dots are drawn by hand: on a dotted line they would inherit the dash and come out as broken circles. A real month
  // is a filled dot and a projected one a hollow dot (white centre); the current month is real, so the projected line skips it.
  function dot(key, color, suffix = "") {
    return ({ cx, cy, payload }) => {
      const value = payload[`${key}${suffix}`]

      if (value == null || cx == null || cy == null || (suffix && payload.at <= now)) {
        return null
      }

      const border = pointColor(key, payload[`${key}_value`], color)

      return <circle key={`${key}${suffix}-${payload.month}`} cx={cx} cy={cy} r={3} fill={suffix ? "#fff" : border} stroke={border} strokeWidth={1.5} />
    }
  }

  // The point under the cursor: the library paints it with the colour of the line, which is not the one of the case.
  function activeDot(key, color, suffix = "") {
    return ({ cx, cy, payload }) => {
      if (payload[`${key}${suffix}`] == null || cx == null || cy == null || (suffix && payload.at <= now)) {
        return null
      }

      return <circle key={`${key}${suffix}-active-${payload.month}`} cx={cx} cy={cy} r={5} fill={pointColor(key, payload[`${key}_value`], color)} stroke="#fff" strokeWidth={2} />
    }
  }

  // Spent is a flow (what was spent that month), so it is drawn as bars: a month is a bar, filled when it is real and with a
  // dotted outline when it is a projection; a negative one (a refund) is green. The axis has the zero in it. On a log axis the
  // bar is as tall as the position of its value (`logScale`, linear up to `LOG_FROM`) and a negative one goes up too.
  const asBars = chart.key === "spent"
  const barAxis = chartAxis(Math.min(0, ...drawn), Math.max(0, ...drawn), log)

  const lineAxis = yAxis
    ? <YAxis width="auto" tick={{ fontSize: 12 }} interval={0} ticks={yAxis.ticks} domain={[yAxis.low, yAxis.high]} padding={{ top: 6, bottom: 6 }} tickFormatter={position => compactMoney(log ? unlogScale(position) : position)} />
    : <YAxis width="auto" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={compactMoney} />
  const barsAxis = barAxis
    ? <YAxis width="auto" tick={{ fontSize: 12 }} interval={0} ticks={barAxis.ticks} domain={[barAxis.low, barAxis.high]} padding={{ top: 6, bottom: 0 }} tickFormatter={position => compactMoney(log ? unlogScale(position) : position)} />
    : <YAxis width="auto" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={compactMoney} />

  const plot = asBars
    ? <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={16} />
      {barsAxis}
      <Tooltip content={<EvolutionTooltip series={chart.series} projected={now} />} cursor={{ fill: "rgba(0, 0, 0, .06)" }} />
      <ReferenceLine y={0} stroke="#9e9e9e" />
      <Bar dataKey="spent_drawn" isAnimationActive={false} maxBarSize={24}>
        {data.map(row => {
          const barColor = pointColor("spent", row.spent_value, chart.series[0].color)

          return row.at > now
            ? <Cell key={row.at} fill={barColor} fillOpacity={0.25} stroke={barColor} strokeDasharray="3 3" />
            : <Cell key={row.at} fill={barColor} />
        })}
      </Bar>
    </BarChart>
    : <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>{gradients}</defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 12 }} padding={{ left: 16, right: 16 }} interval="preserveStartEnd" minTickGap={16} />
      {lineAxis}
      <Tooltip content={<EvolutionTooltip series={chart.series} projected={now} />} />
      {negative && <ReferenceLine y={0} stroke="#9e9e9e" />}
      {chart.series.map(({ key, label, color }) => <Line key={key} type="linear" dataKey={key} name={label} stroke={stroke(key, color)} strokeWidth={2} dot={dot(key, color)} activeDot={activeDot(key, color)} connectNulls={false} isAnimationActive={false} />)}
      {chart.series.map(({ key, label, color }) => <Line key={`${key}_projected`} type="linear" dataKey={`${key}_projected`} name={label} stroke={stroke(key, color, "_projected")} strokeWidth={2} strokeDasharray="4 4" dot={dot(key, color, "_projected")} activeDot={activeDot(key, color, "_projected")} connectNulls={false} isAnimationActive={false} />)}
    </LineChart>

  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: ".25rem" }}>{chart.title}</Typography>
    <ResponsiveContainer width="100%" height={200}>{plot}</ResponsiveContainer>
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".25rem 1rem", fontSize: ".85rem" }}>
      {chart.series.map(({ key, label, color }) => {
        const last = [...chart.data].reverse().find(row => row[key] !== null && row.at <= shown)?.[key]

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
function Evolution({ month, shown, log }) {
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
    ? <Box sx={EVOLUTION_GRID}>{charts.map(chart => <EvolutionChart key={chart.key} chart={chart} now={standardDate().slice(0, 7)} shown={shown} log={log && chart.key !== "balance"} />)}</Box>
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
  // Whether the evolution charts with very different values (Spent, Instalments and Budget) use a log scale.
  const [evolutionLog, setEvolutionLog] = useState(() => localStorage.getItem("evolutionLog") === "true")

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

  function selectEvolutionScale(value) {
    localStorage.setItem("evolutionLog", value)
    setEvolutionLog(value)
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
            <ToggleButton color="success" label="Linear" selected={!evolutionLog} onClick={() => selectEvolutionScale(false)} />
            <ToggleButton color="success" label="Log" selected={evolutionLog} onClick={() => selectEvolutionScale(true)} />
          </Box>}
          {tab === "categories" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            <ToggleButton color="success" label="By Amount" selected={state.byAmount} onClick={() => toggle("byAmount", true)} />
            <ToggleButton color="success" label="By Expenses" selected={!state.byAmount} onClick={() => toggle("byAmount", false)} />
            <ToggleButton color="success" label="Bars" selected={!state.overviewPie} onClick={() => toggle("overviewPie", false)} />
            <ToggleButton color="success" label="Pie" selected={state.overviewPie} onClick={() => toggle("overviewPie", true)} />
          </Box>}
        </Box>
        <CardContent sx={{ ...size.content, overflowY: tab === "evolution" ? "auto" : "hidden", pt: 0 }}>
          {tab === "evolution" ? <Evolution month={evolutionAll ? null : shownMonth} shown={shownMonth} log={evolutionLog} /> : state.overviewPie
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
