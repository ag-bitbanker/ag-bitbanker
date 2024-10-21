import { ethers, waffle } from 'hardhat'
import { MathI24Test } from '../typechain/MathI24Test'
import { expect } from './Uniswap/v3/shared/expect'

describe('MathI24', () => {
    // from MathI24.Round enum
    const ROUND_AUTO = 0
    const ROUND_UP = 1
    const ROUND_DOWN = 2
    const tickSpacing = 60
    // test contract
    let mathI24: MathI24Test

    before('create test contract', async () => {
        const factory = await ethers.getContractFactory('MathI24Test')
        mathI24 = (await factory.deploy()) as MathI24Test
    })


    it('Round up positive', async () => {
       
        const exact =  284*tickSpacing;
        expect(await mathI24.round(exact, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing +1, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_UP)).to.be.eq(exact +2*tickSpacing)
    })

    it('Round up negative', async () => {
        const exact =  -284*tickSpacing;
        expect(await mathI24.round(exact, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing +1, tickSpacing, ROUND_UP)).to.be.eq(exact)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing, tickSpacing, ROUND_UP)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_UP)).to.be.eq(exact +2*tickSpacing)
   
    })

   
    it('Round down positive', async () => {
        const exact =  284*tickSpacing;
        expect(await mathI24.round(exact, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact - tickSpacing +1, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_DOWN)).to.be.eq(exact + tickSpacing)

    })

    it('Round down negative', async () => {
        const exact =  -284*tickSpacing;
        expect(await mathI24.round(exact, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact - tickSpacing +1, tickSpacing, ROUND_DOWN)).to.be.eq(exact-tickSpacing)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing, tickSpacing, ROUND_DOWN)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_DOWN)).to.be.eq(exact + tickSpacing)

    })

    it('Round auto positive', async () => {
        const exact =  284*tickSpacing;
        expect(await mathI24.round(exact, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing /2-1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing /2, tickSpacing, ROUND_AUTO)).to.be.eq(exact + tickSpacing)
        expect(await mathI24.round(exact + tickSpacing /2+1, tickSpacing, ROUND_AUTO)).to.be.eq(exact + tickSpacing)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_AUTO)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_AUTO)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2+1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2-1, tickSpacing, ROUND_AUTO)).to.be.eq(exact - tickSpacing)
 
    })

    it('Round auto negative', async () => {
        const exact =  -284*tickSpacing;
          expect(await mathI24.round(exact, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + 1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing /2-1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact + tickSpacing /2, tickSpacing, ROUND_AUTO)).to.be.eq(exact + tickSpacing)
        expect(await mathI24.round(exact + tickSpacing /2+1, tickSpacing, ROUND_AUTO)).to.be.eq(exact + tickSpacing)
        expect(await mathI24.round(exact + tickSpacing -1, tickSpacing, ROUND_AUTO)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact + tickSpacing +1, tickSpacing, ROUND_AUTO)).to.be.eq(exact +tickSpacing)
        expect(await mathI24.round(exact - 1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2+1, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2, tickSpacing, ROUND_AUTO)).to.be.eq(exact)
        expect(await mathI24.round(exact - tickSpacing /2-1, tickSpacing, ROUND_AUTO)).to.be.eq(exact - tickSpacing)
 

    })
})