/** Prefix for the amounts of a currency: plain `$` for pesos, `US$` for dollars. */
export function currencySymbol(currency) {
  return { MXN: "$", USD: "US$" }[currency ?? "MXN"] ?? `${currency} `
}
