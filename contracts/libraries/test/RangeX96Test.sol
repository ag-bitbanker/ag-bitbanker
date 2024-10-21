// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import '../RangeX96.sol';

/**
 * @title RangeX96Test contract
 * @author Alexei Goloubtchikov
 * @notice export internal methods of RangeX96 as public for testing purposes
 */
contract RangeX96Test {

    function sqrtUpperPriceX96(uint160 sqrtPlX96, uint256 width) public pure returns (uint160) {
        return RangeX96.sqrtUpperPriceX96(sqrtPlX96, width);
    }

    function sqrtLowerPriceX96(uint160 sqrtPuX96, uint256 width) public pure returns (uint160) {
        return RangeX96.sqrtLowerPriceX96(sqrtPuX96, width);
    }

    function priceRangeForWidth(
        uint160 sqrtPcX96,
        uint256 width,
        uint256 amount0,
        uint256 amount1
    ) public pure returns (uint160 sqrtPlX96, uint160 sqrtPuX96) {
        (sqrtPlX96, sqrtPuX96) = RangeX96.priceRangeForWidth(sqrtPcX96, width, amount0, amount1);
    }
}
