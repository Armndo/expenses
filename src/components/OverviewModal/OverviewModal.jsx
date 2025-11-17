import { foregroundColor, numberFormat } from "@/utils/functions"
import { Button, Card, CardActions, CardContent, CardHeader } from "@mui/material"
import { useEffect, useState } from "react"
import { Bar, BarChart, Cell, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function OverviewModal({ state, setState }) {
  const [data, setData] = useState([])

  function closeModal() {
    setState(prev => ({
      ...prev,
      overview: false
    }))
  }

  useEffect(() => {
    const tmp = state.categories.filter(item => item.expenses_sum_amount > 0 || item.expenses_count > 0)
    tmp.sort((a, b) => state.byAmount ? b?.expenses_sum_amount - a?.expenses_sum_amount : b?.expenses_count - a?.expenses_count)

    setData(tmp)
  }, [state.categories, state.byAmount])

  function DataTooltip({ active, payload }) {
    const shown = active && payload?.[0]?.payload
    const datum = payload?.[0]?.payload

    return shown && <div style={{ padding: ".25rem", background: datum.color, color: foregroundColor(datum.color), lineHeight: .25, textAlign: "center", minWidth: "10rem", borderRadius: ".25rem" }}>
      <h3>{datum.name} <span style={{ textShadow: `0 0 4px ${foregroundColor(datum.color)}` }}>{datum.alias}</span></h3>
      <p>{datum.expenses_count} expense{datum.expenses_count > 1 && "s"}</p>
      <p>{numberFormat(datum.expenses_sum_amount, 2, "$")}</p>
    </div>
  }

  return (
    state.overview && <div className="overview-modal" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title="Expenses Overview" />
        <CardActions sx={{ p: "1rem", pt: 0 }}>
          <Button size="small" color="success" variant="contained" onClick={() => {
            localStorage.setItem("byAmount", !state.byAmount)
            setState(prev => ({...prev, byAmount: !state.byAmount }))
          }}>{state.byAmount ? "By Expenses" : "By Amount"}</Button>
        </CardActions>
        <CardContent>
          <ResponsiveContainer width={"100%"} height={400}>
            <BarChart data={data}>
              <YAxis width="auto" tickFormatter={(value) => !state.byAmount ? numberFormat(value, 0) : numberFormat(value, 2, "$")} />
              <XAxis dataKey={"alias"} tickSize={0} tickMargin={8} tick={{ fontSize: 14}} />
              <Tooltip content={DataTooltip} />
              <Bar dataKey={state.byAmount ? "expenses_sum_amount" : "expenses_count"}
                fill="#1976d2"
                activeBar={<Rectangle stroke="#f0f0f0" />}
              >
                {data.map((item, index) => <Cell key={`cell-${index}`} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        <CardActions sx={{ p: "1rem" }}>
          <Button color="error" type="button" variant="contained"  onClick={closeModal}>Close</Button>
        </CardActions>
      </Card>
    </div>
  )
}