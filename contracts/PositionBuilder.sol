// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import './Uniswap/v3/interfaces/IUniswapV3Pool.sol';
import './Uniswap/v3/libraries/FullMath.sol';
import './Uniswap/v3/libraries/SafeCast.sol';
import './Uniswap/v3/libraries/TickMath.sol';
import './Uniswap/v3/libraries/FixedPoint96.sol';
import './Uniswap/v3/libraries/FixedPoint128.sol';
import './Uniswap/v3/interfaces/IERC20Minimal.sol';
import './Uniswap/v3/interfaces/callback/IUniswapV3MintCallback.sol';
import './libraries/Math256.sol';
import './libraries/MathI24.sol';
import './libraries/RangeX96.sol';
import './libraries/LiquidityX96.sol';
// import 'hardhat/console.sol';

/**
 * @title Задача
 * @notice Необходимо написать контракт, который взаимодействует с протоколом UniswapV3.
 *    В контракт подается информация о интересующем пуле (адрес пула), количество первого и второго актива, который необходимо вложить в позицию, а также параметр ширины.
 *    Необходимо вложить заданные объемы в позицию таким образом, чтобы ширина этой позиции равнялась заданному параметру.
 *    Ширину предлагаем считать следующим образом: width = (upperPrice - lowerPrice) * 10000 / (lowerPrice + upperPrice).
 *    Необходимо, чтобы контракт работал для любого uniswap v3 пула вне зависимости от вкладываемых токенов.
 *    Задача должна быть решена полностью ончейн (нет никаких расчетов не на контракте) и покрыта необходимыми тестами.
 */

/**
 * @title RangeLimitOrder
 * @author Alexei Goloubtchikov
 * @notice Решение тестовой задачи
 */
contract PositionBuilder is IUniswapV3MintCallback {
    uint256 public immutable N = 10000;

    event MintCallback(uint256 amount0Owed, uint256 amount1Owed);

    constructor() {}

    function createPosition(
        address pool,
        uint256 width,
        uint256 amount0,
        uint256 amount1
    )
        public
        returns (
            int128 liquidityDelta,
            uint160 sqrtPlX96,
            uint160 sqrtPuX96,
            int24 tickPl,
            int24 tickPu,
            uint256 amount0Owed,
            uint256 amount1Owed
        )
    {
        require(width < N, 'INVALID_WIDTH');
        require(amount0 > 0 || amount1 > 0, 'INVALID_AMOUNT');
        // get current price and tick
        (uint160 sqrtPcX96, int24 tick, , , , , ) = IUniswapV3Pool(pool).slot0();
        // any tick is valid only if (tick MOD tickSpacing) == 0
        int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();
        if (amount1 == 0) {
            // lower tick is just above current tick
            tickPl = MathI24.round(tick, tickSpacing, MathI24.Round.Up);
            // sqrt(lower price)
            sqrtPlX96 = TickMath.getSqrtRatioAtTick(tickPl);
            // sqrt(upper price)
            sqrtPuX96 = RangeX96.sqrtUpperPriceX96(sqrtPlX96, width);
            // tick for upper price, round it
            tickPu = MathI24.round(TickMath.getTickAtSqrtRatio(sqrtPuX96), tickSpacing, MathI24.Round.Auto);
            // tickPu should be >= tickPl
            if (tickPu <= tickPl) tickPu = tickPl + tickSpacing;
            // calculate back sqrtPuX96
            sqrtPuX96 = TickMath.getSqrtRatioAtTick(tickPu);
            // calculate liquidity
            liquidityDelta = LiquidityX96.liquidityForRegionAboveCurrentPrice(sqrtPlX96, sqrtPuX96, amount0);
        } else if (amount0 == 0) {
            // upper tick is at current tick (if allowed by tickSpacing) or at nearest allowed tick below current tick
            tickPu = tick % tickSpacing == 0 ? tick : MathI24.round(tick, tickSpacing, MathI24.Round.Down);
            // sqrt(upper price)
            sqrtPuX96 = TickMath.getSqrtRatioAtTick(tickPu);
            // sqrt(lower price)
            sqrtPlX96 = RangeX96.sqrtLowerPriceX96(sqrtPuX96, width);
            // tick for lower price, round it
            tickPl = MathI24.round(TickMath.getTickAtSqrtRatio(sqrtPlX96), tickSpacing, MathI24.Round.Auto);
            // tickPl should be < tickPu
            if (tickPl >= tickPu) tickPl = tickPu - tickSpacing;
            // calculate back sqrtPlX96
            sqrtPlX96 = TickMath.getSqrtRatioAtTick(tickPl);
            // calculate liquidity
            liquidityDelta = LiquidityX96.liquidityForRegionBelowCurrentPrice(sqrtPlX96, sqrtPuX96, amount1);
        } else {
            // normal case, amount0 > 0 and amount1 > 0
            // uint160 sqrtPcX96 = TickMath.getSqrtRatioAtTick(tick);
            if (width == 0) {
                // pevious allowed tick
                tickPl = MathI24.round(tick, tickSpacing, MathI24.Round.Down);
                tickPu = MathI24.round(tick, tickSpacing, MathI24.Round.Up);
                // we are on bounds
                if (tickPu <= tick) tickPu = tickPu + tickSpacing;
                // prices
                sqrtPuX96 = TickMath.getSqrtRatioAtTick(tickPu);
                sqrtPlX96 = TickMath.getSqrtRatioAtTick(tickPl);
               
                // liquidity
                liquidityDelta = LiquidityX96.liquidityForRegionAtCurrentPrice(
                    sqrtPlX96,
                    sqrtPcX96,
                    sqrtPuX96,
                    amount0,
                    amount1
                );
            } else {
                (sqrtPlX96, sqrtPuX96) = RangeX96.priceRangeForWidth(sqrtPcX96, width, amount0, amount1);
                // tick for lower price, round it
                tickPl = MathI24.round(TickMath.getTickAtSqrtRatio(sqrtPlX96), tickSpacing, MathI24.Round.Auto);
                // tick for upper price, round it
                tickPu = MathI24.round(TickMath.getTickAtSqrtRatio(sqrtPuX96), tickSpacing, MathI24.Round.Auto);
                // tickPl < tick < tickPu
                if (tickPl >= tick) tickPl = tickPl - tickSpacing;
                if (tickPu <= tick) tickPu = tickPu + tickSpacing;
                // lower and upper prices
                sqrtPlX96 = TickMath.getSqrtRatioAtTick(tickPl);
                sqrtPuX96 = TickMath.getSqrtRatioAtTick(tickPu);
                // calculate liquidity
                liquidityDelta = LiquidityX96.liquidityForRange(sqrtPlX96, sqrtPcX96, sqrtPuX96, amount0, amount1);
            }
        }
        // mint position
        
        (amount0Owed, amount1Owed) = IUniswapV3Pool(pool).mint(
            msg.sender,
            tickPl,
            tickPu,
            uint128(liquidityDelta),
            abi.encode(msg.sender)
        );
    }

    /**
     * @notice UniSwap V3 callback to be called in mint method.
     * Contract should transfer requested amounts to UniSwap V3 pool
     * @param amount0Owed token0 amount
     * @param amount1Owed token1 amount
     * @param data sender address
     */

    function uniswapV3MintCallback(uint256 amount0Owed, uint256 amount1Owed, bytes calldata data) external override {
        address sender = abi.decode(data, (address));

        // console.log('transfer', amount0Owed, amount1Owed);
        if (amount0Owed > 0)
            IERC20Minimal(IUniswapV3Pool(msg.sender).token0()).transferFrom(sender, msg.sender, amount0Owed);

        if (amount1Owed > 0)
            IERC20Minimal(IUniswapV3Pool(msg.sender).token1()).transferFrom(sender, msg.sender, amount1Owed);

        emit MintCallback(amount0Owed, amount1Owed);
    }
}
