import bn from 'bignumber.js'
export * from './parameters'
import {N} from './parameters'
const bnN = new bn(N)
/**
 * @dev Solve a*x^2 + b*x + c = 0
 * @param a 
 * @param b 
 * @param c 
 * @returns x1,x2
 */
export const solveQuadratic = (a:bn,b:bn, c:bn) : bn[] => {
    // a*x^2 + b*x + c = 0
    const b2 =  b.pow(2)
    const ac4 = a.multipliedBy(c).multipliedBy(4)
    const d = b2.minus(ac4)
    if ( d.lt(0) ) return [];
    const sqrtD = d.sqrt()
    const divider = a.multipliedBy(2)
    const x1 = b.multipliedBy(-1).minus(sqrtD).dividedBy(divider);
    const x2 = b.multipliedBy(-1).plus(sqrtD).dividedBy(divider);

    return [x1,x2]
}

export const calcWidthFromPrices = (bnPl: bn, bnPu: bn) : bn => {
    return bnPu.minus(bnPl).dividedBy(bnPu.plus(bnPl)).multipliedBy(bnN);
}