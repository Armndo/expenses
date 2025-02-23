export function standardDate(date = new Date()) {
  let [year, month, day] = [date.getFullYear(), date.getMonth()+1, date.getDate()]
  month = month < 10 ? `0${month}` : month
  day = day < 10 ? `0${day}` : day

  return `${year}-${month}-${day}`
}