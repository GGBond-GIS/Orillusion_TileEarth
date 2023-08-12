/* eslint-disable max-lines */
/**
 * A two dimensional region specified as longitude and latitude coordinates.
 *
 * @alias Rectangle
 * @constructor
 *
 * @param {Number} [west=0.0] The westernmost longitude, in radians, in the range [-Pi, Pi].
 * @param {Number} [south=0.0] The southernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 * @param {Number} [east=0.0] The easternmost longitude, in radians, in the range [-Pi, Pi].
 * @param {Number} [north=0.0] The northernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 *
 * @see Packable
 */

import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';

class Rectangle {
    west: number;
    south: number;
    east: number;
    north: number;
    constructor (west = 0.0, south = 0.0, east = 0.0, north = 0.0) {
        /**
          * The westernmost longitude in radians in the range [-Pi, Pi].
          *
          * @type {Number}
          * @default 0.0
          */
        this.west = west;

        /**
          * The southernmost latitude in radians in the range [-Pi/2, Pi/2].
          *
          * @type {Number}
          * @default 0.0
          */
        this.south = south;

        /**
          * The easternmost longitude in radians in the range [-Pi, Pi].
          *
          * @type {Number}
          * @default 0.0
          */
        this.east = east;

        /**
          * The northernmost latitude in radians in the range [-Pi/2, Pi/2].
          *
          * @type {Number}
          * @default 0.0
          */
        this.north = north;
    }

    get width ():number {
        return Rectangle.computeWidth(this);
    }

    get height ():number {
        return Rectangle.computeHeight(this);
    }

    /**
      * Computes the width of a rectangle in radians.
      * @param {Rectangle} rectangle The rectangle to compute the width of.
      * @returns {Number} The width.
      */
    static computeWidth (rectangle:Rectangle):number {
        let east = rectangle.east;
        const west = rectangle.west;
        if (east < west) {
            east += CesiumMath.TWO_PI;
        }
        return east - west;
    }

    /**
      * Computes the height of a rectangle in radians.
      * @param {Rectangle} rectangle The rectangle to compute the height of.
      * @returns {Number} The height.
      */
    static computeHeight (rectangle:Rectangle):number {
        return rectangle.north - rectangle.south;
    }

    /**
      * Creates a rectangle given the boundary longitude and latitude in radians.
      *
      * @param {Number} [west=0.0] The westernmost longitude in radians in the range [-Math.PI, Math.PI].
      * @param {Number} [south=0.0] The southernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
      * @param {Number} [east=0.0] The easternmost longitude in radians in the range [-Math.PI, Math.PI].
      * @param {Number} [north=0.0] The northernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
      * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
      * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
      *
      * @example
      * var rectangle = Cesium.Rectangle.fromRadians(0.0, Math.PI/4, Math.PI/8, 3*Math.PI/4);
      */
    static fromRadians (west = 0.0, south = 0.0, east = 0.0, north = 0.0, result?:Rectangle):Rectangle {
        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }

        (result as Rectangle).west = defaultValue(west, 0.0);
        (result as Rectangle).south = defaultValue(south, 0.0);
        (result as Rectangle).east = defaultValue(east, 0.0);
        (result as Rectangle).north = defaultValue(north, 0.0);

        return (result as Rectangle);
    }

    /**
      * Computes the southwest corner of a rectangle.
      *
      * @param {Rectangle} rectangle The rectangle for which to find the corner
      * @param {Cartographic} [result] The object onto which to store the result.
      * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
      */
    static southwest (rectangle:Rectangle, result?:Cartographic):Cartographic {
        if (!defined(result)) {
            return new Cartographic(rectangle.west, rectangle.south);
        }
        (result as Cartographic).longitude = rectangle.west;
        (result as Cartographic).latitude = rectangle.south;
        (result as Cartographic).height = 0.0;
        return (result as Cartographic);
    }

    /**
     * Computes the northwest corner of a rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    static northwest (rectangle:Rectangle, result?:Cartographic):Cartographic {
        if (!defined(result)) {
            return new Cartographic(rectangle.west, rectangle.north);
        }
        (result as Cartographic).longitude = rectangle.west;
        (result as Cartographic).latitude = rectangle.north;
        (result as Cartographic).height = 0.0;
        return (result as Cartographic);
    }

    /**
     * Computes the northeast corner of a rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    static northeast (rectangle:Rectangle, result?:Cartographic):Cartographic {
        if (!defined(result)) {
            return new Cartographic(rectangle.east, rectangle.north);
        }
        (result as Cartographic).longitude = rectangle.east;
        (result as Cartographic).latitude = rectangle.north;
        (result as Cartographic).height = 0.0;
        return (result as Cartographic);
    }

    /**
     * Computes the southeast corner of a rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    static southeast (rectangle:Rectangle, result?:Cartographic):Cartographic {
        if (!defined(result)) {
            return new Cartographic(rectangle.east, rectangle.south);
        }
        (result as Cartographic).longitude = rectangle.east;
        (result as Cartographic).latitude = rectangle.south;
        (result as Cartographic).height = 0.0;
        return (result as Cartographic);
    }

    /**
      * Computes the center of a rectangle.
      *
      * @param {Rectangle} rectangle The rectangle for which to find the center
      * @param {Cartographic} [result] The object onto which to store the result.
      * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
      */
    static center (rectangle:Rectangle, result?:Cartographic):Cartographic {
        let east = rectangle.east;
        const west = rectangle.west;

        if (east < west) {
            east += CesiumMath.TWO_PI;
        }

        const longitude = CesiumMath.negativePiToPi((west + east) * 0.5);
        const latitude = (rectangle.south + rectangle.north) * 0.5;

        if (!defined(result)) {
            return new Cartographic(longitude, latitude);
        }

        (result as Cartographic).longitude = longitude;
        (result as Cartographic).latitude = latitude;
        (result as Cartographic).height = 0.0;
        return (result as Cartographic);
    }

    /**
      * Duplicates a Rectangle.
      *
      * @param {Rectangle} rectangle The rectangle to clone.
      * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
      * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided. (Returns undefined if rectangle is undefined)
      */
    static clone (rectangle:Rectangle, result?:Rectangle):Rectangle | undefined {
        if (!defined(rectangle)) {
            return undefined;
        }

        if (!defined(result)) {
            return new Rectangle(rectangle.west, rectangle.south, rectangle.east, rectangle.north);
        }

        (result as Rectangle).west = rectangle.west;
        (result as Rectangle).south = rectangle.south;
        (result as Rectangle).east = rectangle.east;
        (result as Rectangle).north = rectangle.north;
        return (result as Rectangle);
    }

    /**
      * Computes the intersection of two rectangles.  This function assumes that the rectangle's coordinates are
      * latitude and longitude in radians and produces a correct intersection, taking into account the fact that
      * the same angle can be represented with multiple values as well as the wrapping of longitude at the
      * anti-meridian.  For a simple intersection that ignores these factors and can be used with projected
      * coordinates, see {@link Rectangle.simpleIntersection}.
      *
      * @param {Rectangle} rectangle On rectangle to find an intersection
      * @param {Rectangle} otherRectangle Another rectangle to find an intersection
      * @param {Rectangle} [result] The object onto which to store the result.
      * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
      */
    static intersection (rectangle:Rectangle, otherRectangle:Rectangle, result?:Rectangle) :Rectangle | undefined {
        let rectangleEast = rectangle.east;
        let rectangleWest = rectangle.west;

        let otherRectangleEast = otherRectangle.east;
        let otherRectangleWest = otherRectangle.west;

        if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
            rectangleEast += CesiumMath.TWO_PI;
        } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
            otherRectangleEast += CesiumMath.TWO_PI;
        }

        if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
            otherRectangleWest += CesiumMath.TWO_PI;
        } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
            rectangleWest += CesiumMath.TWO_PI;
        }

        const west = CesiumMath.negativePiToPi(Math.max(rectangleWest, otherRectangleWest));
        const east = CesiumMath.negativePiToPi(Math.min(rectangleEast, otherRectangleEast));

        if ((rectangle.west < rectangle.east || otherRectangle.west < otherRectangle.east) && east <= west) {
            return undefined;
        }

        const south = Math.max(rectangle.south, otherRectangle.south);
        const north = Math.min(rectangle.north, otherRectangle.north);

        if (south >= north) {
            return undefined;
        }

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }
        (result as Rectangle).west = west;
        (result as Rectangle).south = south;
        (result as Rectangle).east = east;
        (result as Rectangle).north = north;
        return result;
    }

    /**
      * Returns true if the cartographic is on or inside the rectangle, false otherwise.
      *
      * @param {Rectangle} rectangle The rectangle
      * @param {Cartographic} cartographic The cartographic to test.
      * @returns {Boolean} true if the provided cartographic is inside the rectangle, false otherwise.
      */
    static contains (rectangle:Rectangle, cartographic:Cartographic):boolean {
        let longitude = cartographic.longitude;
        const latitude = cartographic.latitude;

        const west = rectangle.west;
        let east = rectangle.east;

        if (east < west) {
            east += CesiumMath.TWO_PI;
            if (longitude < 0.0) {
                longitude += CesiumMath.TWO_PI;
            }
        }
        return (longitude > west || CesiumMath.equalsEpsilon(longitude, west, CesiumMath.EPSILON14)) &&
                    (longitude < east || CesiumMath.equalsEpsilon(longitude, east, CesiumMath.EPSILON14)) &&
                    latitude >= rectangle.south &&
                    latitude <= rectangle.north;
    }

    /**
      * Computes a simple intersection of two rectangles.  Unlike {@link Rectangle.intersection}, this function
      * does not attempt to put the angular coordinates into a consistent range or to account for crossing the
      * anti-meridian.  As such, it can be used for rectangles where the coordinates are not simply latitude
      * and longitude (i.e. projected coordinates).
      *
      * @param {Rectangle} rectangle On rectangle to find an intersection
      * @param {Rectangle} otherRectangle Another rectangle to find an intersection
      * @param {Rectangle} [result] The object onto which to store the result.
      * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
      */
    static simpleIntersection (rectangle:Rectangle, otherRectangle:Rectangle, result?:Rectangle):Rectangle| undefined {
        const west = Math.max(rectangle.west, otherRectangle.west);
        const south = Math.max(rectangle.south, otherRectangle.south);
        const east = Math.min(rectangle.east, otherRectangle.east);
        const north = Math.min(rectangle.north, otherRectangle.north);

        if (south >= north || west >= east) {
            return undefined;
        }

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }

        (result as Rectangle).west = west;
        (result as Rectangle).south = south;
        (result as Rectangle).east = east;
        (result as Rectangle).north = north;
        return result;
    }

    /**
      * Compares the provided rectangles and returns <code>true</code> if they are equal,
      * <code>false</code> otherwise.
      *
      * @param {Rectangle} [left] The first Rectangle.
      * @param {Rectangle} [right] The second Rectangle.
      * @returns {Boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
      */
    static equals (left?:Rectangle, right?:Rectangle):boolean {
        // eslint-disable-next-line no-mixed-operators
        return left === right ||
                defined(left) &&
                    defined(right) &&
                    (left as Rectangle).west === (right as Rectangle).west &&
                    (left as Rectangle).south === (right as Rectangle).south &&
                    // eslint-disable-next-line no-mixed-operators
                    (left as Rectangle).east === (right as Rectangle).east &&
                    (left as Rectangle).north === (right as Rectangle).north;
    }

    static MAX_VALUE = Object.freeze(new Rectangle(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

    /**
 * Creates a rectangle given the boundary longitude and latitude in degrees.
 *
 * @param {Number} [west=0.0] The westernmost longitude in degrees in the range [-180.0, 180.0].
 * @param {Number} [south=0.0] The southernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {Number} [east=0.0] The easternmost longitude in degrees in the range [-180.0, 180.0].
 * @param {Number} [north=0.0] The northernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 *
 * @example
 * var rectangle = Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0);
 */
    static fromDegrees (west = 0.0, south = 0.0, east = 0.0, north = 0.0, result?: Rectangle): Rectangle {
        west = CesiumMath.toRadians(defaultValue(west, 0.0));
        south = CesiumMath.toRadians(defaultValue(south, 0.0));
        east = CesiumMath.toRadians(defaultValue(east, 0.0));
        north = CesiumMath.toRadians(defaultValue(north, 0.0));

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }

        (result as Rectangle).west = west;
        (result as Rectangle).south = south;
        (result as Rectangle).east = east;
        (result as Rectangle).north = north;

        return (result as Rectangle);
    }
}

// Rectangle.MAX_VALUE = Object.freeze(new Rectangle(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

export { Rectangle };
