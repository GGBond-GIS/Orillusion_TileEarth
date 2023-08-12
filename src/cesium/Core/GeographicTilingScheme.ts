import { Cartesian2 } from './Cartesian2';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Ellipsoid } from './Ellipsoid';
import { GeographicProjection } from './GeographicProjection';
import { Rectangle } from './Rectangle';

interface GeographicTilingSchemeInterface {
    ellipsoid?: Ellipsoid,
    rectangle?: Rectangle,
    numberOfLevelZeroTilesX?: number,
    numberOfLevelZeroTilesY?: number
}

/**
 * A tiling scheme for geometry referenced to a simple {@link GeographicProjection} where
 * longitude and latitude are directly mapped to X and Y.  This projection is commonly
 * known as geographic, equirectangular, equidistant cylindrical, or plate carrée.
 *
 * @alias GeographicTilingScheme
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
 * the WGS84 ellipsoid.
 * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the tiling scheme.
 * @param {Number} [options.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
 * the tile tree.
 * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
 * the tile tree.
 */
class GeographicTilingScheme {
    _ellipsoid: Ellipsoid;
    _rectangle: Rectangle;
    _projection: GeographicProjection;
    _numberOfLevelZeroTilesX: number;
    _numberOfLevelZeroTilesY: number;
    constructor (options?:GeographicTilingSchemeInterface) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as GeographicTilingSchemeInterface;

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84) as Ellipsoid;
        this._rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE) as Rectangle;
        this._projection = new GeographicProjection(this._ellipsoid);
        this._numberOfLevelZeroTilesX = defaultValue(
            options.numberOfLevelZeroTilesX,
            2
        ) as number;
        this._numberOfLevelZeroTilesY = defaultValue(
            options.numberOfLevelZeroTilesY,
            1
        ) as number;
    }

    get ellipsoid ():Ellipsoid {
        return this._ellipsoid;
    }

    get rectangle ():Rectangle {
        return this._rectangle;
    }

    get projection ():GeographicProjection {
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
   * Transforms a rectangle specified in geodetic radians to the native coordinate system
   * of this tiling scheme.
   *
   * @param {Rectangle} rectangle The rectangle to transform.
   * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
   *          is undefined.
   */
    rectangleToNativeRectangle (rectangle:Rectangle, result?:Rectangle):Rectangle {
        const west = CesiumMath.toDegrees(rectangle.west);
        const south = CesiumMath.toDegrees(rectangle.south);
        const east = CesiumMath.toDegrees(rectangle.east);
        const north = CesiumMath.toDegrees(rectangle.north);

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
    ):Rectangle {
        const rectangleRadians = this.tileXYToRectangle(x, y, level, result);
        rectangleRadians.west = CesiumMath.toDegrees(rectangleRadians.west);
        rectangleRadians.south = CesiumMath.toDegrees(rectangleRadians.south);
        rectangleRadians.east = CesiumMath.toDegrees(rectangleRadians.east);
        rectangleRadians.north = CesiumMath.toDegrees(rectangleRadians.north);
        return rectangleRadians;
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
        result?: Rectangle
    ):Rectangle {
        const rectangle = this._rectangle;

        const xTiles = this.getNumberOfXTilesAtLevel(level);
        const yTiles = this.getNumberOfYTilesAtLevel(level);

        const xTileWidth = rectangle.width / xTiles;
        const west = x * xTileWidth + rectangle.west;
        const east = (x + 1) * xTileWidth + rectangle.west;

        const yTileHeight = rectangle.height / yTiles;
        const north = rectangle.north - y * yTileHeight;
        const south = rectangle.north - (y + 1) * yTileHeight;

        if (!defined(result)) {
            result = new Rectangle(west, south, east, north);
        }

        (result as Rectangle).west = west;
        (result as Rectangle).south = south;
        (result as Rectangle).east = east;
        (result as Rectangle).north = north;
        return (result as Rectangle);
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
    positionToTileXY (
        position:Cartographic,
        level: number,
        result?:Cartesian2
    ):Cartesian2 | undefined {
        const rectangle = this._rectangle;
        if (!Rectangle.contains(rectangle, position)) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        const xTiles = this.getNumberOfXTilesAtLevel(level);
        const yTiles = this.getNumberOfYTilesAtLevel(level);

        const xTileWidth = rectangle.width / xTiles;
        const yTileHeight = rectangle.height / yTiles;

        let longitude = position.longitude;
        if (rectangle.east < rectangle.west) {
            longitude += CesiumMath.TWO_PI;
        }

        let xTileCoordinate = ((longitude - rectangle.west) / xTileWidth) | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }

        let yTileCoordinate =
        ((rectangle.north - position.latitude) / yTileHeight) | 0;
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
}

export { GeographicTilingScheme };
