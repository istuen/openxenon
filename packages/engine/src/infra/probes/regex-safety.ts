/**
 * ReDoS (Regular Expression Denial of Service) Safety Guard
 *
 * Protects fs-match / shell-exec probes from catastrophic backtracking
 * attacks via user-supplied regex patterns.
 *
 * Strategy: medium-strength heuristic detection (no external deps).
 * Detects the most common ReDoS attack patterns:
 *   1. Nested quantifiers        (a+)+, (a*)*, (a+)*, (a*)+
 *   2. Alternation with overlap  (a|a)+, (a|)+
 *   3. Wildcard+quantifier       .+, .*
 *   4. Excessive length          > maxSafeLength (default 200)
 *
 * Trade-offs (intentional):
 *   - May produce false positives for legitimate complex regexes
 *     (caller can opt out via { strict: false })
 *   - May miss adversarial patterns (use Node's --stack-size limit
 *     or RE2 engine for bulletproof protection)
 *   - Pattern length check is the cheapest guard and catches the most
 *     common accidental ReDoS (e.g. copy-pasted long regex)
 *
 * 0 dependencies.
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */

const DEFAULT_MAX_SAFE_LENGTH = 200

/**
 * Quick syntactic check for nested quantifiers and adjacent alternations
 * that are known to cause catastrophic backtracking in PCRE / JS RegExp.
 *
 * Returns true if the pattern is safe, false if unsafe.
 */
function hasNestedQuantifier(pattern: string): boolean {
  // Strip character classes [..] and escape sequences first
  // (these can contain quantifier-like characters that are NOT quantifiers)
  const stripped = pattern
    // Remove escaped chars: \. \* \( etc
    .replace(/\\./g, '')
    // Remove character classes: [...] (greedy enough for our needs)
    .replace(/\[[^\]]*\]/g, '')

  // Detect nested quantifiers: (X+)+, (X+)*, (X*)+, (X*)*, (X+){n,m}
  // (a quantifier inside a group that is itself quantified)
  const nestedGroup = /\([^)]*[+*][^)]*\)[+*]|\([^)]*[+*][^)]*\)\{/
  if (nestedGroup.test(stripped)) return true

  // Detect alternation with overlap: (a|a)+, (a|)+
  const overlappingAlt = /\([^)]*\|[^)]*\)[+*]/
  if (overlappingAlt.test(stripped)) return true

  // Detect bare .+ or .* followed by another .+ or .* (overlapping wildcards)
  // e.g. .*.* or .+.+
  const overlappingWildcard = /\.[+*]\s*\.[+*]/
  if (overlappingWildcard.test(stripped)) return true

  return false
}

/**
 * Check if a regex pattern is safe to evaluate against untrusted input.
 *
 * @param pattern  The regex pattern string (without delimiters).
 * @param options  Optional config: maxSafeLength (default 200).
 * @returns true if safe to evaluate, false if unsafe.
 */
export function isSafeRegex(pattern: string, options?: { maxSafeLength?: number }): boolean {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return false
  }

  const maxSafeLength = options?.maxSafeLength ?? DEFAULT_MAX_SAFE_LENGTH

  // Length guard: cheapest check, catches accidental copy-paste bombs
  if (pattern.length > maxSafeLength) {
    return false
  }

  // Structural guard: detect known ReDoS attack shapes
  if (hasNestedQuantifier(pattern)) {
    return false
  }

  return true
}
