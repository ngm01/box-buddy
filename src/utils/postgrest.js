// Filter value for a case-insensitive "contains" match inside a PostgREST
// logical expression (or=/and=), e.g. `name.ilike.${ilikeContains(term)}`.
//
// User input can't go in raw: a comma or parenthesis splits or closes the
// expression, and LIKE treats % and _ as wildcards. So escape LIKE's
// specials first, then double-quote the whole value, escaping the
// backslashes and quotes that PostgREST would otherwise read itself.
export const ilikeContains = (term) => {
  const likeLiteral = String(term).replace(/[\\%_]/g, '\\$&')
  return `"*${likeLiteral.replace(/[\\"]/g, '\\$&')}*"`
}
