import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

/**
 * 0.1
 * @type {Number}
 * @constant
 */
export const EPSILON1 = 0.1;

/**
  * 0.01
  * @type {Number}
  * @constant
  */
export const EPSILON2 = 0.01;

/**
  * 0.001
  * @type {Number}
  * @constant
  */
export const EPSILON3 = 0.001;

/**
  * 0.0001
  * @type {Number}
  * @constant
  */
export const EPSILON4 = 0.0001;

/**
  * 0.00001
  * @type {Number}
  * @constant
  */
export const EPSILON5 = 0.00001;

/**
  * 0.000001
  * @type {Number}
  * @constant
  */
export const EPSILON6 = 0.000001;

/**
  * 0.0000001
  * @type {Number}
  * @constant
  */
export const EPSILON7 = 0.0000001;

/**
  * 0.00000001
  * @type {Number}
  * @constant
  */
export const EPSILON8 = 0.00000001;

/**
  * 0.000000001
  * @type {Number}
  * @constant
  */
export const EPSILON9 = 0.000000001;

/**
  * 0.0000000001
  * @type {Number}
  * @constant
  */
export const EPSILON10 = 0.0000000001;

/**
  * 0.00000000001
  * @type {Number}
  * @constant
  */
export const EPSILON11 = 0.00000000001;

/**
  * 0.000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON12 = 0.000000000001;

/**
  * 0.0000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON13 = 0.0000000000001;

/**
  * 0.00000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON14 = 0.00000000000001;

/**
  * 0.000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON15 = 0.000000000000001;

/**
  * 0.0000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON16 = 0.0000000000000001;

/**
  * 0.00000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON17 = 0.00000000000000001;

/**
  * 0.000000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON18 = 0.000000000000000001;

/**
  * 0.0000000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON19 = 0.0000000000000000001;

/**
  * 0.00000000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON20 = 0.00000000000000000001;

/**
  * 0.000000000000000000001
  * @type {Number}
  * @constant
  */
export const EPSILON21 = 0.000000000000000000001;

/**
  * The gravitational parameter of the Earth in meters cubed
  * per second squared as defined by the WGS84 model: 3.986004418e14
  * @type {Number}
  * @constant
  */
export const GRAVITATIONALPARAMETER = 3.986004418e14;

/**
  * Radius of the sun in meters: 6.955e8
  * @type {Number}
  * @constant
  */
export const SOLAR_RADIUS = 6.955e8;

/**
  * The mean radius of the moon, according to the "Report of the IAU/IAG Working Group on
  * Cartographic Coordinates and Rotational Elements of the Planets and satellites: 2000",
  * Celestial Mechanics 82: 83-110, 2002.
  * @type {Number}
  * @constant
  */
export const LUNAR_RADIUS = 1737400.0;

/**
  * 64 * 1024
  * @type {Number}
  * @constant
  */
export const SIXTY_FOUR_KILOBYTES = 64 * 1024;

/**
  * 4 * 1024 * 1024 * 1024
  * @type {Number}
  * @constant
  */
export const FOUR_GIGABYTES = 4 * 1024 * 1024 * 1024;

/**
 * Increments a number with a wrapping to a minimum value if the number exceeds the maximum value.
 *
 * @param {Number} [n] The number to be incremented.
 * @param {Number} [maximumValue] The maximum incremented value before rolling over to the minimum value.
 * @param {Number} [minimumValue=0.0] The number reset to after the maximum value has been exceeded.
 * @returns {Number} The incremented number.
 *
 * @exception {DeveloperError} Maximum value must be greater than minimum value.
 *
 * @example
 * var n = Cesium.Math.incrementWrap(5, 10, 0); // returns 6
 * var n = Cesium.Math.incrementWrap(10, 10, 0); // returns 0
 */
export const incrementWrap = function (n: number, maximumValue: number, minimumValue: number): number {
    minimumValue = defaultValue(minimumValue, 0.0);

    // >>includeStart('debug', pragmas.debug);
    if (!defined(n)) {
        throw new DeveloperError('n is required.');
    }
    if (maximumValue <= minimumValue) {
        throw new DeveloperError('maximumValue must be greater than minimumValue.');
    }
    // >>includeEnd('debug');

    ++n;
    if (n > maximumValue) {
        n = minimumValue;
    }
    return n;
};

/**
 * Determines if two values are equal using an absolute or relative tolerance test. This is useful
 * to avoid problems due to roundoff error when comparing floating-point values directly. The values are
 * first compared using an absolute tolerance test. If that fails, a relative tolerance test is performed.
 * Use this test if you are unsure of the magnitudes of left and right.
 *
 * @param {Number} left The first value to compare.
 * @param {Number} right The other value to compare.
 * @param {Number} [relativeEpsilon=0] The maximum inclusive delta between <code>left</code> and <code>right</code> for the relative tolerance test.
 * @param {Number} [absoluteEpsilon=relativeEpsilon] The maximum inclusive delta between <code>left</code> and <code>right</code> for the absolute tolerance test.
 * @returns {Boolean} <code>true</code> if the values are equal within the epsilon; otherwise, <code>false</code>.
 *
 * @example
 * var a = Cesium.Math.equalsEpsilon(0.0, 0.01, Cesium.Math.EPSILON2); // true
 * var b = Cesium.Math.equalsEpsilon(0.0, 0.1, Cesium.Math.EPSILON2);  // false
 * var c = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON7); // true
 * var d = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON9); // false
 */
export const equalsEpsilon = function (
    left: number,
    right: number,
    relativeEpsilon?: number,
    absoluteEpsilon?: number
): boolean {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(left)) {
        throw new DeveloperError('left is required.');
    }
    if (!defined(right)) {
        throw new DeveloperError('right is required.');
    }
    // >>includeEnd('debug');

    relativeEpsilon = defaultValue(relativeEpsilon, 0.0);
    absoluteEpsilon = defaultValue(absoluteEpsilon, relativeEpsilon);
    const absDiff = Math.abs(left - right);
    return (
        absDiff <= (absoluteEpsilon as number) ||
      absDiff <= (absoluteEpsilon as number) * Math.max(Math.abs(left), Math.abs(right))
    );
};

/**
 * pi
 *
 * @type {Number}
 * @constant
 */
const PI = Math.PI;

/**
  * 1/pi
  *
  * @type {Number}
  * @constant
  */
const ONE_OVER_PI = 1.0 / Math.PI;

/**
  * pi/2
  *
  * @type {Number}
  * @constant
  */
const PI_OVER_TWO = Math.PI / 2.0;

/**
  * pi/3
  *
  * @type {Number}
  * @constant
  */
const PI_OVER_THREE = Math.PI / 3.0;

/**
  * pi/4
  *
  * @type {Number}
  * @constant
  */
const PI_OVER_FOUR = Math.PI / 4.0;

/**
  * pi/6
  *
  * @type {Number}
  * @constant
  */
const PI_OVER_SIX = Math.PI / 6.0;

/**
  * 3pi/2
  *
  * @type {Number}
  * @constant
  */
const THREE_PI_OVER_TWO = (3.0 * Math.PI) / 2.0;

/**
  * 2pi
  *
  * @type {Number}
  * @constant
  */
const TWO_PI = 2.0 * Math.PI;

/**
  * 1/2pi
  *
  * @type {Number}
  * @constant
  */
const ONE_OVER_TWO_PI = 1.0 / (2.0 * Math.PI);

/**
  * The number of radians in a degree.
  *
  * @type {Number}
  * @constant
  */
const RADIANS_PER_DEGREE = Math.PI / 180.0;

/**
  * The number of degrees in a radian.
  *
  * @type {Number}
  * @constant
  */
const DEGREES_PER_RADIAN = 180.0 / Math.PI;

/**
  * The number of radians in an arc second.
  *
  * @type {Number}
  * @constant
  */
const RADIANS_PER_ARCSECOND = RADIANS_PER_DEGREE / 3600.0;

/**
 * Converts degrees to radians.
 * @param {Number} degrees The angle to convert in degrees.
 * @returns {Number} The corresponding angle in radians.
 */
export const toRadians = function (degrees: number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(degrees)) {
        throw new DeveloperError('degrees is required.');
    }
    // >>includeEnd('debug');
    return degrees * CesiumMath.RADIANS_PER_DEGREE;
};

/**
 * Returns 1.0 if the given value is positive or zero, and -1.0 if it is negative.
 * This is similar to {@link CesiumMath#sign} except that returns 1.0 instead of
 * 0.0 when the input value is 0.0.
 * @param {Number} value The value to return the sign of.
 * @returns {Number} The sign of value.
 */
const signNotZero = function (value:number): number {
    return value < 0.0 ? -1.0 : 1.0;
};

/**
 * Constraint a value to lie between two values.
 *
 * @param {Number} value The value to constrain.
 * @param {Number} min The minimum value.
 * @param {Number} max The maximum value.
 * @returns {Number} The value clamped so that min <= value <= max.
 */
const clamp = function (value: number, min: number, max: number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(value)) {
        throw new DeveloperError('value is required');
    }
    if (!defined(min)) {
        throw new DeveloperError('min is required.');
    }
    if (!defined(max)) {
        throw new DeveloperError('max is required.');
    }
    // >>includeEnd('debug');
    return value < min ? min : value > max ? max : value;
};

/**
 * Converts a scalar value in the range [-1.0, 1.0] to a SNORM in the range [0, rangeMaximum]
 * @param {Number} value The scalar value in the range [-1.0, 1.0]
 * @param {Number} [rangeMaximum=255] The maximum value in the mapped range, 255 by default.
 * @returns {Number} A SNORM value, where 0 maps to -1.0 and rangeMaximum maps to 1.0.
 *
 * @see CesiumMath.fromSNorm
 */
const toSNorm = function (value: number, rangeMaximum: number): number {
    rangeMaximum = defaultValue(rangeMaximum, 255);
    return Math.round(
        (CesiumMath.clamp(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum
    );
};

/**
 * Converts a SNORM value in the range [0, rangeMaximum] to a scalar in the range [-1.0, 1.0].
 * @param {Number} value SNORM value in the range [0, rangeMaximum]
 * @param {Number} [rangeMaximum=255] The maximum value in the SNORM range, 255 by default.
 * @returns {Number} Scalar in the range [-1.0, 1.0].
 *
 * @see CesiumMath.toSNorm
 */
const fromSNorm = function (value: number, rangeMaximum: number): number {
    rangeMaximum = defaultValue(rangeMaximum, 255);
    return (
        (CesiumMath.clamp(value, 0.0, rangeMaximum) / rangeMaximum) * 2.0 - 1.0
    );
};

/**
 * Produces an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
 *
 * @param {Number} angle in radians
 * @returns {Number} The angle in the range [<code>-CesiumMath.PI</code>, <code>CesiumMath.PI</code>].
 */
const negativePiToPi = function (angle: number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(angle)) {
        throw new DeveloperError('angle is required.');
    }
    // >>includeEnd('debug');
    return CesiumMath.zeroToTwoPi(angle + CesiumMath.PI) - CesiumMath.PI;
};

/**
 * Produces an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
 *
 * @param {Number} angle in radians
 * @returns {Number} The angle in the range [0, <code>CesiumMath.TWO_PI</code>].
 */
const zeroToTwoPi = function (angle:number):number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(angle)) {
        throw new DeveloperError('angle is required.');
    }
    // >>includeEnd('debug');
    const mod = CesiumMath.mod(angle, CesiumMath.TWO_PI);
    if (Math.abs(mod) < CesiumMath.EPSILON14 && Math.abs(angle) > CesiumMath.EPSILON14) {
        return CesiumMath.TWO_PI;
    }
    return mod;
};

/**
 * The modulo operation that also works for negative dividends.
 *
 * @param {Number} m The dividend.
 * @param {Number} n The divisor.
 * @returns {Number} The remainder.
 */
const mod = function (m: number, n: number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(m)) {
        throw new DeveloperError('m is required.');
    }
    if (!defined(n)) {
        throw new DeveloperError('n is required.');
    }
    // >>includeEnd('debug');
    return (m % n + n) % n;
};

/**
 * Computes <code>Math.acos(value)</code>, but first clamps <code>value</code> to the range [-1.0, 1.0]
 * so that the function will never return NaN.
 *
 * @param {Number} value The value for which to compute acos.
 * @returns {Number} The acos of the value if the value is in the range [-1.0, 1.0], or the acos of -1.0 or 1.0,
 *          whichever is closer, if the value is outside the range.
 */
const acosClamped = function (value:number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(value)) {
        throw new DeveloperError('value is required.');
    }
    // >>includeEnd('debug');
    return Math.acos(CesiumMath.clamp(value, -1.0, 1.0));
};

/**
 * Converts radians to degrees.
 * @param {Number} radians The angle to convert in radians.
 * @returns {Number} The corresponding angle in degrees.
 */
const toDegrees = function (radians: number): number {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(radians)) {
        throw new DeveloperError('radians is required.');
    }
    // >>includeEnd('debug');
    return radians * CesiumMath.DEGREES_PER_RADIAN;
};

/**
 * Computes the linear interpolation of two values.
 *
 * @param {Number} p The start value to interpolate.
 * @param {Number} q The end value to interpolate.
 * @param {Number} time The time of interpolation generally in the range <code>[0.0, 1.0]</code>.
 * @returns {Number} The linearly interpolated value.
 *
 * @example
 * var n = Cesium.Math.lerp(0.0, 2.0, 0.5); // returns 1.0
 */
const lerp = function (p: number, q: number, time: number): number {
    return (1.0 - time) * p + time * q;
};

/**
 * Determines if the left value is greater the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns false.
 *
 * @param {Number} left The first number to compare.
 * @param {Number} right The second number to compare.
 * @param {Number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {Boolean} <code>true</code> if <code>left</code> is greater than <code>right</code> by more than
 *          <code>absoluteEpsilon<code>. <code>false</code> if <code>left</code> is less or if the two
 *          values are nearly equal.
 */
const greaterThan = function (left: number, right: number, absoluteEpsilon: number): boolean {
    return left - right > absoluteEpsilon;
};

/**
 * Determines if the left value is greater than or equal to the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns true.
 *
 * @param {Number} left The first number to compare.
 * @param {Number} right The second number to compare.
 * @param {Number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {Boolean} <code>true</code> if <code>left</code> is greater than <code>right</code> or if the
 *          the values are nearly equal.
 */
const greaterThanOrEquals = function (left: number, right: number, absoluteEpsilon: number): boolean {
    return left - right > -absoluteEpsilon;
};

/**
 * Determines if the left value is less than the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns false.
 *
 * @param {Number} left The first number to compare.
 * @param {Number} right The second number to compare.
 * @param {Number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {Boolean} <code>true</code> if <code>left</code> is less than <code>right</code> by more than
 *          <code>absoluteEpsilon<code>. <code>false</code> if <code>left</code> is greater or if the two
 *          values are nearly equal.
 */
const lessThan = function (left: number, right: number, absoluteEpsilon: number): boolean {
    // >>includeEnd('debug');
    return left - right < -absoluteEpsilon;
};

/**
 * Determines if the left value is less than or equal to the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns true.
 *
 * @param {Number} left The first number to compare.
 * @param {Number} right The second number to compare.
 * @param {Number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {Boolean} <code>true</code> if <code>left</code> is less than <code>right</code> or if the
 *          the values are nearly equal.
 */
const lessThanOrEquals = function (left: number, right: number, absoluteEpsilon: number): boolean {
    return left - right < absoluteEpsilon;
};

const CesiumMath = {
    EPSILON1,
    EPSILON2,
    EPSILON3,
    EPSILON4,
    EPSILON5,
    EPSILON6,
    EPSILON7,
    EPSILON8,
    EPSILON9,
    EPSILON10,
    EPSILON11,
    EPSILON12,
    EPSILON13,
    EPSILON14,
    EPSILON15,
    EPSILON20,

    incrementWrap,
    equalsEpsilon,
    PI,
    ONE_OVER_PI,
    PI_OVER_TWO,
    PI_OVER_THREE,
    PI_OVER_FOUR,
    PI_OVER_SIX,
    THREE_PI_OVER_TWO,
    TWO_PI,
    ONE_OVER_TWO_PI,
    DEGREES_PER_RADIAN,
    RADIANS_PER_DEGREE,
    RADIANS_PER_ARCSECOND,
    LUNAR_RADIUS,
    FOUR_GIGABYTES,
    toRadians,
    signNotZero,
    clamp,
    toSNorm,
    fromSNorm,
    negativePiToPi,
    zeroToTwoPi,
    mod,
    acosClamped,
    toDegrees,
    lerp,
    greaterThan,
    greaterThanOrEquals,
    lessThan,
    lessThanOrEquals,
    SIXTY_FOUR_KILOBYTES,
    /**
     * Returns the sign of the value; 1 if the value is positive, -1 if the value is
     * negative, or 0 if the value is 0.
     *
     * @function
     * @param {Number} value The value to return the sign of.
     * @returns {Number} The sign of value.
     */
    sign: defaultValue(Math.sign, function sign (value) {
        value = +value; // coerce to number
        // eslint-disable-next-line no-self-compare
        if (value === 0 || value !== value) {
            // zero or NaN
            return value;
        }
        return value > 0 ? 1 : -1;
    }),

    /**
     * @private
     */
    fog: (distanceToCamera: number, density: number): number => {
        const scalar = distanceToCamera * density;
        return 1.0 - Math.exp(-(scalar * scalar));
    }
};

export { CesiumMath };
