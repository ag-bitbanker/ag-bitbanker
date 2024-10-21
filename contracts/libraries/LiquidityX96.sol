// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import './Math256.sol';
import './RangeX96.sol';
import '../Uniswap/v3/libraries/FullMath.sol';
import '../Uniswap/v3/libraries/SafeCast.sol';
import '../Uniswap/v3/libraries/FixedPoint96.sol';
import '../Uniswap/v3/libraries/UnsafeMath.sol';

import 'hardhat/console.sol';

/**
 * @title LiquidityX96
 * @author Alexei Goloubtchikov
 * @notice This library provides functionality for computing liquidity
 */
library LiquidityX96 {
    uint256 public constant N = 10000;

    /// @notice Gets the required amount0 between two prices for givel liquidity
    /// @dev Calculates liquidity / sqrt(lower) - liquidity / sqrt(upper),
    /// i.e. liquidity * (sqrt(upper) - sqrt(lower)) / (sqrt(upper) * sqrt(lower))
    /// @param sqrtRatioAX96 A sqrt price
    /// @param sqrtRatioBX96 Another sqrt price
    /// @param liquidity The amount of usable liquidity
    /// @param roundUp Whether to round the amount up or down
    /// @return amount0 Amount of token0 required to cover a position of size liquidity between the two passed prices
    function requiredAmount0(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 liquidity,
        bool roundUp
    ) internal pure returns (uint256 amount0) {
        if (sqrtRatioAX96 > sqrtRatioBX96) (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);

        uint256 numerator1 = liquidity << FixedPoint96.RESOLUTION;
        uint256 numerator2 = sqrtRatioBX96 - sqrtRatioAX96;

        require(sqrtRatioAX96 > 0);

        return
            roundUp
                ? UnsafeMath.divRoundingUp(
                    FullMath.mulDivRoundingUp(numerator1, numerator2, sqrtRatioBX96),
                    sqrtRatioAX96
                )
                : FullMath.mulDiv(numerator1, numerator2, sqrtRatioBX96) / sqrtRatioAX96;
    }

    /// @notice Gets the required amount1 between two prices for given liquidity
    /// @dev Calculates liquidity * (sqrt(upper) - sqrt(lower))
    /// @param sqrtRatioAX96 A sqrt price
    /// @param sqrtRatioBX96 Another sqrt price
    /// @param liquidity The amount of usable liquidity
    /// @param roundUp Whether to round the amount up, or down
    /// @return amount1 Amount of token1 required to cover a position of size liquidity between the two passed prices
    function requiredAmount1(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 liquidity,
        bool roundUp
    ) internal pure returns (uint256 amount1) {
        if (sqrtRatioAX96 > sqrtRatioBX96) (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);

        return
            roundUp
                ? FullMath.mulDivRoundingUp(liquidity, sqrtRatioBX96 - sqrtRatioAX96, FixedPoint96.Q96)
                : FullMath.mulDiv(liquidity, sqrtRatioBX96 - sqrtRatioAX96, FixedPoint96.Q96);
    }

    /**
     * @notice Calculate liquidity for region below current price
     * @param sqrtPlX96 lower price
     * @param sqrtPuX96 upper price
     * @param amount token amount
     * @return liquidityDelta liquiduty to add
     */
    function liquidityForRegionBelowCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPuX96,
        uint256 amount
    ) internal pure returns (int128 liquidityDelta) {
        require(sqrtPuX96 > sqrtPlX96, 'INVALID_RANGE');
        liquidityDelta = SafeCast.toInt128(
            SafeCast.toInt256(FullMath.mulDiv(FixedPoint96.Q96, amount, sqrtPuX96 - sqrtPlX96))
        );
    }

    /**
     * @notice Calculate liquidity for region above current price
     * @param sqrtPlX96 lower price
     * @param sqrtPuX96 upper price
     * @param amount token amount
     * @return liquidityDelta liquiduty to add
     */
    function liquidityForRegionAboveCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPuX96,
        uint256 amount
    ) internal pure returns (int128 liquidityDelta) {
        require(sqrtPuX96 > sqrtPlX96, 'INVALID_RANGE');
        liquidityDelta = SafeCast.toInt128(
            SafeCast.toInt256(
                FullMath.mulDiv(amount, uint256(sqrtPuX96) * uint256(sqrtPlX96), sqrtPuX96 - sqrtPlX96) /
                    FixedPoint96.Q96
            )
        );
    }

    /**
     * @notice Calculate liquidity for region at current price
     * @param sqrtPlX96 lower price
     * @param sqrtPcX96 current price
     * @param sqrtPuX96 upper price
     * @param amount0 token0 amount
     * @param amount1 token1 amount
     * @return liquidityDelta liquiduty to add
     */
    function liquidityForRegionAtCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPcX96,
        uint160 sqrtPuX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (int128 liquidityDelta) {
        require((sqrtPcX96 > sqrtPlX96) && (sqrtPuX96 > sqrtPcX96), 'INVALID_RANGE');
        // use all amount0
        uint256 liquidity0 = FullMath.mulDiv(amount0, uint256(sqrtPuX96) * uint256(sqrtPcX96), sqrtPuX96 - sqrtPcX96);
        // use all amount1
        uint256 liquidity1 = FullMath.mulDiv(
            FixedPoint96.Q96,
            uint256(amount1) << FixedPoint96.RESOLUTION,
            sqrtPcX96 - sqrtPlX96
        );
        // use smallest liquidity
        liquidityDelta = liquidity0 <= liquidity1
            ? SafeCast.toInt128(SafeCast.toInt256(liquidity0 >> FixedPoint96.RESOLUTION))
            : SafeCast.toInt128(SafeCast.toInt256(liquidity1 >> FixedPoint96.RESOLUTION));
    }

    /**
     * @notice Calculate liquidity for region with given width
     * @param sqrtPcX96 sqrt(current price)
     * @param width width
     * @param amount0 token0 amount
     * @param amount1  token1 amount
     * @return liquidityDelta liquidity
     * @return sqrtPlX96 sqrt(lower price)
     * @return sqrtPuX96 sqrt(upper price)
     */
    function liquidityForWidth(
        uint160 sqrtPcX96,
        uint256 width,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (int128 liquidityDelta, uint160 sqrtPlX96, uint160 sqrtPuX96) {
        (sqrtPlX96, sqrtPuX96) = RangeX96.priceRangeForWidth(sqrtPcX96, width, amount0, amount1);
        liquidityDelta = liquidityForRange(sqrtPlX96, sqrtPcX96, sqrtPuX96, amount0, amount1);
    }

    /**
     * @notice Calculate liquidity for region with given prices
     * @param sqrtPlX96 sqrt(lower price)
     * @param sqrtPcX96 sqrt(current price)
     * @param sqrtPuX96 sqrt(upper price)
     * @param amount0 token0 amount
     * @param amount1 token1 amount
     * @return liquidityDelta liquidity
     */
    function liquidityForRange(
        uint160 sqrtPlX96,
        uint160 sqrtPcX96,
        uint160 sqrtPuX96,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (int128 liquidityDelta) {
        require(sqrtPlX96 < sqrtPcX96 && sqrtPcX96 < sqrtPuX96, 'INVALID_RANGE');
        uint256 liquidity0 = FullMath.mulDiv(amount0, uint256(sqrtPuX96) * uint256(sqrtPcX96), sqrtPuX96 - sqrtPcX96);
        // use all amount1
        uint256 liquidity1 = FullMath.mulDiv(
            FixedPoint96.Q96,
            uint256(amount1) << FixedPoint96.RESOLUTION,
            sqrtPcX96 - sqrtPlX96
        );
        // use smallest liquidity
        liquidityDelta = liquidity0 <= liquidity1
            ? SafeCast.toInt128(SafeCast.toInt256(liquidity0 >> FixedPoint96.RESOLUTION))
            : SafeCast.toInt128(SafeCast.toInt256(liquidity1 >> FixedPoint96.RESOLUTION));

        /*
        uint256 liquidity = FullMath.mulDiv(amount0, uint256(sqrtPuX96) * uint256(sqrtPcX96), sqrtPuX96 - sqrtPcX96) /
            FixedPoint96.Q96;
        uint256 amount1in = requiredAmount1(sqrtPlX96, sqrtPcX96, liquidity, true);
        // use all amount0
        if (amount1in <= amount1 << FixedPoint96.RESOLUTION) {
            // we have enought amount1
            liquidityDelta = SafeCast.toInt128(SafeCast.toInt256(liquidity));
        } else {
            // use all amount0
            liquidity =
                FullMath.mulDiv(FixedPoint96.Q96, uint256(amount1) << FixedPoint96.RESOLUTION, sqrtPcX96 - sqrtPlX96) /
                FixedPoint96.Q96;
            // get required amount1 (round up))
            uint256 amount0in = requiredAmount0(sqrtPuX96, sqrtPcX96, liquidity, true);
            // do we have enought amount0?
            require(amount0in <= amount0 << FixedPoint96.RESOLUTION, 'INVALID_AMOUNTS');
            liquidityDelta = SafeCast.toInt128(SafeCast.toInt256(liquidity));
        }
        */
    }
}
