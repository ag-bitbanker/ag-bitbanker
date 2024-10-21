// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import '../../libraries/MathI24.sol';

/**
 * @title MathI24Test contract
 * @author Alexei Goloubtchikov
 * @notice export internal methods of MathI24 as public for testing purposes 
 */
contract MathI24Test {
     function round( int24 dividend, int24 divisor, MathI24.Round mode ) public pure returns (int24) {
        return MathI24.round(dividend, divisor,  mode );
    }
}