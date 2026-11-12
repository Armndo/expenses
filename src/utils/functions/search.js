/** Lowercase text without accents, to compare what the user types with names whatever the case or the accents. */
export function normalizeText(value) {
  return `${value ?? ""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** The categories whose name or alias holds what was typed (all of them when it is empty). */
export function filterCategories(categories, query) {
  const needle = normalizeText(query)

  if (needle === "") {
    return categories
  }

  const matches = categories.filter(category => normalizeText(category.name).includes(needle) || normalizeText(category.alias).includes(needle))

  // The ones whose name starts with it first (typing "car" offers Car before Healthcare); the rest keep their order.
  return [...matches.filter(category => normalizeText(category.name).startsWith(needle)), ...matches.filter(category => !normalizeText(category.name).startsWith(needle))]
}
