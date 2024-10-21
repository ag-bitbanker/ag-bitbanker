// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
// import 'hardhat/console.sol';

/**
 * @title MathI24
 * @author Alexei Goloubtchikov
 * @notice this library provides functionality for computing some functions for int24
 */
library MathI24 {
    /// rounding mode
    enum Round {
        Auto, // 0
        Up,   // 1
        Down  // 2
    }
    /**
     * @notice absolute value
     * @param value int24 value (positive or negative)
     * @return abs(value)
     */
    function abs( int24 value) public pure returns (int24) {
        return value >= 0 ? value : -value;
    }
    /**
     * @notice round positive number
     * @dev divisor should be positive
     * @param dividend Dividend
     * @param divisor Divisor
     * @param mode one of Round.up, Round.down or Round.auto
     */
    function _roundPositive( int24 dividend, int24 divisor, Round mode ) private pure returns (int24) {
        int24 remainder = dividend % divisor;
        int24 quotient = dividend - remainder;
        if ( mode == Round.Down) {
            return remainder > 0 ? quotient : quotient - divisor;
        } else if ( mode == Round.Up ) {
            return remainder > 0 ? quotient + divisor: quotient;
        }  else {
            return remainder << 1 < divisor ? quotient : quotient + divisor;
        }
    }
    /**
     * @notice round negative number
     * @dev divisor should be positive
     * @param dividend Dividend
     * @param divisor Divisor
     * @param mode one of Round.up, Round.down or Round.auto
     */
    function _roundNegative( int24 dividend, int24 divisor, Round mode ) private pure returns (int24) {
        int24 remainder = dividend % divisor;
        int24 quotient = dividend - remainder;
        if ( mode == Round.Down) {
            return remainder > 0 ? quotient : quotient - divisor;
        } else if ( mode == Round.Up ) {
            return remainder > 0 ? quotient + divisor: quotient;
        }  else {
            return abs(remainder) << 1 > divisor ? quotient - divisor: quotient;
        }
    }

    /**
     * @notice round number
     * @dev divisor should be positive
     * @param dividend Dividend
     * @param divisor Divisor
     * @param mode one of Round.up, Round.down or Round.auto
     */
    function round( int24 dividend, int24 divisor, Round mode ) internal pure returns (int24) {
        return dividend < 0 ? _roundNegative( dividend,divisor,mode) : _roundPositive(dividend,divisor,mode);
    }
 
}