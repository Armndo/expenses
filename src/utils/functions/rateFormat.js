import { numberFormat } from "./numberFormat"

/** An exchange rate with 2 to 3 decimals: 18.3991 -> "$18.399", 17.5 -> "$17.50". */
export function rateFormat(rate) {
  return numberFormat(rate, 3, "$").replace(/0$/, "")
}
