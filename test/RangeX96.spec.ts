import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { RangeX96Test } from '../typechain/RangeX96Test'
import { expect } from './Uniswap/v3/shared/expect'
import bn from 'bignumber.js'
import { PRICES, WIDTHS, solveQuadratic, calcWidthFromPrices } from './utils'
// the "worst" numbers for calculations are prime numbers, so we'll use them
const PRIME_NUMBERS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]
const N = 10000
const Q96 = new bn(2).pow(96)
const bnN = new bn(N)
// calculate parameter width from given lower and upper price
const bnCalculateWidth = (bnPl: bn, bnPu: bn): bn => bnPu.minus(bnPl).multipliedBy(N).dividedBy(bnPu.plus(bnPl))

describe('RangeX96', () => {

    const MAX_PRICE = BigNumber.from(2).pow(160).sub(1)
    /*
    const WIDTHS_0_100 = [1, ...PRIME_NUMBERS]
    const WIDTHS_9100_10000 = WIDTHS_0_100.map(w => 10000 - w).reverse()
    const WIDTHS = [...WIDTHS_0_100, 1000, 3000, 5000, 7000, 9000, ...WIDTHS_9100_10000]
    const PRICES = [...PRIME_NUMBERS.map(e => new bn(e)), new bn(1), ...PRIME_NUMBERS.map(e => new bn(10).dividedBy(e))]
    */
    let rangeX96: RangeX96Test

    before('create test contract', async () => {
        const factory = await ethers.getContractFactory('RangeX96Test')
        rangeX96 = (await factory.deploy()) as RangeX96Test
    })


    it('it works with zero width', async () => {

        expect(await rangeX96.sqrtLowerPriceX96(0, 0)).to.eq(0)
        expect(await rangeX96.sqrtLowerPriceX96(1, 0)).to.eq(1)
        expect(await rangeX96.sqrtLowerPriceX96(N - 1, 0)).to.eq(N - 1)
        expect(await rangeX96.sqrtLowerPriceX96(N, 0)).to.eq(N)
        expect(await rangeX96.sqrtLowerPriceX96(N + 1, 0)).to.eq(N + 1)
        expect(await rangeX96.sqrtLowerPriceX96(MAX_PRICE, 0)).to.eq(MAX_PRICE)
        await expect(rangeX96.sqrtLowerPriceX96(MAX_PRICE.add(1), 0)).to.be.reverted
        expect(await rangeX96.sqrtUpperPriceX96(0, 0)).to.eq(0)
        expect(await rangeX96.sqrtUpperPriceX96(1, 0)).to.eq(1)
        expect(await rangeX96.sqrtUpperPriceX96(N - 1, 0)).to.eq(N - 1)
        expect(await rangeX96.sqrtUpperPriceX96(N, 0)).to.eq(N)
        expect(await rangeX96.sqrtUpperPriceX96(N + 1, 0)).to.eq(N + 1)
        expect(await rangeX96.sqrtUpperPriceX96(MAX_PRICE, 0)).to.eq(MAX_PRICE)
        await expect(rangeX96.sqrtUpperPriceX96(MAX_PRICE.add(1), 0)).to.be.reverted
    })

    it('it should revert if width >= N', async () => {
        await expect(rangeX96.sqrtLowerPriceX96(0, N)).to.be.reverted
        await expect(rangeX96.sqrtLowerPriceX96(0, N + 1)).to.be.reverted
        await expect(rangeX96.sqrtLowerPriceX96(1, N)).to.be.reverted
        await expect(rangeX96.sqrtLowerPriceX96(1, N + 1)).to.be.reverted
        await expect(rangeX96.sqrtLowerPriceX96(MAX_PRICE, N)).to.be.reverted
        await expect(rangeX96.sqrtLowerPriceX96(MAX_PRICE, N + 1)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(0, N)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(0, N + 1)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(1, N)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(1, N + 1)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(MAX_PRICE, N)).to.be.reverted
        await expect(rangeX96.sqrtUpperPriceX96(MAX_PRICE, N + 1)).to.be.reverted

    })


    describe('it should calculate lower price for given upper price', async () => {

        for (const width of WIDTHS) {
            for (const price of PRICES) {
                it(`lower price for upper price ${price.toFixed(4)} width = ${width}`, async () => {

                    // upper price
                    const bnPu = new bn(price)
                    // calculate square root of upper price in X96
                    const bnSqrtPu = bnPu.sqrt().multipliedBy(Q96)
                    // now call smart contract
                    const sqrtPl = await rangeX96.sqrtLowerPriceX96(BigNumber.from(bnSqrtPu.toFixed(0)), width)
                    // calculate price from square root of price in X96
                    const bnPl = new bn(sqrtPl.toString()).dividedBy(Q96).pow(2)
                    // calculate width
                    const bnWidth = bnCalculateWidth(bnPl, bnPu)
                    expect(Math.round(Number(bnWidth.toNumber()))).to.eq(width)

                })
            }
        }
    })


    describe('it should calculate upper price for given lower price', async () => {

        for (const width of WIDTHS) {
            for (const price of PRICES) {
                it(`upper price for lower price ${price.toFixed(4)} width = ${width}`, async () => {

                    // lower price
                    const bnPl = new bn(price)
                    // calculate square root of lower price in X96
                    const bnSqrtPl = bnPl.sqrt().multipliedBy(Q96)
                    // now call smart contract
                    const sqrtPu = await rangeX96.sqrtUpperPriceX96(BigNumber.from(bnSqrtPl.toFixed(0)), width)
                    // calculate price from square root of price in X96
                    const bnPu = new bn(sqrtPu.toString()).dividedBy(Q96).pow(2)
                    // calculate width
                    const bnWidth = bnCalculateWidth(bnPl, bnPu)
                    expect(Math.round(Number(bnWidth.toNumber()))).to.eq(width)



                })
            }
        }
    })

    describe('it should calculate upper and lower price for range over current price', async () => {
        
       
        for (const width of WIDTHS) {
            // console.log('test',solve(new bn(2),new bn(3), new bn(-5)).map( e => e.toNumber()) )
            for (const price of PRICES) {
                const amountIn0 = BigNumber.from(1234567)
                const amountIn1 = BigNumber.from(7654321)
                const bnAmountIn0 = new bn(amountIn0.toString())
                const bnAmountIn1 = new bn(amountIn1.toString())
                const bnPc = new bn(price)

                it(`it should calculate prices at ${bnPc.toFixed(4)} for width ${width}`, async () => {
                    const bnWidth = new bn(width)
                    const C = bnN.minus(bnWidth).dividedBy(bnN.plus(bnWidth)).sqrt();
                    // a,b,c for quadtratic equation
                    const bnA = C.multipliedBy(bnPc)
                    const bnB = bnAmountIn1.dividedBy(bnAmountIn0).minus(bnPc )
                    const bnC = bnAmountIn1.dividedBy(bnAmountIn0).multipliedBy(-1);
                    // solve quadtratic equation
                    const alphas = solveQuadratic(bnA,bnB,bnC)
                    expect(alphas.length).to.eq(2)
                    const alpha = alphas.find( alpha => alpha.gt(1) && alpha.multipliedBy(C).lt(1)) || new bn(0)
                    expect( alpha.toNumber()).gt(1)
                    // prices
                    const bnPu = bnPc.multipliedBy(alpha.pow(2))
                    const bnPl = bnPu.multipliedBy(C.pow(2))
                    expect( bnPl.toNumber()).lessThan( bnPc.toNumber())
                    expect( bnPu.toNumber()).greaterThan( bnPc.toNumber())
                    // width
                    const calcWidth = calcWidthFromPrices(bnPl,bnPu)
                    expect( bnPl.dividedBy(bnPu).toNumber()).eq( new bn(N).minus(calcWidth).dividedBy(calcWidth.plus(N)).toNumber())
                    expect(calcWidth.toNumber()).to.eq(bnWidth.toNumber())
                    // call contract
                    const bnSqrtPc = bnPc.sqrt().multipliedBy(Q96)
                    const sqrtPc = BigNumber.from(bnSqrtPc.toFixed(0))
                    const {sqrtPlX96,sqrtPuX96} = await rangeX96.priceRangeForWidth( sqrtPc, BigNumber.from(width), amountIn0, amountIn1)
                    // rounding  errors
                    const maxError = new bn(10).pow(12) // 10^-12
                    const errPl = new bn(sqrtPlX96.toString()).dividedBy(Q96).minus(bnPl.sqrt()).absoluteValue()
                    const maxErrPl = bnPl.sqrt().dividedBy( maxError)
                    expect( errPl.lte(maxErrPl)).to.be.true
                    const errPu = new bn(sqrtPuX96.toString()).dividedBy(Q96).minus(bnPu.sqrt()).absoluteValue()
                    const maxErrPu = bnPu.sqrt().dividedBy( maxError)
                    expect( errPu.lte(maxErrPu)).to.be.true
                 })
            }
        }

    })



})