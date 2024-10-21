// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import '../LiquidityX96.sol';
import '../../Uniswap/v3/libraries/SqrtPriceMath.sol';

// import 'hardhat/console.sol';
/**
 * @title LiquidityX96Test contract
 * @author Alexei Goloubtchikov
 * @notice export internal methods of LiquidityX96 as public for testing purposes
 */
contract LiquidityX96Test {
    function liquidityForRegionBelowCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPuX96,
        uint256 amount
    ) public pure returns (int128 liquidityDelta) {
        return LiquidityX96.liquidityForRegionBelowCurrentPrice(sqrtPlX96, sqrtPuX96, amount);
    }

    function liquidityForRegionAboveCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPuX96,
        uint256 amount
    ) public pure returns (int128 liquidityDelta) {
        return LiquidityX96.liquidityForRegionAboveCurrentPrice(sqrtPlX96, sqrtPuX96, amount);
    }

    function liquidityForRegionAtCurrentPrice(
        uint160 sqrtPlX96,
        uint160 sqrtPcX96,
        uint160 sqrtPuX96,
        uint256 amount0,
        uint256 amount1
    ) public view returns (int128 liquidityDelta) {
        return LiquidityX96.liquidityForRegionAtCurrentPrice(sqrtPlX96, sqrtPcX96, sqrtPuX96, amount0, amount1);
    }

    function liquidityForWidth(
        uint160 sqrtPcX96,
        uint256 width,
        uint256 amount0,
        uint256 amount1
    ) public pure returns (int128 liquidityDelta, uint160 sqrtPlX96, uint160 sqrtPuX96 ) {
        return LiquidityX96.liquidityForWidth(sqrtPcX96, width, amount0, amount1);
    }

    /// helper function to check liquidity calculation correctness.
    /// See documentation in Uniswap/v3/SqrtPriceMath.sol

    function getAmount0Delta(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity,
        bool roundUp
    ) public pure returns (uint256 amount0) {
        // use directly UniSwap v3 library
        return SqrtPriceMath.getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, roundUp);
    }

    function getAmount1Delta(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity,
        bool roundUp
    ) public pure returns (uint256 amount1) {
        // use directly UniSwap v3 library
        return SqrtPriceMath.getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, roundUp);
    }
}
