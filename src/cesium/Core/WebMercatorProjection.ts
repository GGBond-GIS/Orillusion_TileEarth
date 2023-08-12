import { Cartesian2 } from './Cartesian2';
import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Ellipsoid } from './Ellipsoid';

/**
 * The map projection used by Google Maps, Bing Maps, and most of ArcGIS Online, EPSG:3857.  This
 * projection use longitude and latitude expressed with the WGS84 and transforms them to Mercator using
 * the spherical (rather than ellipsoidal) equations.
 *
 * @alias WebMercatorProjection
 * @constructor
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 *
 * @see GeographicProjection
 */
class WebMercatorProjection {
    _ellipsoid: Ellipsoid;
    _semimajorAxis: number;
    _oneOverSemimajorAxis: number;
    constructor (ellipsoid = Ellipsoid.WGS84) {
        this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        this._semimajorAxis = this._ellipsoid.maximumRadius;
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
    }

    get ellipsoid (): Ellipsoid {
        return this._ellipsoid;
    }

    /**
     * Converts a Mercator angle, in the range -PI to PI, to a geodetic latitude
     * in the range -PI/2 to PI/2.
     *
     * @param {Number} mercatorAngle The angle to convert.
     * @returns {Number} The geodetic latitude in radians.
     */
    static mercatorAngleToGeodeticLatitude = function (mercatorAngle: number): number {
        return CesiumMath.PI_OVER_TWO - 2.0 * Math.atan(Math.exp(-mercatorAngle));
    };

    /**
     * Converts a geodetic latitude in radians, in the range -PI/2 to PI/2, to a Mercator
     * angle in the range -PI to PI.
     *
     * @param {Number} latitude The geodetic latitude in radians.
     * @returns {Number} The Mercator angle.
     */
    static geodeticLatitudeToMercatorAngle = function (latitude: number): number {
        // Clamp the latitude coordinate to the valid Mercator bounds.
        if (latitude > WebMercatorProjection.MaximumLatitude) {
            latitude = WebMercatorProjection.MaximumLatitude;
        } else if (latitude < -WebMercatorProjection.MaximumLatitude) {
            latitude = -WebMercatorProjection.MaximumLatitude;
        }
        const sinLatitude = Math.sin(latitude);
        return 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    };

    /**
     * The maximum latitude (both North and South) supported by a Web Mercator
     * (EPSG:3857) projection.  Technically, the Mercator projection is defined
     * for any latitude up to (but not including) 90 degrees, but it makes sense
     * to cut it off sooner because it grows exponentially with increasing latitude.
     * The logic behind this particular cutoff value, which is the one used by
     * Google Maps, Bing Maps, and Esri, is that it makes the projection
     * square.  That is, the rectangle is equal in the X and Y directions.
     *
     * The constant value is computed by calling:
     *    WebMercatorProjection.mercatorAngleToGeodeticLatitude(Math.PI)
     *
     * @type {Number}
     */
    static MaximumLatitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(
        Math.PI
    );

    /**
     * Converts geodetic ellipsoid coordinates, in radians, to the equivalent Web Mercator
     * X, Y, Z coordinates expressed in meters and returned in a {@link Cartesian3}.  The height
     * is copied unmodified to the Z coordinate.
     *
     * @param {Cartographic} cartographic The cartographic coordinates in radians.
     * @param {Cartesian3} [result] The instance to which to copy the result, or undefined if a
     *        new instance should be created.
     * @returns {Cartesian3} The equivalent web mercator X, Y, Z coordinates, in meters.
     */
    project (cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
        const semimajorAxis = this._semimajorAxis;
        const x = cartographic.longitude * semimajorAxis;
        const y =
    WebMercatorProjection.geodeticLatitudeToMercatorAngle(cartographic.latitude) * semimajorAxis;
        const z = cartographic.height;

        if (!defined(result)) {
            return new Cartesian3(x, y, z);
        }

        (result as Cartesian3).x = x;
        (result as Cartesian3).y = y;
        (result as Cartesian3).z = z;
        return (result as Cartesian3);
    }

    /**
   * Converts Web Mercator X, Y coordinates, expressed in meters, to a {@link Cartographic}
   * containing geodetic ellipsoid coordinates.  The Z coordinate is copied unmodified to the
   * height.
   *
   * @param {Cartesian3} cartesian The web mercator Cartesian position to unrproject with height (z) in meters.
   * @param {Cartographic} [result] The instance to which to copy the result, or undefined if a
   *        new instance should be created.
   * @returns {Cartographic} The equivalent cartographic coordinates.
   */
    unproject (cartesian: Cartesian3 | Cartesian2, result?: Cartographic): Cartographic {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        // >>includeEnd('debug');

        const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        const longitude = cartesian.x * oneOverEarthSemimajorAxis;
        const latitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(
            cartesian.y * oneOverEarthSemimajorAxis
        );
        const height = (cartesian as any).z;

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        (result as Cartographic).longitude = longitude;
        (result as Cartographic).latitude = latitude;
        (result as Cartographic).height = height;
        return (result as Cartographic);
    }
}

export { WebMercatorProjection };
