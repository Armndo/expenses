import { formatNumber } from "./formatNumber"

export function numberFormat(number, decimals = 2, prefix = null, errorString = "-") {
  number = +number

  if(isNaN(number)) {
    return errorString
  }

  let res = ""
  let negative = false;

  if (number < 0) {
    negative = true
    number = -number
  }

  if (negative) {
    res += "-"
  }

  if (prefix) {
    res += prefix
  }

  return res + formatNumber(number.toFixed(decimals))
}