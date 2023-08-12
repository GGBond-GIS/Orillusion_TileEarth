import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Ellipsoid } from './Ellipsoid';
import { Event } from './Event';
import { GeographicTilingScheme } from './GeographicTilingScheme';

import { when } from '../ThirdParty/when';
import { TerrainProvider } from './TerrainProvider';
import { Request } from './Request';
import { HeightmapTerrainData } from './HeightmapTerrainData';

interface EllipsoidTerrainProviderInterFace {
    tilingScheme?: GeographicTilingScheme | undefined;
    ellipsoid: Ellipsoid;
}

/**
 * A very simple {@link TerrainProvider} that produces geometry by tessellating an ellipsoidal
 * surface.
 *
 * @alias EllipsoidTerrainProvider
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {TilingScheme} [options.tilingScheme] The tiling scheme specifying how the ellipsoidal
 * surface is broken into tiles.  If this parameter is not provided, a {@link GeographicTilingScheme}
 * is used.
 * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 * this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 * parameter is specified, the WGS84 ellipsoid is used.
 *
 * @see TerrainProvider
 */
class EllipsoidTerrainProvider {
    _tilingScheme: GeographicTilingScheme;
    _levelZeroMaximumGeometricError: number;
    _errorEvent: Event;
    _readyPromise: any
    constructor (options?: any) {
        (options as any) = defaultValue(options, defaultValue.EMPTY_OBJECT) as any;

        this._tilingScheme = (options.tilingScheme as GeographicTilingScheme | any);
        if (!defined(this._tilingScheme)) {
            this._tilingScheme = new GeographicTilingScheme({
                ellipsoid: defaultValue(options.ellipsoid, Ellipsoid.WGS84)
            });
        }

        // Note: the 64 below does NOT need to match the actual vertex dimensions, because
        // the ellipsoid is significantly smoother than actual terrain.
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
            this._tilingScheme.ellipsoid,
            64,
            this._tilingScheme.getNumberOfXTilesAtLevel(0)
        );

        this._errorEvent = new Event();
        this._readyPromise = when.resolve(true);
    }

    get errorEvent (): Event {
        return this._errorEvent;
    }

    get credit (): undefined {
        return undefined;
    }

    get tilingScheme (): GeographicTilingScheme {
        return this._tilingScheme;
    }

    get ready (): boolean {
        return true;
    }

    get readyPromise ():any {
        return this._readyPromise;
    }

    get hasWaterMask (): boolean {
        return false;
    }

    get hasVertexNormals (): boolean {
        return false;
    }

    get availability (): undefined {
        return undefined;
    }

    /**
 * Requests the geometry for a given tile.  This function should not be called before
 * {@link TerrainProvider#ready} returns true.  The result includes terrain
 * data and indicates that all child tiles are available.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 *
 * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 */
    requestTileGeometry (x: number, y: number, level: number, request: Request): any {
        const width = 16;
        const height = 16;
        return when.resolve(
            new HeightmapTerrainData({
                buffer: new Uint8Array(width * height),
                width: width,
                height: height
            })
        );
    }

    /**
   * Gets the maximum geometric error allowed in a tile at a given level.
   *
   * @param {Number} level The tile level for which to get the maximum geometric error.
   * @returns {Number} The maximum geometric error.
   */
    getLevelMaximumGeometricError (level: number): number {
        return this._levelZeroMaximumGeometricError / (1 << level);
    }

    /**
   * Determines whether data for a tile is available to be loaded.
   *
   * @param {Number} x The X coordinate of the tile for which to request geometry.
   * @param {Number} y The Y coordinate of the tile for which to request geometry.
   * @param {Number} level The level of the tile for which to request geometry.
   * @returns {Boolean|undefined} Undefined if not supported, otherwise true or false.
   */
    getTileDataAvailable (x: number, y: number, level: number): undefined {
        return undefined;
    }

    /**
   * Makes sure we load availability data for a tile
   *
   * @param {Number} x The X coordinate of the tile for which to request geometry.
   * @param {Number} y The Y coordinate of the tile for which to request geometry.
   * @param {Number} level The level of the tile for which to request geometry.
   * @returns {undefined|Promise<void>} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
   */
    loadTileDataAvailability (x: number, y: number, level: number): undefined {
        return undefined;
    }
}

export { EllipsoidTerrainProvider };
