/** Shared exact-integer digit helpers. No floating point anywhere. */

/** Digits of a non-negative integer, ones first. `0` yields `[0]`. */
export function digitsOf(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`digitsOf: expected a non-negative integer, got ${n}`);
  }
  if (n === 0) return [0];
  const digits: number[] = [];
  let rest = n;
  while (rest > 0) {
    digits.push(rest % 10);
    rest = Math.floor(rest / 10);
  }
  return digits;
}

/** Digit at a given place (0 = ones), 0 if beyond the number's length. */
export function digitAt(n: number, place: number): number {
  const digits = digitsOf(n);
  return place < digits.length ? digits[place] : 0;
}

/** Reassembles ones-first digits back into an integer. */
export function digitsToNumber(digitsOnesFirst: number[]): number {
  let value = 0;
  for (let i = digitsOnesFirst.length - 1; i >= 0; i--) {
    value = value * 10 + digitsOnesFirst[i];
  }
  return value;
}

/** Formats an integer with a thin space ( ) as the thousands separator, as Swedish textbooks do. */
export function formatSwedishNumber(n: number): string {
  const negative = n < 0;
  const s = Math.abs(n).toString();
  const groups: string[] = [];
  for (let end = s.length; end > 0; end -= 3) {
    groups.unshift(s.slice(Math.max(0, end - 3), end));
  }
  return (negative ? "-" : "") + groups.join(" ");
}
