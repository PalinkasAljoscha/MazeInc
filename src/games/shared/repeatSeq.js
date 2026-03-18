/**
 * Returns { unit, start } if the string `s` contains any immediately
 * repeated unit (e.g. "ABRULR" → null, "LRULRU" → { unit:'LRU', start:0 }).
 * Searches from shortest unit length (1) up to floor(n/2) so the first
 * (shortest, earliest) repeat is returned.
 * Returns null when no repeat is found.
 *
 * Used by NewWays and LadderToInfinity to enforce the no-repeat-sequence rule.
 */
export function findRepeatSeq(s) {
  const n = s.length
  for (let unitLen = 1; unitLen <= Math.floor(n / 2); unitLen++) {
    for (let start = 0; start <= n - 2 * unitLen; start++) {
      const unit = s.slice(start, start + unitLen)
      if (s.slice(start + unitLen, start + 2 * unitLen) === unit) {
        return { unit, start }
      }
    }
  }
  return null
}
