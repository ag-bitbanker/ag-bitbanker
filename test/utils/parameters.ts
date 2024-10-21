import bn from 'bignumber.js'
const LONG = false // long or short list
export const N = 10000
// the "worst" numbers for calculations are prime numbers, so we'll use them. Exclude 11
const PRIME_NUMBERS_SHORT = [2, 3, 5, 7]
const PRIME_NUMBERS_LONG = [ ...PRIME_NUMBERS_SHORT, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]
const PRIME_NUMBERS = LONG ? PRIME_NUMBERS_LONG : PRIME_NUMBERS_SHORT
export const WIDTHS = [1, ...PRIME_NUMBERS.map( e => e*31), ...PRIME_NUMBERS.map( e => N-e*37)].sort()
export const PRICES = [...PRIME_NUMBERS.map(e => new bn(e).dividedBy(11)), new bn(1), ...PRIME_NUMBERS.map(e => new bn(e))].sort( (a,b) => a.comparedTo(b))
    .sort((a, b) => a.comparedTo(b))
  