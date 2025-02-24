import { formatNumber } from "./formatNumber"

export function autoRange(number, decimals = 2, direct = true, errorString = "-") {
  if(isNaN(number)) {
    return errorString
  }

  let res = number
  let suffix = ""
  if(Math.abs(number/1000000000) >= 1) {
    res = number/1000000000
    suffix = "B"
  } else if(Math.abs(number/1000000) >= 1) {
    res = number/1000000
    suffix = "M"
  } else if(Math.abs(number/1000) >= 1) {
    res = number/1000
    suffix = "K"
  }

  return direct ? formatNumber(res.toFixed(decimals)) + suffix : [formatNumber(res.toFixed(decimals)), suffix]
}