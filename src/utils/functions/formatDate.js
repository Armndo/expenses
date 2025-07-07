export function formatDate(date) {
  if (!date) {
    return "-"
  }

  const [y, m, d] = date.split("-")

  return `${d}/${m}/${y}`
}