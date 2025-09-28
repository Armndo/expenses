import { Button, Card, CardActions, CardContent, CardHeader, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import { Bar, BarChart, Cell, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function OverviewModal({ state, setState }) {
  function closeModal() {
    setState(prev => ({
      ...prev,
      overview: false,
    }))
  }

  const data = state.categories.filter(item => item.expenses_count > 0)
  data.sort((a, b) => b?.expenses_count - a?.expenses_count)

  function itemLabel({ payload, x, y, width, heigth, value }) {
    return <text x={x + width / 2} y={y} fill="#000" color="#f00" dy={16} textAnchor="middle">{value}</text>;
  }

  function DataTooltip({ active, payload, label }) {
    const shown = active && payload?.[0]?.payload
    const datum = payload?.[0]?.payload
    console.log(active, payload, label);
    return shown && <div style={{ padding: "1rem", background: "#f0f0f0" }}>
      <p>{datum.alias} {datum.name}</p>
      Expenses: {datum.expenses_count}
    </div>
  }

  return (
    state.overview && <div className="overview-modal" onClick={closeModal}>
      <Card elevation={5} sx={{ borderRadius: "1rem" }} onClick={e => e.stopPropagation()}>
        <CardHeader title="Expenses Overview" />
        <CardContent>
          <ResponsiveContainer width={"100%"} height={400}>
            <BarChart data={data}>
              <XAxis dataKey={"alias"} tickSize={0} tickMargin={8} tick={{ fontSize: 14}}
                // interval={0} 
              />
              <Tooltip content={DataTooltip} />
              <Legend />
              <Bar dataKey={"expenses_count"}
                // fillRule="evenodd"
                fill="#1976d2"
                // label={itemLabel}
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