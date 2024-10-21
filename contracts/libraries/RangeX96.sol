// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import './Math256.sol';
import '../Uniswap/v3/libraries/FullMath.sol';
import '../Uniswap/v3/libraries/SafeCast.sol';
import '../Uniswap/v3/libraries/FixedPoint96.sol';
import '../Uniswap/v3/libraries/UnsafeMath.sol';

/// @title RangeX96
/// @dev This library provides functionality for computing price ranges

library RangeX96 {
    uint256 internal constant N = 10000;

    /**
     * @notice Calculate sqrt(lower price) for given sqrt(upper price)
     * @param sqrtPlX96 sqrt(lower price)
     * @param width width parameter
     */
    function sqrtUpperPriceX96(uint160 sqrtPlX96, uint256 width) internal pure returns (uint160) {
        if (width == 0) return sqrtPlX96; // zero width, both prices are equal
        require(width < N, 'INVALID_WIDTH');
        /**
         * Using formula
         * Pu = Pl * (N+width) / (N-width)
         */
        return
            SafeCast.toUint160(
                Math256.sqrt(FullMath.mulDiv(uint256(sqrtPlX96) * uint256(sqrtPlX96), N + width, N - width))
            );
    }

    /**
     * @notice Calculate sqrt(lower price) for given sqrt(upper price)
     * @param sqrtPuX96 sqrt(upper price)
     * @param width width parameter
     */
    function sqrtLowerPriceX96(uint160 sqrtPuX96, uint256 width) internal pure returns (uint160) {
        if (width == 0) return sqrtPuX96; // zero width, both prices are equal
        require(width < N, 'INVALID_WIDTH');
        /**
         * Using formula
         * Pl = Pu * (N-width) / (N+width)
         */
        return
            SafeCast.toUint160(
                Math256.sqrt(FullMath.mulDiv(uint256(sqrtPuX96) * uint256(sqrtPuX96), N - width, N + width))
            );
        /*
       return  SafeCast.toUint160(Math256.sqrt(
        uint256(sqrtPuX96) * uint256(sqrtPuX96)*(N - width) / (N + width)));
        */
    }

    /**
     * @notice Calculate sqrt of lower and upper price for given amounts and width
     * @param sqrtPcX96 sqrt(current price)
     * @param width width parameter
     * @param amount0 token0 amount
     * @param amount1 tomnek1 amount
     * @return sqrtPlX96 sqrt(lower price)
     * @return sqrtPuX96 sqrt(upper price)
     */
    function priceRangeForWidth(
        uint160 sqrtPcX96,
        uint256 width,
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint160 sqrtPlX96, uint160 sqrtPuX96) {
        uint256 C = Math256.sqrt(FullMath.mulDiv(FixedPoint96.Q96 * FixedPoint96.Q96, (N - width), N + width));
        uint256 pcX86 = FullMath.mulDiv(sqrtPcX96, sqrtPcX96, FixedPoint96.Q96);
        uint256 a = FullMath.mulDiv(pcX86, C, FixedPoint96.Q96);
        uint256 c = FullMath.mulDiv(FixedPoint96.Q96, amount1, amount0);
        bool bPositive = c > pcX86;
        uint256 b = bPositive ? c - pcX86 : pcX86 - c;
        uint256 alpha = _findAlpha(a, b, c, bPositive);
        sqrtPuX96 = SafeCast.toUint160(FullMath.mulDiv(alpha, sqrtPcX96, FixedPoint96.Q96));
        sqrtPlX96 = SafeCast.toUint160(FullMath.mulDiv(sqrtPuX96, C, FixedPoint96.Q96));
    }

    /**
     * @notice Solve special case of quadratic equation
     * @dev private function
     * @param a A > 0
     * @param b B
     * @param c C > 0
     * @param bPositive B is positive or negative
     */

    function _findAlpha(uint256 a, uint256 b, uint256 c, bool bPositive) private pure returns (uint256) {
        uint256 d = (FullMath.mulDiv(b, b, FixedPoint96.Q96) + FullMath.mulDiv(a << 2, c, FixedPoint96.Q96)) <<
            FixedPoint96.RESOLUTION;
        uint256 sqrtD = Math256.sqrt(d);
        return
            bPositive
                ? FullMath.mulDiv(FixedPoint96.Q96, sqrtD - b, a << 1)
                : FullMath.mulDiv(FixedPoint96.Q96, sqrtD + b, a << 1);
    }
}
