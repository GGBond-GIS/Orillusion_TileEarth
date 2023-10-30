import { Cartesian2 } from '../../Math/Cartesian2';
import { Cartographic } from '../../Math/Cartographic';
import { defaultValue } from '../../Util/defaultValue';
import { defined } from '../../Util/defined';
import { Ellipsoid } from '../../Math/Ellipsoid/Ellipsoid';
import { Rectangle } from '../../Math/Rectangle';
import { WebMercatorProjection } from './WebMercatorProjection';

/**
 * A tiling scheme for geometry referenced to a {@link WebMercatorProjection}, EPSG:3857.  This is
 * the tiling scheme used by Google Maps, Microsoft Bing Maps, and most of ESRI ArcGIS Online.
 *
 * @alias WebMercatorTilingScheme
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
 * the WGS84 ellipsoid.
 * @param {Number} [options.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
 *        the tile tree.
 * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
 *        the tile tree.
 * @param {Cartesian2} [options.rectangleSouthwestInMeters] The southwest corner of the rectangle covered by the
 *        tiling scheme, in meters.  If this parameter or rectangleNortheastInMeters is not specified, the entire
 *        globe is covered in the longitude direction and an equal distance is covered in the latitude
 *        direction, resulting in a square projection.
 * @param {Cartesian2} [options.rectangleNortheastInMeters] The northeast corner of the rectangle covered by the
 *        tiling scheme, in meters.  If this parameter or rectangleSouthwestInMeters is not specified, the entire
 *        globe is covered in the longitude direction and an equal distance is covered in the latitude
 *        direction, resulting in a square projection.
 */
class WebMercatorTilingScheme {
    _ellipsoid: Ellipsoid;
    _projection: WebMercatorProjection;
    _numberOfLevelZeroTilesX: number;
    _numberOfLevelZeroTilesY: number;
    _rectangleSouthwestInMeters: Cartesian2;
    _rectangleNortheastInMeters: Cartesian2;
    _rectangle: Rectangle;
    constructor (options: {
        ellipsoid?: Ellipsoid;
        numberOfLevelZeroTilesX?: number;
        numberOfLevelZeroTilesY?: number;
        rectangleSouthwestInMeters?: Cartesian2;
        rectangleNortheastInMeters?: Cartesian2;
    }) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as any;
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84) as Ellipsoid;

        this._numberOfLevelZeroTilesX = defaultValue(options.numberOfLevelZeroTilesX, 1) as number;

        this._numberOfLevelZeroTilesY = defaultValue(options.numberOfLevelZeroTilesY, 1) as number;

        this._projection = new WebMercatorProjection(this._ellipsoid);

        if (
            defined(options.rectangleSouthwestInMeters) &&
            defined(options.rectangleNortheastInMeters)
        ) {
            this._rectangleSouthwestInMeters = options.rectangleSouthwestInMeters as Cartesian2;
            this._rectangleNortheastInMeters = options.rectangleNortheastInMeters as Cartesian2;
        } else {
            const semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
            this._rectangleSouthwestInMeters = new Cartesian2(
                -semimajorAxisTimesPi,
                -semimajorAxisTimesPi
            );
            this._rectangleNortheastInMeters = new Cartesian2(
                semimajorAxisTimesPi,
                semimajorAxisTimesPi
            );
        }

        const southwest = this._projection.unproject(this._rectangleSouthwestInMeters);
        const northeast = this._projection.unproject(this._rectangleNortheastInMeters);
        this._rectangle = new Rectangle(
            southwest.longitude,
            southwest.latitude,
            northeast.longitude,
            northeast.latitude
        );
    }

    get ellipsoid (): Ellipsoid {
        return this._ellipsoid;
    }

    get rectangle (): Rectangle {
        return this._rectangle;
    }

    get projection (): WebMercatorProjection {
        return this._projection;
    }

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    getNumberOfXTilesAtLevel (level: number): number {
        return this._numberOfLevelZeroTilesX << level;
    }

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    getNumberOfYTilesAtLevel (level: number): number {
        return this._numberOfLevelZeroTilesY << level;
    }

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    positionToTileXY (position:Cartographic, level: number, result?:Cartesian2):Cartesian2 | undefined {
        const rectangle = this._rectangle;
        if (!Rectangle.contains(rectangle, position)) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        const xTiles = this.getNumberOfXTilesAtLevel(level);
        const yTiles = this.getNumberOfYTilesAtLevel(level);

        const overallWidth =
        this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x;
        const xTileWidth = overallWidth / xTiles;
        const overallHeight = this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y;
        const yTileHeight = overallHeight / yTiles;

        const projection = this._projection;

        const webMercatorPosition = projection.project(position);
        const distanceFromWest = webMercatorPosition.x - this._rectangleSouthwestInMeters.x;
        const distanceFromNorth = this._rectangleNortheastInMeters.y - webMercatorPosition.y;

        let xTileCoordinate = (distanceFromWest / xTileWidth) | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }
        let yTileCoordinate = (distanceFromNorth / yTileHeight) | 0;
        if (yTileCoordinate >= yTiles) {
            yTileCoordinate = yTiles - 1;
        }

        if (!defined(result)) {
            return new Cartesian2(xTileCoordinate, yTileCoordinate);
        }

        (result as Cartesian2).x = xTileCoordinate;
        (result as Cartesian2).y = yTileCoordinate;
        return result;
    }

    /**
     * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
     * of the tiling scheme.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    tileXYToNativeRectangle (
        x: number,
        y: number,
        level: number,
        result?: Rectangle
    ): Rectangle {
        const xTiles = this.getNumberOfXTilesAtLevel(level);
        const yTiles = this.getNumberOfYTilesAtLevel(level);

        const xTileWidth =
      (this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x) /
      xTiles;
        const west = this._rectangleSouthwestInMeters.x + x * xTileWidth;
        const east = this._rectangleSouthwestInMeters.x + (x + 1) * xTileWidth;

        const yTileHeight =
      (this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y) /
      yTiles;
        const north = this._rectangleNortheastInMeters.y - y * yTileHeight;
        const south = this._rectangleNortheastInMeters.y - (y + 1) * yTileHeight;

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }

        (result as Rectangle).west = west;
        (result as Rectangle).south = south;
        (result as Rectangle).east = east;
        (result as Rectangle).north = north;
        return (result as Rectangle);
    }

    /**
     * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    tileXYToRectangle (
        x: number,
        y: number,
        level: number,
        result?:Rectangle
    ):Rectangle {
        const nativeRectangle = this.tileXYToNativeRectangle(x, y, level, result);

        const projection = this._projection;
        const southwest = projection.unproject(
            new Cartesian2(nativeRectangle.west, nativeRectangle.south)
        );
        const northeast = projection.unproject(
            new Cartesian2(nativeRectangle.east, nativeRectangle.north)
        );

        nativeRectangle.west = southwest.longitude;
        nativeRectangle.south = southwest.latitude;
        nativeRectangle.east = northeast.longitude;
        nativeRectangle.north = northeast.latitude;
        return nativeRectangle;
    }

    /**
     * Transforms a rectangle specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @param {Rectangle} rectangle The rectangle to transform.
     * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
     *          is undefined.
     */
    rectangleToNativeRectangle (
        rectangle: Rectangle,
        result?: Rectangle
    ): Rectangle {
        const projection = this._projection;
        const southwest = projection.project(Rectangle.southwest(rectangle));
        const northeast = projection.project(Rectangle.northeast(rectangle));

        if (!defined(result)) {
            return new Rectangle(southwest.x, southwest.y, northeast.x, northeast.y);
        }

        (result as Rectangle).west = southwest.x;
        (result as Rectangle).south = southwest.y;
        (result as Rectangle).east = northeast.x;
        (result as Rectangle).north = northeast.y;
        return (result as Rectangle);
    }
}
export { WebMercatorTilingScheme };
