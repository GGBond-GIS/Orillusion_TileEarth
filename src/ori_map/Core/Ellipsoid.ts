/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Rectangle } from './Rectangle';
import { scaleToGeodeticSurface } from './scaleToGeodeticSurface';

const abscissas = [
    0.14887433898163,
    0.43339539412925,
    0.67940956829902,
    0.86506336668898,
    0.97390652851717,
    0.0
];
const weights = [
    0.29552422471475,
    0.26926671930999,
    0.21908636251598,
    0.14945134915058,
    0.066671344308684,
    0.0
];

function initialize (ellipsoid:Ellipsoid, x = 0.0, y = 0.0, z = 0.0) {
    ellipsoid._radii = new Cartesian3(x, y, z);

    ellipsoid._radiiSquared = new Cartesian3(x * x, y * y, z * z);

    ellipsoid._radiiToTheFourth = new Cartesian3(
        x * x * x * x,
        y * y * y * y,
        z * z * z * z
    );

    ellipsoid._oneOverRadii = new Cartesian3(
        x === 0.0 ? 0.0 : 1.0 / x,
        y === 0.0 ? 0.0 : 1.0 / y,
        z === 0.0 ? 0.0 : 1.0 / z
    );

    ellipsoid._oneOverRadiiSquared = new Cartesian3(
        x === 0.0 ? 0.0 : 1.0 / (x * x),
        y === 0.0 ? 0.0 : 1.0 / (y * y),
        z === 0.0 ? 0.0 : 1.0 / (z * z)
    );

    ellipsoid._minimumRadius = Math.min(x, y, z);

    ellipsoid._maximumRadius = Math.max(x, y, z);

    ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1;

    if (ellipsoid._radiiSquared.z !== 0) {
        ellipsoid._squaredXOverSquaredZ =
        ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
    }
}

/**
   * Compute the 10th order Gauss-Legendre Quadrature of the given definite integral.
   *
   * @param {Number} a The lower bound for the integration.
   * @param {Number} b The upper bound for the integration.
   * @param {Ellipsoid~RealValuedScalarFunction} func The function to integrate.
   * @returns {Number} The value of the integral of the given function over the given domain.
   *
   * @private
   */
function gaussLegendreQuadrature (a: number, b: number, func: (value: number)=>number): number {
    // The range is half of the normal range since the five weights add to one (ten weights add to two).
    // The values of the abscissas are multiplied by two to account for this.
    const xMean = 0.5 * (b + a);
    const xRange = 0.5 * (b - a);

    let sum = 0.0;
    for (let i = 0; i < 5; i++) {
        const dx = xRange * abscissas[i];
        sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
    }

    // Scale the sum to the range of x.
    sum *= xRange;
    return sum;
}

const cartographicToCartesianNormal = new Cartesian3();
const cartographicToCartesianK = new Cartesian3();

const cartesianToCartographicN = new Cartesian3();
const cartesianToCartographicP = new Cartesian3();
const cartesianToCartographicH = new Cartesian3();

class Ellipsoid {
    _radii?: Cartesian3 ;
    _radiiSquared?: Cartesian3 ;
    _radiiToTheFourth?: Cartesian3 ;
    _oneOverRadii?: Cartesian3;
    _oneOverRadiiSquared?: Cartesian3;
    _minimumRadius?: number;
    _maximumRadius?: number;
    _centerToleranceSquared?: number;
    _squaredXOverSquaredZ?: number;
    constructor (x?: number, y?: number, z?: number) {
        this._radii = undefined;
        this._radiiSquared = undefined;
        this._radiiToTheFourth = undefined;
        this._oneOverRadii = undefined;
        this._oneOverRadiiSquared = undefined;
        this._minimumRadius = undefined;
        this._maximumRadius = undefined;
        this._centerToleranceSquared = undefined;
        this._squaredXOverSquaredZ = undefined;

        initialize(this, x, y, z);
    }

    get radii (): Cartesian3 {
        return (this._radii as Cartesian3);
    }

    get radiiSquared (): Cartesian3 | undefined {
        return this._radiiSquared;
    }

    get radiiToTheFourth (): Cartesian3 | undefined {
        return this._radiiToTheFourth;
    }

    get oneOverRadii (): Cartesian3 | undefined {
        return this._oneOverRadii;
    }

    /**
     * Gets one over the squared radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    get oneOverRadiiSquared (): Cartesian3 {
        return (this._oneOverRadiiSquared as Cartesian3);
    }

    /**
     * Gets the minimum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    get minimumRadius (): number {
        return this._minimumRadius as number;
    }

    /**
     * Gets the maximum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    get maximumRadius (): number {
        return (this._maximumRadius as number);
    }

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
     */
    static clone (ellipsoid:Ellipsoid, result?:Ellipsoid): Ellipsoid | undefined {
        if (!defined(ellipsoid)) {
            return undefined;
        }
        const radii = ellipsoid._radii;

        if (!defined(result)) {
            return new Ellipsoid((radii as Cartesian3).x, (radii as Cartesian3).y, (radii as Cartesian3).z);
        }

        Cartesian3.clone((radii as Cartesian3), (result as Ellipsoid)._radii);
        Cartesian3.clone((ellipsoid._radiiSquared as Cartesian3), (result as Ellipsoid)._radiiSquared);
        Cartesian3.clone((ellipsoid._radiiToTheFourth as Cartesian3), (result as Ellipsoid)._radiiToTheFourth);
        Cartesian3.clone((ellipsoid._oneOverRadii as Cartesian3), (result as Ellipsoid)._oneOverRadii);
        Cartesian3.clone((ellipsoid._oneOverRadiiSquared as Cartesian3), (result as Ellipsoid)._oneOverRadiiSquared);
        (result as Ellipsoid)._minimumRadius = ellipsoid._minimumRadius;
        (result as Ellipsoid)._maximumRadius = ellipsoid._maximumRadius;
        (result as Ellipsoid)._centerToleranceSquared = ellipsoid._centerToleranceSquared;

        return result;
    }

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [cartesian=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} A new Ellipsoid instance.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    static fromCartesian3 (cartesian = Cartesian3.ZERO, result = new Ellipsoid()): Ellipsoid {
        if (!defined(cartesian)) {
            return result;
        }

        initialize(result, cartesian.x, cartesian.y, cartesian.z);
        return result;
    }

    /**
     * An Ellipsoid instance initialized to the WGS84 standard.
     *
     * @type {Ellipsoid}
     * @constant
     */
    static WGS84 = Object.freeze(
        new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793)
    );

    /**
     * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     *
     * @type {Ellipsoid}
     * @constant
     */
    static UNIT_SPHERE = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0));

    /**
     * An Ellipsoid instance initialized to a sphere with the lunar radius.
     *
     * @type {Ellipsoid}
     * @constant
     */
    static MOON = Object.freeze(
        new Ellipsoid(
            CesiumMath.LUNAR_RADIUS,
            CesiumMath.LUNAR_RADIUS,
            CesiumMath.LUNAR_RADIUS
        )
    );

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid.
     */
    clone (result?:Ellipsoid): Ellipsoid | undefined {
        return Ellipsoid.clone(this, result);
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    static packedLength = Cartesian3.packedLength;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Ellipsoid} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    static pack (value:Ellipsoid, array: number[], startingIndex = 0.0) {
        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value.radii, array, startingIndex);

        return array;
    }

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Ellipsoid} [result] The object into which to store the result.
     * @returns {Ellipsoid} The modified result parameter or a new Ellipsoid instance if one was not provided.
     */
    static unpack (array: number[], startingIndex = 0, result:Ellipsoid) {
        startingIndex = defaultValue(startingIndex, 0);

        const radii = Cartesian3.unpack(array, startingIndex);
        return Ellipsoid.fromCartesian3(radii, result);
    }

    /**
     * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
     * @function
     *
     * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    geocentricSurfaceNormal = Cartesian3.normalize;

    /**
         * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
         *
         * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
         * @param {Cartesian3} [result] The object onto which to store the result.
         * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
         */
    geodeticSurfaceNormalCartographic (cartographic: Cartographic, result?: Cartesian3):Cartesian3 {
        const longitude = cartographic.longitude;
        const latitude = cartographic.latitude;
        const cosLatitude = Math.cos(latitude);

        const x = cosLatitude * Math.cos(longitude);
        const y = cosLatitude * Math.sin(longitude);
        const z = Math.sin(latitude);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        (result as Cartesian3).x = x;
        (result as Cartesian3).y = y;
        (result as Cartesian3).z = z;
        return Cartesian3.normalize((result as Cartesian3), (result as Cartesian3));
    }

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided, or undefined if a normal cannot be found.
     */
    geodeticSurfaceNormal (cartesian:Cartesian3, result?: Cartesian3):Cartesian3|undefined {
        if (Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, CesiumMath.EPSILON14)) {
            return undefined;
        }
        if (!defined(result)) {
            result = new Cartesian3();
        }
        (result as Cartesian3) = Cartesian3.multiplyComponents(
            cartesian,
            this.oneOverRadiiSquared,
            (result as Cartesian3)
        );
        return Cartesian3.normalize((result as Cartesian3), (result as Cartesian3));
    }

    /**
     * Converts the provided cartographic to Cartesian representation.
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @example
     * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
     * var cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
     */
    cartographicToCartesian (cartographic:Cartographic, result?:Cartesian3):Cartesian3 {
        // `cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
        const n = cartographicToCartesianNormal;
        const k = cartographicToCartesianK;
        this.geodeticSurfaceNormalCartographic(cartographic, n);
        Cartesian3.multiplyComponents((this._radiiSquared as Cartesian3), n, k);
        const gamma = Math.sqrt(Cartesian3.dot(n, k));
        Cartesian3.divideByScalar(k, gamma, k);
        Cartesian3.multiplyByScalar(n, cartographic.height, n);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        return Cartesian3.add(k, n, (result as Cartesian3));
    }

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     *
     * @param {Cartographic[]} cartographics An array of cartographic positions.
     * @param {Cartesian3[]} [result] The object onto which to store the result.
     * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)];
     * var cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
     */
    cartographicArrayToCartesianArray (cartographics:Cartographic[], result?:Cartesian3[]):Cartesian3[] {
        const length = cartographics.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            (result as Array<Cartesian3>).length = length;
        }
        for (let i = 0; i < length; i++) {
            (result as Array<Cartesian3>)[i] = this.cartographicToCartesian((cartographics[i] as Cartographic), (result as Array<Cartesian3>)[i]);
        }
        return (result as Array<Cartesian3>);
    }

    /**
     * Converts the provided cartesian to cartographic representation.
     * The cartesian is undefined at the center of the ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
     *
     * @example
     * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartesian3(17832.12, 83234.52, 952313.73);
     * var cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
     */
    cartesianToCartographic (cartesian:Cartesian3, result?:Cartographic):Cartographic | undefined {
        // `cartesian is required.` is thrown from scaleToGeodeticSurface
        const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

        if (!defined(p)) {
            return undefined;
        }

        const n = this.geodeticSurfaceNormal((p as Cartesian3), cartesianToCartographicN) as Cartesian3;
        const h = Cartesian3.subtract(cartesian, (p as Cartesian3), cartesianToCartographicH);

        const longitude = Math.atan2(n.y, n.x);
        const latitude = Math.asin(n.z);
        const height =
        CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }
        (result as Cartographic).longitude = longitude;
        (result as Cartographic).latitude = latitude;
        (result as Cartographic).height = height;
        return result;
    }

    /**
     * Converts the provided array of cartesians to an array of cartographics.
     *
     * @param {Cartesian3[]} cartesians An array of Cartesian positions.
     * @param {Cartographic[]} [result] The object onto which to store the result.
     * @returns {Cartographic[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartesian3(17832.12, 83234.52, 952313.73),
     *                  new Cesium.Cartesian3(17832.13, 83234.53, 952313.73),
     *                  new Cesium.Cartesian3(17832.14, 83234.54, 952313.73)]
     * var cartographicPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
     */
    cartesianArrayToCartographicArray (cartesians: Cartesian3[], result?:(Cartographic | undefined)[]):Cartographic[] {
        const length = cartesians.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            (result as Array<Cartographic>).length = length;
        }
        for (let i = 0; i < length; ++i) {
            (result as Array<Cartographic>)[i] = this.cartesianToCartographic(cartesians[i], (result as Array<Cartographic>)[i]) as Cartographic;
        }
        return (result as Array<Cartographic>);
    }

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of this ellipsoid.  If the position is
     * at the center of the ellipsoid, this function returns undefined.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
     */
    scaleToGeodeticSurface (cartesian:Cartesian3, result?:Cartesian3): Cartesian3 | undefined {
        return scaleToGeodeticSurface(
            cartesian,
            (this._oneOverRadii as Cartesian3),
            (this._oneOverRadiiSquared as Cartesian3),
            (this._centerToleranceSquared as number),
            result
        );
    }

    /**
     * Scales the provided Cartesian position along the geocentric surface normal
     * so that it is on the surface of this ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    scaleToGeocentricSurface (cartesian:Cartesian3, result?:Cartesian3):Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        const positionX = cartesian.x;
        const positionY = cartesian.y;
        const positionZ = cartesian.z;
        const oneOverRadiiSquared = this._oneOverRadiiSquared as Cartesian3;

        const beta =
        1.0 /
        Math.sqrt(
            positionX * positionX * oneOverRadiiSquared.x +
            positionY * positionY * oneOverRadiiSquared.y +
            positionZ * positionZ * oneOverRadiiSquared.z
        );

        return Cartesian3.multiplyByScalar(cartesian, beta, result as Cartesian3);
    }

    /**
     * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#oneOverRadii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    transformPositionToScaledSpace (
        position:Cartesian3,
        result?:Cartesian3
    ):Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, (this._oneOverRadii as Cartesian3), (result as Cartesian3));
    }

    /**
     * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#radii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the unscaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    transformPositionFromScaledSpace (
        position:Cartesian3,
        result?:Cartesian3
    ):Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, (this._radii as Cartesian3), (result as Cartesian3));
    }

    /**
     * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Ellipsoid} [right] The other Ellipsoid.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    equals (right?:Ellipsoid) {
        return (
            this === right ||
        (defined(right) && Cartesian3.equals(this._radii, (right as Ellipsoid)._radii))
        );
    }

    /**
     * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     *
     * @returns {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     */
    toString ():string {
        return (this._radii as Cartesian3).toString();
    }

    /**
     * Computes a point which is the intersection of the surface normal with the z-axis.
     *
     * @param {Cartesian3} position the position. must be on the surface of the ellipsoid.
     * @param {Number} [buffer = 0.0] A buffer to subtract from the ellipsoid size when checking if the point is inside the ellipsoid.
     *                                In earth case, with common earth datums, there is no need for this buffer since the intersection point is always (relatively) very close to the center.
     *                                In WGS84 datum, intersection point is at max z = +-42841.31151331382 (0.673% of z-axis).
     *                                Intersection point could be outside the ellipsoid if the ratio of MajorAxis / AxisOfRotation is bigger than the square root of 2
     * @param {Cartesian3} [result] The cartesian to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3 | undefined} the intersection point if it's inside the ellipsoid, undefined otherwise
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y).
     * @exception {DeveloperError} Ellipsoid.radii.z must be greater than 0.
     */
    getSurfaceNormalIntersectionWithZAxis (
        position:Cartesian3,
        buffer = 0.0,
        result?:Cartesian3
    ):Cartesian3 | undefined {
        // >>includeStart('debug', pragmas.debug);

        if (
            !CesiumMath.equalsEpsilon(
                (this._radii as Cartesian3).x,
                (this._radii as Cartesian3).y,
                CesiumMath.EPSILON15
            )
        ) {
            throw new DeveloperError(
                'Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)'
            );
        }

        // >>includeEnd('debug');

        buffer = defaultValue(buffer, 0.0);

        const squaredXOverSquaredZ = this._squaredXOverSquaredZ as number;

        if (!defined(result)) {
            result = new Cartesian3();
        }

        (result as Cartesian3).x = 0.0;
        (result as Cartesian3).y = 0.0;
        (result as Cartesian3).z = position.z * (1 - squaredXOverSquaredZ);

        if (Math.abs((result as Cartesian3).z) >= (this._radii as Cartesian3).z - buffer) {
            return undefined;
        }

        return result;
    }

    /**
     * A real valued scalar function.
     * @callback Ellipsoid~RealValuedScalarFunction
     *
     * @param {Number} x The value used to evaluate the function.
     * @returns {Number} The value of the function at x.
     *
     * @private
     */

    /**
     * Computes an approximation of the surface area of a rectangle on the surface of an ellipsoid using
     * Gauss-Legendre 10th order quadrature.
     *
     * @param {Rectangle} rectangle The rectangle used for computing the surface area.
     * @returns {Number} The approximate area of the rectangle on the surface of this ellipsoid.
     */
    surfaceArea (rectangle:Rectangle): number {
        const minLongitude = rectangle.west;
        let maxLongitude = rectangle.east;
        const minLatitude = rectangle.south;
        const maxLatitude = rectangle.north;

        while (maxLongitude < minLongitude) {
            maxLongitude += CesiumMath.TWO_PI;
        }

        const radiiSquared = this._radiiSquared as Cartesian3;
        const a2 = radiiSquared.x;
        const b2 = radiiSquared.y;
        const c2 = radiiSquared.z;
        const a2b2 = a2 * b2;
        return gaussLegendreQuadrature(minLatitude, maxLatitude, function (lat: number) {
        // phi represents the angle measured from the north pole
        // sin(phi) = sin(pi / 2 - lat) = cos(lat), cos(phi) is similar
            const sinPhi = Math.cos(lat);
            const cosPhi = Math.sin(lat);
            return (
                Math.cos(lat) *
            gaussLegendreQuadrature(minLongitude, maxLongitude, function (lon: number) {
                const cosTheta = Math.cos(lon);
                const sinTheta = Math.sin(lon);
                return Math.sqrt(
                    a2b2 * cosPhi * cosPhi +
                c2 *
                    (b2 * cosTheta * cosTheta + a2 * sinTheta * sinTheta) *
                    sinPhi *
                    sinPhi
                );
            })
            );
        });
    }
}
export { Ellipsoid };
