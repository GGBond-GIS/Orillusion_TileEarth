import { Cartesian3 } from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

class Cartesian2 {
    x: number;
    y: number;
    constructor (x = 0.0, y = 0.0) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);
    }

    /**
     * An immutable Cartesian2 instance initialized to (0.0, 0.0).
     *
     * @type {Cartesian2}
     * @constant
     */
    static ZERO = Object.freeze(new Cartesian2(0.0, 0.0));

    /**
     * An immutable Cartesian2 instance initialized to (1.0, 0.0).
     *
     * @type {Cartesian2}
     * @constant
     */
     static UNIT_X = Object.freeze(new Cartesian2(1.0, 0.0));

     /**
     * An immutable Cartesian2 instance initialized to (0.0, 1.0).
     *
     * @type {Cartesian2}
     * @constant
     */
     static UNIT_Y = Object.freeze(new Cartesian2(0.0, 1.0));

     /**
     * Duplicates a Cartesian2 instance.
     *
     * @param {Cartesian2} cartesian The Cartesian to duplicate.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided. (Returns undefined if cartesian is undefined)
    */
     static clone (cartesian?:Cartesian2, result?:Cartesian2):Cartesian2 | undefined {
         if (!defined(cartesian)) {
             return undefined;
         }
         if (!defined(result)) {
             return new Cartesian2((cartesian as Cartesian2).x, (cartesian as Cartesian2).y);
         }

         (result as Cartesian2).x = (cartesian as Cartesian2).x;
         (result as Cartesian2).y = (cartesian as Cartesian2).y;
         return result;
     }

     /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian2} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
     static multiplyByScalar (cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2 {
         result.x = cartesian.x * scalar;
         result.y = cartesian.y * scalar;
         return result;
     }

     /**
     * Computes the componentwise sum of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
     static add (left: Cartesian2, right: Cartesian2, result: Cartesian2) : Cartesian2 {
         result.x = left.x + right.x;
         result.y = left.y + right.y;
         return result;
     }

    static lerp: (start: Cartesian2, end: Cartesian2, t: number, result: Cartesian2) => Cartesian2

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian2} [left] The first Cartesian.
     * @param {Cartesian2} [right] The second Cartesian.
     * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    static equalsEpsilon (
        left?:Cartesian2,
        right?:Cartesian2,
        relativeEpsilon = 0.0,
        absoluteEpsilon?: number
    ):boolean {
        return (
            left === right ||
    (defined(left) &&
      defined(right) &&
      CesiumMath.equalsEpsilon(
          (left as Cartesian2).x,
          (right as Cartesian2).x,
          relativeEpsilon,
          absoluteEpsilon
      ) &&
      CesiumMath.equalsEpsilon(
          (left as Cartesian2).y,
          (right as Cartesian2).y,
          relativeEpsilon,
          absoluteEpsilon
      ))
        );
    }

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian2} [left] The first Cartesian.
     * @param {Cartesian2} [right] The second Cartesian.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    static equals (left?:Cartesian2, right?:Cartesian2):boolean {
        return (
            left === right ||
            (defined(left) &&
            defined(right) &&
            (left as Cartesian2).x === (right as Cartesian2).x &&
            (left as Cartesian2).y === (right as Cartesian2).y)
        );
    }

    /**
     * Computes the componentwise difference of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    static subtract (left:Cartesian2, right:Cartesian2, result:Cartesian2):Cartesian2 {
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        return result;
    }

    /**
     * Computes the provided Cartesian's squared magnitude.
     *
     * @param {Cartesian2} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @returns {Number} The squared magnitude.
     */
    static magnitudeSquared (cartesian: Cartesian2): number {
        return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
    }

    /**
     * Computes the Cartesian's magnitude (length).
     *
     * @param {Cartesian2} cartesian The Cartesian instance whose magnitude is to be computed.
     * @returns {Number} The magnitude.
     */
    static magnitude (cartesian:Cartesian2): number {
        return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
    }

    /**
     * Computes the distance between two points.
     *
     * @param {Cartesian2} left The first point to compute the distance from.
     * @param {Cartesian2} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 1.0
     * var d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(2.0, 0.0));
     */
    static distance = function (left:Cartesian2, right:Cartesian2): number {
        Cartesian2.subtract(left, right, distanceScratch);
        return Cartesian2.magnitude(distanceScratch);
    }

    /**
     * Creates a Cartesian2 instance from x and y coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     */
    static fromElements (x: number, y: number, result?:Cartesian2):Cartesian2 {
        if (!defined(result)) {
            return new Cartesian2(x, y);
        }

        (result as Cartesian2).x = x;
        (result as Cartesian2).y = y;
        return (result as Cartesian2);
    }

    /**
 * Computes the normalized form of the supplied Cartesian.
 *
 * @param {Cartesian2} cartesian The Cartesian to be normalized.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 */
    static normalize (cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
        const magnitude = Cartesian2.magnitude(cartesian);

        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;

        // >>includeStart('debug', pragmas.debug);
        if (isNaN(result.x) || isNaN(result.y)) {
            throw new DeveloperError('normalized result is not a number');
        }
        // >>includeEnd('debug');

        return result;
    }
}

const distanceScratch = new Cartesian2();

const lerpScratch = new Cartesian2();
/**
 * Computes the linear interpolation or extrapolation at t using the provided cartesians.
 *
 * @param {Cartesian2} start The value corresponding to t at 0.0.
 * @param {Cartesian2} end The value corresponding to t at 1.0.
 * @param {Number} t The point along t at which to interpolate.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 */
Cartesian2.lerp = function (start: Cartesian2, end: Cartesian2, t: number, result: Cartesian2): Cartesian2 {
    Cartesian2.multiplyByScalar(end, t, lerpScratch);
    result = Cartesian2.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian2.add(lerpScratch, result, result);
};

export { Cartesian2 };
