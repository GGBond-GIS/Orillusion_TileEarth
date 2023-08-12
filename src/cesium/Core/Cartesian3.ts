/* eslint-disable no-useless-constructor */
import { Cartesian4 } from './Cartesian4';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Ellipsoid } from './Ellipsoid';

class Cartesian3 {
    x: number;
    y: number;
    z: number;
    constructor (x = 0.0, y = 0.0, z = 0.0) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = x;

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = y;

        /**
         * The Z component.
         * @type {Number}
         * @default 0.0
         */
        this.z = z;
    }

    static packedLength = 3;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Cartesian3} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    static pack (value:Cartesian3, array:number[], startingIndex = 0.0): number[] {
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.x;
        array[startingIndex++] = value.y;
        array[startingIndex] = value.z;

        return array;
    }

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Cartesian3} [result] The object into which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    static unpack (array: number[], startingIndex = 0, result?: Cartesian3):Cartesian3 {
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        (result as Cartesian3).x = array[startingIndex++];
        (result as Cartesian3).y = array[startingIndex++];
        (result as Cartesian3).z = array[startingIndex];
        return (result as Cartesian3);
    }

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    static ZERO = Object.freeze(new Cartesian3(0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    static UNIT_X = Object.freeze(new Cartesian3(1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    static UNIT_Y = Object.freeze(new Cartesian3(0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    static UNIT_Z = Object.freeze(new Cartesian3(0.0, 0.0, 1.0));

    /**
     * Duplicates this Cartesian3 instance.
     *
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    clone (result: Cartesian3): Cartesian3 | undefined {
        return Cartesian3.clone(this, result);
    }

    /**
     * Duplicates a Cartesian3 instance.
     *
     * @param {Cartesian3} cartesian The Cartesian to duplicate.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided. (Returns undefined if cartesian is undefined)
     */
    static clone (cartesian?: Cartesian3 | Cartesian4, result?: Cartesian3): Cartesian3 | any {
        if (!defined(cartesian)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Cartesian3((cartesian as Cartesian3).x, (cartesian as Cartesian3).y, (cartesian as Cartesian3).z);
        }

        (result as Cartesian3).x = (cartesian as Cartesian3).x;
        (result as Cartesian3).y = (cartesian as Cartesian3).y;
        (result as Cartesian3).z = (cartesian as Cartesian3).z;
        return (result as Cartesian3);
    }

    /**
     * Computes the provided Cartesian's squared magnitude.
     *
     * @param {Cartesian3} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @returns {Number} The squared magnitude.
     */
    static magnitudeSquared (cartesian: Cartesian3) : number {
        return (
            cartesian.x * cartesian.x +
            cartesian.y * cartesian.y +
            cartesian.z * cartesian.z
        );
    }

    /**
     * Computes the Cartesian's magnitude (length).
     *
     * @param {Cartesian3} cartesian The Cartesian instance whose magnitude is to be computed.
     * @returns {Number} The magnitude.
     */
    static magnitude (cartesian: Cartesian3): number {
        return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
    }

    /**
     * Computes the normalized form of the supplied Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian to be normalized.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static normalize (cartesian:Cartesian3, result:Cartesian3):Cartesian3 {
        const magnitude = Cartesian3.magnitude(cartesian);

        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;
        result.z = cartesian.z / magnitude;

        // >>includeStart('debug', pragmas.debug);
        if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
            throw new DeveloperError('normalized result is not a number');
        }
        // >>includeEnd('debug');

        return result;
    }

    /**
     * Computes the componentwise product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static multiplyComponents (left:Cartesian3, right:Cartesian3, result:Cartesian3):Cartesian3 {
        result.x = left.x * right.x;
        result.y = left.y * right.y;
        result.z = left.z * right.z;
        return result;
    }

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian3} [left] The first Cartesian.
     * @param {Cartesian3} [right] The second Cartesian.
     * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    static equalsEpsilon (left?:Cartesian3, right?:Cartesian3, relativeEpsilon?:number, absoluteEpsilon?: number):boolean {
        return (
            left === right ||
            (defined(left) &&
            defined(right) &&
        CesiumMath.equalsEpsilon((left as Cartesian3).x, (right as Cartesian3).x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon((left as Cartesian3).y, (right as Cartesian3).y, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon((left as Cartesian3).z, (right as Cartesian3).z, relativeEpsilon, absoluteEpsilon))
        );
    }

    /**
     * Computes the dot (scalar) product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @returns {Number} The dot product.
     */
    static dot (left:Cartesian3, right:Cartesian3):number {
        return left.x * right.x + left.y * right.y + left.z * right.z;
    }

    /**
     * Divides the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian3} cartesian The Cartesian to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static divideByScalar (cartesian:Cartesian3, scalar: number, result:Cartesian3):Cartesian3 {
        result.x = cartesian.x / scalar;
        result.y = cartesian.y / scalar;
        result.z = cartesian.z / scalar;
        return result;
    }

    /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian3} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static multiplyByScalar (cartesian:Cartesian3, scalar: number, result: Cartesian3):Cartesian3 {
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        result.z = cartesian.z * scalar;
        return result;
    }

    /**
     * Computes the componentwise sum of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static add (left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        return result;
    }

    /**
     * Computes the componentwise difference of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static subtract (left:Cartesian3, right:Cartesian3, result:Cartesian3):Cartesian3 {
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        return result;
    }

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian3} [left] The first Cartesian.
     * @param {Cartesian3} [right] The second Cartesian.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    static equals (left?:Cartesian3, right?:Cartesian3):boolean {
        return (
            left === right ||
            (defined(left) &&
            defined(right) &&
            (left as Cartesian3).x === (right as Cartesian3).x &&
            (left as Cartesian3).y === (right as Cartesian3).y &&
            (left as Cartesian3).z === (right as Cartesian3).z)
        );
    }

    /**
     * Creates a Cartesian3 instance from x, y and z coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Number} z The z coordinate.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    static fromElements (x:number, y: number, z: number, result?:Cartesian3):Cartesian3 {
        if (!defined(result)) {
            return new Cartesian3(x, y, z);
        }

        (result as Cartesian3).x = x;
        (result as Cartesian3).y = y;
        (result as Cartesian3).z = z;
        return (result as Cartesian3);
    }

    /**
     * Computes the cross (outer) product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The cross product.
     */
    static cross (left:Cartesian3, right:Cartesian3, result:Cartesian3):Cartesian3 {
        const leftX = left.x;
        const leftY = left.y;
        const leftZ = left.z;
        const rightX = right.x;
        const rightY = right.y;
        const rightZ = right.z;

        const x = leftY * rightZ - leftZ * rightY;
        const y = leftZ * rightX - leftX * rightZ;
        const z = leftX * rightY - leftY * rightX;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Computes the midpoint between the right and left Cartesian.
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The midpoint.
     */
    static midpoint (left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
        result.x = (left.x + right.x) * 0.5;
        result.y = (left.y + right.y) * 0.5;
        result.z = (left.z + right.z) * 0.5;

        return result;
    }

    /**
     * Computes the absolute value of the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian whose absolute value is to be computed.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static abs (cartesian:Cartesian3, result:Cartesian3) :Cartesian3 {
        result.x = Math.abs(cartesian.x);
        result.y = Math.abs(cartesian.y);
        result.z = Math.abs(cartesian.z);
        return result;
    }

    /**
     * Returns the axis that is most orthogonal to the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian on which to find the most orthogonal axis.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The most orthogonal axis.
     */
    static mostOrthogonalAxis (cartesian:Cartesian3, result:Cartesian3):Cartesian3 {
        const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
        Cartesian3.abs(f, f);

        if (f.x <= f.y) {
            if (f.x <= f.z) {
                result = Cartesian3.clone(Cartesian3.UNIT_X, result) as Cartesian3;
            } else {
                result = Cartesian3.clone(Cartesian3.UNIT_Z, result) as Cartesian3;
            }
        } else if (f.y <= f.z) {
            result = Cartesian3.clone(Cartesian3.UNIT_Y, result) as Cartesian3;
        } else {
            result = Cartesian3.clone(Cartesian3.UNIT_Z, result) as Cartesian3;
        }

        return result;
    }

    /**
     * Computes the distance between two points.
     *
     * @param {Cartesian3} left The first point to compute the distance from.
     * @param {Cartesian3} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 1.0
     * var d = Cesium.Cartesian3.distance(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(2.0, 0.0, 0.0));
     */
    static distance = function (left:Cartesian3, right:Cartesian3): number {
        Cartesian3.subtract(left, right, distanceScratch);
        return Cartesian3.magnitude(distanceScratch);
    };

    /**
     * Negates the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian to be negated.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static negate (cartesian:Cartesian3, result:Cartesian3):Cartesian3 {
        result.x = -cartesian.x;
        result.y = -cartesian.y;
        result.z = -cartesian.z;
        return result;
    }

    /**
     * Computes the value of the maximum component for the supplied Cartesian.
     *
     * @param {Cartesian3} cartesian The cartesian to use.
     * @returns {Number} The value of the maximum component.
     */
    static maximumComponent (cartesian: Cartesian3):number {
        return Math.max(cartesian.x, cartesian.y, cartesian.z);
    }

    /**
     * Returns a Cartesian3 position from longitude and latitude values given in radians.
     *
     * @param {Number} longitude The longitude, in radians
     * @param {Number} latitude The latitude, in radians
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The position
     *
     * @example
     * var position = Cesium.Cartesian3.fromRadians(-2.007, 0.645);
     */
    static fromRadians (
        longitude: number,
        latitude: number,
        height: number,
        ellipsoid: Ellipsoid,
        result?:Cartesian3
    ) :Cartesian3 {
        height = defaultValue(height, 0.0);
        const radiiSquared = defined(ellipsoid)
            ? ellipsoid.radiiSquared
            : wgs84RadiiSquared;

        const cosLatitude = Math.cos(latitude);
        scratchN.x = cosLatitude * Math.cos(longitude);
        scratchN.y = cosLatitude * Math.sin(longitude);
        scratchN.z = Math.sin(latitude);
        scratchN = Cartesian3.normalize(scratchN, scratchN);

        Cartesian3.multiplyComponents((radiiSquared as Cartesian3), scratchN, scratchK);
        const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
        scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
        scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        return Cartesian3.add(scratchK, scratchN, (result as Cartesian3));
    }

    /**
     * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
     *
     * @param {Cartesian3} first A cartesian to compare.
     * @param {Cartesian3} second A cartesian to compare.
     * @param {Cartesian3} result The object into which to store the result.
     * @returns {Cartesian3} A cartesian with the minimum components.
     */
    static minimumByComponent (first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
        result.x = Math.min(first.x, second.x);
        result.y = Math.min(first.y, second.y);
        result.z = Math.min(first.z, second.z);

        return result;
    }

    /**
     * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
     *
     * @param {Cartesian3} first A cartesian to compare.
     * @param {Cartesian3} second A cartesian to compare.
     * @param {Cartesian3} result The object into which to store the result.
     * @returns {Cartesian3} A cartesian with the maximum components.
     */
    static maximumByComponent (first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
        result.x = Math.max(first.x, second.x);
        result.y = Math.max(first.y, second.y);
        result.z = Math.max(first.z, second.z);
        return result;
    }

    /**
     * Creates a Cartesian3 instance from an existing Cartesian4.  This simply takes the
     * x, y, and z properties of the Cartesian4 and drops w.
     * @function
     *
     * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian3 instance from.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    static fromCartesian4 = Cartesian3.clone;

    /**
     * Computes the linear interpolation or extrapolation at t using the provided cartesians.
     *
     * @param {Cartesian3} start The value corresponding to t at 0.0.
     * @param {Cartesian3} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static lerp (start: Cartesian3, end: Cartesian3, t: number, result: Cartesian3): Cartesian3 {
        Cartesian3.multiplyByScalar(end, t, lerpScratch);
        result = Cartesian3.multiplyByScalar(start, 1.0 - t, result);
        return Cartesian3.add(lerpScratch, result, result);
    }

    /**
     * Returns the angle, in radians, between the provided Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @returns {Number} The angle between the Cartesians.
     */
    static angleBetween (left: Cartesian3, right: Cartesian3): number {
        Cartesian3.normalize(left, angleBetweenScratch);
        Cartesian3.normalize(right, angleBetweenScratch2);
        const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
        const sine = Cartesian3.magnitude(
            Cartesian3.cross(
                angleBetweenScratch,
                angleBetweenScratch2,
                angleBetweenScratch
            )
        );
        return Math.atan2(sine, cosine);
    }
}
const distanceScratch = new Cartesian3();
const mostOrthogonalAxisScratch = new Cartesian3();

let scratchN = new Cartesian3();
let scratchK = new Cartesian3();
const wgs84RadiiSquared = new Cartesian3(
    6378137.0 * 6378137.0,
    6378137.0 * 6378137.0,
    6356752.3142451793 * 6356752.3142451793
);

const lerpScratch = new Cartesian3();

const angleBetweenScratch = new Cartesian3();
const angleBetweenScratch2 = new Cartesian3();

export { Cartesian3 };
