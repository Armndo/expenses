/**
 * After saving, the month on screen becomes the one the record falls in: the API answers `period` (`YYYY-MM`, by the cutoff of the source)
 * and the page reloads from the date saved in `localStorage`, like `selectMonth`. A missing or odd `period` (an API that does not send it)
 * changes nothing.
 */
export function rememberPeriod(period) {
  if (typeof period === "string" && /^\d{4}-\d{2}$/.test(period)) {
    localStorage.setItem("date", `${period}-02`)
  }
}
