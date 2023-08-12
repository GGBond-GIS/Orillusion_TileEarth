import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Ellipsoid } from './Ellipsoid';

class GeographicProjection {
    _ellipsoid: Ellipsoid;
    _semimajorAxis: number;
    _oneOverSemimajorAxis: number;
    constructor (ellipsoid ?: Ellipsoid) {
        this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84) as Ellipsoid;
        this._semimajorAxis = this._ellipsoid.maximumRadius as number;
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
    }

    get ellipsoid (): Ellipsoid {
        return this._ellipsoid;
    }

    /**
     * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters.
     * X and Y are the longitude and latitude, respectively, multiplied by the maximum radius of the
     * ellipsoid.  Z is the unmodified height.
     *
     * @param {Cartographic} cartographic The coordinates to project.
     * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
     *        undefined, a new instance is created and returned.
     * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
     *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
     *          created and returned.
     */
    project (cartographic:Cartographic, result?:Cartesian3):Cartesian3 {
        // Actually this is the special case of equidistant cylindrical called the plate carree
        const semimajorAxis = this._semimajorAxis;
        const x = cartographic.longitude * semimajorAxis;
        const y = cartographic.latitude * semimajorAxis;
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
     * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
     * coordinates, in radians.  Longitude and Latitude are the X and Y coordinates, respectively,
     * divided by the maximum radius of the ellipsoid.  Height is the unmodified Z coordinate.
     *
     * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
     * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
     *        undefined, a new instance is created and returned.
     * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
     *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
     *          created and returned.
     */
    unproject (cartesian:Cartesian3, result?:Cartographic):Cartographic {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        // >>includeEnd('debug');

        const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        const longitude = cartesian.x * oneOverEarthSemimajorAxis;
        const latitude = cartesian.y * oneOverEarthSemimajorAxis;
        const height = cartesian.z;

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        (result as Cartographic).longitude = longitude;
        (result as Cartographic).latitude = latitude;
        (result as Cartographic).height = height;
        return (result as Cartographic);
    }
}
export { GeographicProjection };
