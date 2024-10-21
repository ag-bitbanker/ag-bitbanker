import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { LiquidityX96Test } from '../typechain/LiquidityX96Test'
import { RangeX96Test } from '../typechain/RangeX96Test'
import bn from 'bignumber.js'
import { expect } from 'chai'
import { solveQuadratic, calcWidthFromPrices, PRICES, WIDTHS } from './utils'

const Q96 = new bn(2).pow(96)
const N = 10000

describe('LiquidityX96', () => {


    let liquidityX96: LiquidityX96Test


    before('create test contract', async () => {
        const factory = await ethers.getContractFactory('LiquidityX96Test')
        liquidityX96 = (await factory.deploy()) as LiquidityX96Test
    })

    describe('Range above current price', async () => {
        // LIMIT SELL
        const bnPl = new bn(1).dividedBy(99)
        const bnSqrtPl = bnPl.sqrt().multipliedBy(Q96)
        const amount = BigNumber.from(123456789)
        for (const price of PRICES.filter(e => e.isGreaterThan(bnPl))) {
            it(`it should calculate liquidity for price range [${bnPl.toFixed(8)},${price.toFixed(8)}]`, async () => {
                // upper price
                const bnPu = new bn(price)
                // calculate square root of upper price in X96
                const bnSqrtPu = bnPu.sqrt().multipliedBy(Q96)

                // calculate liquidity delta
                const liquidity = await liquidityX96.liquidityForRegionAboveCurrentPrice(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), amount)

                const amount0 = await liquidityX96.getAmount0Delta(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), liquidity, true)

                // resulting amount0 should be less or equal to amount
                expect(amount0).to.be.lte(amount)
                // resulting amount0 should be as close as possible to amount 
                // with precision bigger then 0.0000001 (rounding)
                expect(amount.sub(amount0).mul(1_000_000).div(amount).toNumber()).eq(0)

            })

        }

    })


    describe('Range below current price', async () => {
        // LIMIT BUY
        const bnPu = new bn(99)
        const bnSqrtPu = bnPu.sqrt().multipliedBy(Q96)
        const amount = BigNumber.from(123456789)
        for (const price of PRICES.filter(e => e.isLessThan(bnPu))) {
            it(`it should calculate liquidity for price range [${price.toFixed(8)},${bnPu.toFixed(8)}]`, async () => {
                // lower price
                const bnPl = new bn(price)
                // calculate square root of lower price in X96
                const bnSqrtPl = bnPl.sqrt().multipliedBy(Q96)

                // calculate liquidity delta
                const liquidity = await liquidityX96.liquidityForRegionBelowCurrentPrice(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), amount)

                const amount1 = await liquidityX96.getAmount1Delta(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), liquidity, true)

                // resulting amount1 should be less or equal to amount
                expect(amount1).to.be.lte(amount)
                // resulting amount1 should be as close as possible to amount 
                // with precision bigger then 0.0000001 (rounding)
                expect(amount.sub(amount1).mul(1_000_000).div(amount).toNumber()).eq(0)

            })

        }

    })

    describe('Range at current price', async () => {
        for (const price of PRICES) {
            const bnPc = price; // current price
            const bnPl = price.minus(price.multipliedBy(0.0001)); // one tick below current price
            const bnPu = price.plus(price.multipliedBy(0.0001));  // one tick above current price

            const amountIn0 = BigNumber.from(10_000)
            const amountIn1 = BigNumber.from(10_000)
            it(`it should calculate liquidity at price ${bnPc.toFixed(4)} in range [${bnPl.toFixed(4)},${bnPu.toFixed(4)}]`, async () => {
                // calculate square root of prices in X96
                const bnSqrtPl = bnPl.sqrt().multipliedBy(Q96)
                const bnSqrtPc = bnPc.sqrt().multipliedBy(Q96)
                const bnSqrtPu = bnPu.sqrt().multipliedBy(Q96)
                // calculate liquidity delta
                const liquidity = await liquidityX96.liquidityForRegionAtCurrentPrice(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPc.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), amountIn0, amountIn1);

                const amountOut0 = await liquidityX96.getAmount0Delta(
                    BigNumber.from(bnSqrtPc.toFixed(0)),
                    BigNumber.from(bnSqrtPu.toFixed(0)), liquidity, true)

                const amountOut1 = await liquidityX96.getAmount1Delta(
                    BigNumber.from(bnSqrtPl.toFixed(0)),
                    BigNumber.from(bnSqrtPc.toFixed(0)), liquidity, true)

          
                expect( amountOut0.lte(amountIn0)).to.be.true
                expect( amountOut1.lte(amountIn1)).to.be.true
                
                const delta0 = amountIn0.sub(amountOut0);
                const delta1 = amountIn1.sub(amountOut1);
                const delta = Math.min(delta0.toNumber(), delta1.toNumber());
                expect(delta).to.be.lte(1)    
                
            })
        }

    })
    describe('Range covers current price', async () => {


        for (const width of WIDTHS) {

            for (const price of PRICES) {
                const amountIn0 = BigNumber.from(1234567)
                const amountIn1 = BigNumber.from(7654321)

                const bnPc = new bn(price)
                it(`it should calculate liquidity at ${bnPc.toFixed(4)} for width ${width}`, async () => {
                    // sqrt of current price 
                    const sqrtPcX6 = BigNumber.from(bnPc.sqrt().multipliedBy(Q96).toFixed(0))

                    // calculate liquidity delta
                    const { liquidityDelta, sqrtPlX96, sqrtPuX96 } =
                        await liquidityX96.liquidityForWidth(sqrtPcX6, width, amountIn0, amountIn1);

                    // calculate amounts for given liquidity
                    const amountOut0 =
                        await liquidityX96.getAmount0Delta(sqrtPcX6, sqrtPuX96, liquidityDelta, true)

                    const amountOut1 =
                        await liquidityX96.getAmount1Delta(sqrtPlX96, sqrtPcX6, liquidityDelta, true)

                    expect(amountOut0).lte(amountIn0)
                    expect(amountOut1).lte(amountIn1)
                    // rounding
                    expect(amountIn0.sub(amountOut0)).lte(BigNumber.from(1))
                    expect(amountIn1.sub(amountOut1)).lte(BigNumber.from(1))

                })

            }
        }
    })
})