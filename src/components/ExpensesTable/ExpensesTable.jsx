import { ExpenseItem } from "@/components"
import { formatNumber } from "@/utils/functions"

export function ExpensesTable({ state, setState }) {
  return (
    state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).length > 0 ?
    <div className="expenses-container">
      <table border={1}>
        <thead>
          <tr>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <th colSpan={state.simple ? 1 : 4}>{source.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array(state.sources.reduce((a, b) => b.expenses_count > a ? b.expenses_count : a, 0) + state.sources.reduce((a, b) => b.instalments_count > a ? b.instalments_count : a, 0)).fill(state.sources.reduce((a, b) => b.expenses_count > a ? b.expenses_count : a, 0)).map((offset, index) => 
            <ExpenseItem
              index={index}
              offset={offset}
              state={state}
              setState={setState}
            />
          )}
        </tbody>
        <tfoot>
          {state.sources.filter(source => source.expenses.length > 0).length > 0 && <tr>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <td colSpan={state.simple ? 1 : 4}>
              {formatNumber(source.expenses.reduce((a, b) => a + b.amount, 0).toFixed(2), "$")}
            </td>)}
          </tr>}
          {state.sources.filter(source => source.instalments.length > 0).length > 0 && <tr>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <td className={!(state.sources.filter(source => source.expenses.length > 0).length > 0 ^ state.sources.filter(source => source.instalments.length > 0).length > 0) ? "instalment" : null} colSpan={state.simple ? 1 : 4}>
              {formatNumber(source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0).toFixed(2), "$")}
            </td>)}
          </tr>}
          {!(state.sources.filter(source => source.expenses.length > 0).length > 0 ^ state.sources.filter(source => source.instalments.length > 0).length > 0) ? <tr>
            {state.sources.filter(source => source.expenses.length > 0 || source.instalments.length > 0).map(source => <td colSpan={state.simple ? 1 : 4}>
              {formatNumber((source.expenses.reduce((a, b) => a + b.amount, 0) + source.instalments.reduce((a, b) => a + b.amount / b.instalments, 0)).toFixed(2), "$")}
            </td>)}
          </tr> : null}
        </tfoot>
      </table>
    </div> :
    <div className="expenses-container">
      <h2>no expenses recorded</h2>
    </div>
  )
}