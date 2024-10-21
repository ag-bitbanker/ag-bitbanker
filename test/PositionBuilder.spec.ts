
import bn from 'bignumber.js'
import { ethers, waffle } from 'hardhat'
import { BigNumber, constants, Wallet } from 'ethers'
import { calcWidthFromPrices, PRICES, WIDTHS } from './utils'
import { poolFixture } from './Uniswap/v3/shared/fixtures'
import { TestERC20 } from '../typechain/TestERC20'
import { PositionBuilder } from '../typechain/PositionBuilder'
import { MockTimeUniswapV3Pool } from '../typechain/MockTimeUniswapV3Pool'
import {
    encodePriceSqrt,
    FeeAmount,
    TICK_SPACINGS,
} from './Uniswap/v3/shared/utilities'
import { expect } from './Uniswap/v3/shared/expect'

const Q96 = new bn(2).pow(96)
const N = 10000

const createFixtureLoader = waffle.createFixtureLoader
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T

describe('Position builder', () => {
    let wallet: Wallet, other: Wallet
    let loadFixture: ReturnType<typeof createFixtureLoader>
    let createPool: ThenArg<ReturnType<typeof poolFixture>>['createPool']
    let token0: TestERC20
    let token1: TestERC20
    let positionBuilder: PositionBuilder;

    const pools = new Map<number, MockTimeUniswapV3Pool>();
    let pool: MockTimeUniswapV3Pool
    let tickSpacing: number;

    before('create fixture loader', async () => {
        ;[wallet, other] = await (ethers as any).getSigners()
        loadFixture = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy fixture', async () => {
        ({ token0, token1, createPool } = await loadFixture(poolFixture))
        // create pools for differns tick spacing : 10 bips, 30 bips, 100 bips 
        for (const feeAmount of [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH]) {
            const tickSpacing = TICK_SPACINGS[feeAmount]
            const pool = await createPool(feeAmount, tickSpacing)
            pools.set(tickSpacing, pool)
        }
        // create PositionBuilder contract
        const contractFactory = await ethers.getContractFactory('PositionBuilder')
        positionBuilder = (await contractFactory.deploy()) as PositionBuilder

    })


    describe('Check input parameters', async () => {
        beforeEach('select pool', async () => {
            pool = pools.get(TICK_SPACINGS[FeeAmount.MEDIUM]) as MockTimeUniswapV3Pool;
            await pool.initialize(encodePriceSqrt(1, 7))
            // allowance
            await token0.approve(positionBuilder.address, constants.MaxUint256)
            await token1.approve(positionBuilder.address, constants.MaxUint256)
            await token0.approve(pool.address, constants.MaxUint256)
            await token1.approve(pool.address, constants.MaxUint256)
        })

        it(`it should revert if width >= ${N}`, async () => {
            await expect(positionBuilder.createPosition(pool.address, N, 123456, 654321)).to.be.revertedWith('INVALID_WIDTH')
            await expect(positionBuilder.createPosition(pool.address, N + 1, 123456, 654321)).to.be.revertedWith('INVALID_WIDTH')
        })

        it(`it should revert if amount0 = 0 and amount1 = 0`, async () => {
            await expect(positionBuilder.createPosition(pool.address, 1, 0, 0)).to.be.reverted
        })

    })

    
    
    describe('Special case 1: amount0 = 0', async () => {
        
       

        const balances = async () : Promise<[BigNumber,BigNumber]> => {
            return ( token0.address == await pool.token0()) ?
                [await token0.balanceOf(wallet.address),await token1.balanceOf(wallet.address)] :
                [await token1.balanceOf(wallet.address),await token0.balanceOf(wallet.address)]
            
        }

        beforeEach('select pool', async () => {
            pool = pools.get(TICK_SPACINGS[FeeAmount.MEDIUM]) as MockTimeUniswapV3Pool;
             // allowance
            await token0.approve(positionBuilder.address, constants.MaxUint256)
            await token1.approve(positionBuilder.address, constants.MaxUint256)

            tickSpacing = await pool.tickSpacing()
        })

        for (const price of PRICES) {
            for (const width of [0, ...WIDTHS]) {
                it(`it should create position for price ${price.toFixed(4)} and width ${width}`, async () => {
                    const bnSqrtPc = price.sqrt().multipliedBy(Q96).integerValue(3)
                    const amount0 = 0
                    const amount1 = 7654321
                    
                    const balancesBefore = await balances()
                     
                    // initialize pool with given price
                    await pool.initialize( BigNumber.from( bnSqrtPc.toString()))
                    const {sqrtPlX96,
                    sqrtPuX96,
                    amount1Owed} = await positionBuilder.callStatic.createPosition( pool.address, width, amount0, amount1)
                    //console.log(liquidityDelta.toNumber(),tickPl,tickPu,amount0Owed.toNumber(), amount1Owed.toNumber())
                    //console.log(new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2).toNumber(),new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2).toNumber(), bnSqrtPc.dividedBy(Q96).pow(2).toNumber())
                    const tx = await positionBuilder.createPosition( pool.address, width, amount0, amount1)
                    await tx.wait()
                  
                    const balancesAfter = await balances()
                    // check amounts
                    // console.log('token0', balancesBefore[0].sub(balancesAfter[0]).toNumber())
                    // console.log('token1', balancesBefore[1].sub(balancesAfter[1]).toNumber())
                    // we don't consume token0
                    expect( balancesBefore[0]).to.eq(balancesAfter[0]);
                    expect( balancesBefore[1].sub(balancesAfter[1])).to.eq(amount1Owed)
                    // token1 amount1Owed should be equal to amount1 with rounding precision 
                    expect( amount1Owed.sub(amount1).lte(2)).to.be.true
                    // check width
                    const bnPl = new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2)
                    const bnPu = new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2)
                    const effectiveWidth = calcWidthFromPrices( bnPl, bnPu)
                    // effective width should be equal to requested width with the rounding precison tickSpacing / 2
                    expect( Math.abs(width-effectiveWidth.toNumber())).to.lte(tickSpacing / 2)
                })
            }
        }

    })

    describe('Special case 2: amount1 = 0', async () => {
        
        let tickSpacing : number;

        const balances = async () : Promise<[BigNumber,BigNumber]> => {
            return ( token0.address == await pool.token0()) ?
                [await token0.balanceOf(wallet.address),await token1.balanceOf(wallet.address)] :
                [await token1.balanceOf(wallet.address),await token0.balanceOf(wallet.address)]
            
        }

        beforeEach('select pool', async () => {
            pool = pools.get(TICK_SPACINGS[FeeAmount.MEDIUM]) as MockTimeUniswapV3Pool;
             // allowance
            await token0.approve(positionBuilder.address, constants.MaxUint256)
            await token1.approve(positionBuilder.address, constants.MaxUint256)

            tickSpacing = await pool.tickSpacing()
        })

        for (const price of PRICES) {
            for (const width of [0, ...WIDTHS]) {
                it(`it should create position for price ${price.toFixed(4)} and width ${width}`, async () => {
                    const bnSqrtPc = price.sqrt().multipliedBy(Q96).integerValue(3)
                    const amount0 = 7654321
                    const amount1 = 0
                    
                    const balancesBefore = await balances()
                     
                    // initialize pool with given price
                    await pool.initialize( BigNumber.from( bnSqrtPc.toString()))
                    const {sqrtPlX96,
                    sqrtPuX96,
                    amount0Owed} = await positionBuilder.callStatic.createPosition( pool.address, width, amount0, amount1)
                    //console.log(liquidityDelta.toNumber(),tickPl,tickPu,amount0Owed.toNumber(), amount1Owed.toNumber())
                    //console.log(new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2).toNumber(),new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2).toNumber(), bnSqrtPc.dividedBy(Q96).pow(2).toNumber())
                    const tx = await positionBuilder.createPosition( pool.address, width, amount0, amount1)
                    await tx.wait()
                  
                    const balancesAfter = await balances()
                    // check amounts
                    // console.log('token0', balancesBefore[0].sub(balancesAfter[0]).toNumber())
                    // console.log('token1', balancesBefore[1].sub(balancesAfter[1]).toNumber())
                    // we don't consume token1
                    expect( balancesBefore[1]).to.eq(balancesAfter[1]);
                    expect( balancesBefore[0].sub(balancesAfter[0])).to.eq(amount0Owed)
                    // token1 amount1Owed should be equal to amount1 with rounding precision 
                    expect( amount0Owed.sub(amount0).lte(2)).to.be.true
                    // check width
                    const bnPl = new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2)
                    const bnPu = new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2)
                    const effectiveWidth = calcWidthFromPrices( bnPl, bnPu)
                    // effective width should be equal to requested width with the rounding precison tickSpacing / 2
                    expect( Math.abs(width-effectiveWidth.toNumber())).to.lte(tickSpacing / 2)
                })
            }
        }

    })
        



    describe('Normal case: amount0 > 0 and amount1 > 0', async () => {
        const amount0 = 10_000
        const amount1 = 15_000
        const balances = async (): Promise<[BigNumber, BigNumber]> => {
            return (token0.address == await pool.token0()) ?
                [await token0.balanceOf(wallet.address), await token1.balanceOf(wallet.address)] :
                [await token1.balanceOf(wallet.address), await token0.balanceOf(wallet.address)]

        }

        for (const price of PRICES) {
            it(`it should create position for price ${price.toFixed(4)} and 0 width`, async () => {
                pool = pools.get(TICK_SPACINGS[FeeAmount.MEDIUM]) as MockTimeUniswapV3Pool;
                // allowance
                await token0.approve(positionBuilder.address, constants.MaxUint256)
                await token1.approve(positionBuilder.address, constants.MaxUint256)

                tickSpacing = await pool.tickSpacing()

                const bnSqrtPc = price.sqrt().multipliedBy(Q96).integerValue(3)
                await pool.initialize(BigNumber.from(bnSqrtPc.toString()))
                const { sqrtPlX96,
                    sqrtPuX96,
                    amount0Owed, amount1Owed } = await positionBuilder.callStatic.createPosition(pool.address, 0, amount0, amount1)

                const balancesBefore = await balances()

                const tx = await positionBuilder.createPosition(pool.address, 0, amount0, amount1)
                await tx.wait()

                const balancesAfter = await balances()

                // amounts. we should completeley consume at least one amount 
                expect(balancesBefore[0].sub(balancesAfter[0])).to.eq(amount0Owed)
                expect(balancesBefore[1].sub(balancesAfter[1])).to.eq(amount1Owed)
                expect(amount0Owed.toNumber()).to.lte(amount0)
                expect(amount1Owed.toNumber()).to.lte(amount1)
                const delta0 = BigNumber.from(amount0).sub(amount0Owed);
                const delta1 = BigNumber.from(amount1).sub(amount1Owed);
                const delta = Math.min(delta0.toNumber(), delta1.toNumber());
                expect(delta).to.be.lte(1)

                // width
                const bnPl = new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2)
                const bnPu = new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2)
                const effectiveWidth = calcWidthFromPrices(bnPl, bnPu)
                // effective width should be equal to requested width with the rounding precison tickSpacing
                expect(effectiveWidth.toNumber()).to.lte(tickSpacing);

            })
        }


        for (const price of PRICES) {
            for (const width of WIDTHS) {
                it(`it should create position for price ${price.toFixed(4)} and width ${width}`, async () => {
                    pool = pools.get(TICK_SPACINGS[FeeAmount.MEDIUM]) as MockTimeUniswapV3Pool;
                    // allowance
                    await token0.approve(positionBuilder.address, constants.MaxUint256)
                    await token1.approve(positionBuilder.address, constants.MaxUint256)

                    tickSpacing = await pool.tickSpacing()
                    const bnSqrtPc = price.sqrt().multipliedBy(Q96).integerValue(3)
                    await pool.initialize(BigNumber.from(bnSqrtPc.toString()))

                    const { sqrtPlX96,
                        sqrtPuX96,
                        amount0Owed, amount1Owed } = await positionBuilder.callStatic.createPosition(pool.address, width, amount0, amount1);
                    const balancesBefore = await balances()

                    const tx = await positionBuilder.createPosition(pool.address, width, amount0, amount1)
                    await tx.wait()

                    const balancesAfter = await balances()

                    // amounts. we should completeley consume at least one amount 
                    expect(balancesBefore[0].sub(balancesAfter[0])).to.eq(amount0Owed)
                    expect(balancesBefore[1].sub(balancesAfter[1])).to.eq(amount1Owed)
                    expect(amount0Owed.toNumber()).to.lte(amount0)
                    expect(amount1Owed.toNumber()).to.lte(amount1)
                    const delta0 = BigNumber.from(amount0).sub(amount0Owed);
                    const delta1 = BigNumber.from(amount1).sub(amount1Owed);
                    const delta = Math.min(delta0.toNumber(), delta1.toNumber());
                    expect(delta).to.be.lte(1)
                    // width
                    const bnPl = new bn(sqrtPlX96.toString()).dividedBy(Q96).pow(2)
                    const bnPu = new bn(sqrtPuX96.toString()).dividedBy(Q96).pow(2)
                    const effectiveWidth = calcWidthFromPrices(bnPl, bnPu)
                    expect(Math.abs(effectiveWidth.toNumber() - width)).to.lte(tickSpacing);

                })
            }
        }

    })



})