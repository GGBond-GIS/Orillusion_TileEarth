import { CesiumMath } from './CesiumMath';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Ellipsoid } from './Ellipsoid';
import { IndexDatatype } from './IndexDatatype';

const regularGridIndicesCache: any[] = [];
const regularGridAndEdgeIndicesCache: any[] = [];
const regularGridAndSkirtAndEdgeIndicesCache: never[][] = [];

function getEdgeIndices (width: number, height: number) {
    const westIndicesSouthToNorth = new Array(height);
    const southIndicesEastToWest = new Array(width);
    const eastIndicesNorthToSouth = new Array(height);
    const northIndicesWestToEast = new Array(width);

    let i;
    for (i = 0; i < width; ++i) {
        northIndicesWestToEast[i] = i;
        southIndicesEastToWest[i] = width * height - 1 - i;
    }

    for (i = 0; i < height; ++i) {
        eastIndicesNorthToSouth[i] = (i + 1) * width - 1;
        westIndicesSouthToNorth[i] = (height - i - 1) * width;
    }

    return {
        westIndicesSouthToNorth: westIndicesSouthToNorth,
        southIndicesEastToWest: southIndicesEastToWest,
        eastIndicesNorthToSouth: eastIndicesNorthToSouth,
        northIndicesWestToEast: northIndicesWestToEast
    };
}

function addRegularGridIndices (width: number, height: number, indices: Uint16Array | Uint32Array, offset: number) {
    let index = 0;
    for (let j = 0; j < height - 1; ++j) {
        for (let i = 0; i < width - 1; ++i) {
            const upperLeft = index;
            const lowerLeft = upperLeft + width;
            const lowerRight = lowerLeft + 1;
            const upperRight = upperLeft + 1;

            indices[offset++] = upperLeft;
            indices[offset++] = lowerLeft;
            indices[offset++] = upperRight;
            indices[offset++] = upperRight;
            indices[offset++] = lowerLeft;
            indices[offset++] = lowerRight;

            ++index;
        }
        ++index;
    }
}

function addSkirtIndices (edgeIndices:number[], vertexIndex: number, indices:number[], offset: number) {
    let previousIndex = edgeIndices[0];

    const length = edgeIndices.length;
    for (let i = 1; i < length; ++i) {
        const index = edgeIndices[i];

        indices[offset++] = previousIndex;
        indices[offset++] = index;
        indices[offset++] = vertexIndex;

        indices[offset++] = vertexIndex;
        indices[offset++] = index;
        indices[offset++] = vertexIndex + 1;

        previousIndex = index;
        ++vertexIndex;
    }

    return offset;
}

/**
 * Provides terrain or other geometry for the surface of an ellipsoid.  The surface geometry is
 * organized into a pyramid of tiles according to a {@link TilingScheme}.  This type describes an
 * interface and is not intended to be instantiated directly.
 *
 * @alias TerrainProvider
 * @constructor
 *
 * @see EllipsoidTerrainProvider
 * @see CesiumTerrainProvider
 * @see VRTheWorldTerrainProvider
 * @see GoogleEarthEnterpriseTerrainProvider
 */
class TerrainProvider {
    constructor () {
        DeveloperError.throwInstantiationError();
    }

    get errorEvent (): void {
        return DeveloperError.throwInstantiationError();
    }

    get credit (): void {
        return DeveloperError.throwInstantiationError();
    }

    get tilingScheme (): void {
        return DeveloperError.throwInstantiationError();
    }

    get ready (): void {
        return DeveloperError.throwInstantiationError();
    }

    get readyPromise (): void {
        return DeveloperError.throwInstantiationError();
    }

    get hasWaterMask (): void {
        return DeveloperError.throwInstantiationError();
    }

    get hasVertexNormals (): void {
        return DeveloperError.throwInstantiationError();
    }

    get availability (): void {
        return DeveloperError.throwInstantiationError();
    }

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#ready} returns true.  The result must include terrain data and
     * may optionally include a water mask and an indication of which child tiles are available.
     * @function
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
    requestTileGeometry =DeveloperError.throwInstantiationError;

    /**
    * Gets the maximum geometric error allowed in a tile at a given level.  This function should not be
    * called before {@link TerrainProvider#ready} returns true.
    * @function
    *
    * @param {Number} level The tile level for which to get the maximum geometric error.
    * @returns {Number} The maximum geometric error.
    */
    getLevelMaximumGeometricError =DeveloperError.throwInstantiationError;

    /**
    * Determines whether data for a tile is available to be loaded.
    * @function
    *
    * @param {Number} x The X coordinate of the tile for which to request geometry.
    * @param {Number} y The Y coordinate of the tile for which to request geometry.
    * @param {Number} level The level of the tile for which to request geometry.
    * @returns {Boolean|undefined} Undefined if not supported by the terrain provider, otherwise true or false.
    */
    getTileDataAvailable = DeveloperError.throwInstantiationError;

    /**
    * Makes sure we load availability data for a tile
    * @function
    *
    * @param {Number} x The X coordinate of the tile for which to request geometry.
    * @param {Number} y The Y coordinate of the tile for which to request geometry.
    * @param {Number} level The level of the tile for which to request geometry.
    * @returns {undefined|Promise<void>} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
    */
    loadTileDataAvailability =DeveloperError.throwInstantiationError;

    /**
     * Specifies the quality of terrain created from heightmaps.  A value of 1.0 will
     * ensure that adjacent heightmap vertices are separated by no more than
     * {@link Globe.maximumScreenSpaceError} screen pixels and will probably go very slowly.
     * A value of 0.5 will cut the estimated level zero geometric error in half, allowing twice the
     * screen pixels between adjacent heightmap vertices and thus rendering more quickly.
     * @type {Number}
     */
    static heightmapTerrainQuality = 0.25;

    /**
     * Determines an appropriate geometric error estimate when the geometry comes from a heightmap.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to which the terrain is attached.
     * @param {Number} tileImageWidth The width, in pixels, of the heightmap associated with a single tile.
     * @param {Number} numberOfTilesAtLevelZero The number of tiles in the horizontal direction at tile level zero.
     * @returns {Number} An estimated geometric error.
     */
    static getEstimatedLevelZeroGeometricErrorForAHeightmap (
        ellipsoid: Ellipsoid,
        tileImageWidth: number,
        numberOfTilesAtLevelZero: number
    ):number {
        return (
            (ellipsoid.maximumRadius *
                2 *
                Math.PI *
                TerrainProvider.heightmapTerrainQuality) /
            (tileImageWidth * numberOfTilesAtLevelZero)
        );
    }

    /**
     * Gets a list of indices for a triangle mesh representing a regular grid.  Calling
     * this function multiple times with the same grid width and height returns the
     * same list of indices.  The total number of vertices must be less than or equal
     * to 65536.
     *
     * @param {Number} width The number of vertices in the regular grid in the horizontal direction.
     * @param {Number} height The number of vertices in the regular grid in the vertical direction.
     * @returns {Uint16Array|Uint32Array} The list of indices. Uint16Array gets returned for 64KB or less and Uint32Array for 4GB or less.
     */
    static getRegularGridIndices (width: number, height: number): any {
    // >>includeStart('debug', pragmas.debug);
        if (width * height >= CesiumMath.FOUR_GIGABYTES) {
            throw new DeveloperError(
                'The total number of vertices (width * height) must be less than 4,294,967,296.'
            );
        }
        // >>includeEnd('debug');

        let byWidth = regularGridIndicesCache[width];
        if (!defined(byWidth)) {
            regularGridIndicesCache[width] = byWidth = [];
        }

        let indices = byWidth[height];
        if (!defined(indices)) {
            if (width * height < CesiumMath.SIXTY_FOUR_KILOBYTES) {
                indices = byWidth[height] = new Uint16Array(
                    (width - 1) * (height - 1) * 6
                );
            } else {
                indices = byWidth[height] = new Uint32Array(
                    (width - 1) * (height - 1) * 6
                );
            }
            addRegularGridIndices(width, height, indices, 0);
        }

        return indices;
    }

    /**
 * @private
 */
    static getRegularGridAndSkirtIndicesAndEdgeIndices (width: number, height: number): any {
    // >>includeStart('debug', pragmas.debug);
        if (width * height >= CesiumMath.FOUR_GIGABYTES) {
            throw new DeveloperError(
                'The total number of vertices (width * height) must be less than 4,294,967,296.'
            );
        }
        // >>includeEnd('debug');

        let byWidth = regularGridAndSkirtAndEdgeIndicesCache[width] as any;
        if (!defined(byWidth)) {
            regularGridAndSkirtAndEdgeIndicesCache[width] = byWidth = [];
        }

        let indicesAndEdges:any = byWidth[height];
        if (!defined(indicesAndEdges)) {
            const gridVertexCount = width * height;
            const gridIndexCount: number = (width - 1) * (height - 1) * 6;
            const edgeVertexCount = width * 2 + height * 2;
            const edgeIndexCount = Math.max(0, edgeVertexCount - 4) * 6;
            const vertexCount = gridVertexCount + edgeVertexCount;
            const indexCount = gridIndexCount + edgeIndexCount;

            const edgeIndices = getEdgeIndices(width, height);
            const westIndicesSouthToNorth = edgeIndices.westIndicesSouthToNorth;
            const southIndicesEastToWest = edgeIndices.southIndicesEastToWest;
            const eastIndicesNorthToSouth = edgeIndices.eastIndicesNorthToSouth;
            const northIndicesWestToEast = edgeIndices.northIndicesWestToEast;

            const indices = IndexDatatype.createTypedArray(vertexCount, indexCount);
            addRegularGridIndices(width, height, indices, 0);
            TerrainProvider.addSkirtIndices(
                westIndicesSouthToNorth,
                southIndicesEastToWest,
                eastIndicesNorthToSouth,
                northIndicesWestToEast,
                gridVertexCount,
                indices,
                gridIndexCount
            );

            indicesAndEdges = byWidth[height] = {
                indices: indices,
                westIndicesSouthToNorth: westIndicesSouthToNorth,
                southIndicesEastToWest: southIndicesEastToWest,
                eastIndicesNorthToSouth: eastIndicesNorthToSouth,
                northIndicesWestToEast: northIndicesWestToEast,
                indexCountWithoutSkirts: gridIndexCount
            };
        }

        return indicesAndEdges;
    }

    /**
 * @private
 */
    static addSkirtIndices (
        westIndicesSouthToNorth: number[],
        southIndicesEastToWest: number[],
        eastIndicesNorthToSouth: number[],
        northIndicesWestToEast: number[],
        vertexCount: number,
        indices:any,
        offset: number
    ): void {
        let vertexIndex = vertexCount;
        offset = addSkirtIndices(
            westIndicesSouthToNorth,
            vertexIndex,
            indices,
            offset
        );
        vertexIndex += westIndicesSouthToNorth.length;
        offset = addSkirtIndices(
            southIndicesEastToWest,
            vertexIndex,
            indices,
            offset
        );
        vertexIndex += southIndicesEastToWest.length;
        offset = addSkirtIndices(
            eastIndicesNorthToSouth,
            vertexIndex,
            indices,
            offset
        );
        vertexIndex += eastIndicesNorthToSouth.length;
        addSkirtIndices(northIndicesWestToEast, vertexIndex, indices, offset);
    }

    /**
     * @private
     */
    static getRegularGridIndicesAndEdgeIndices (width: number, height: number): any {
    // >>includeStart('debug', pragmas.debug);
        if (width * height >= CesiumMath.FOUR_GIGABYTES) {
            throw new DeveloperError(
                'The total number of vertices (width * height) must be less than 4,294,967,296.'
            );
        }
        // >>includeEnd('debug');

        let byWidth = regularGridAndEdgeIndicesCache[width];
        if (!defined(byWidth)) {
            regularGridAndEdgeIndicesCache[width] = byWidth = [];
        }

        let indicesAndEdges = byWidth[height];
        if (!defined(indicesAndEdges)) {
            const indices = TerrainProvider.getRegularGridIndices(width, height);

            const edgeIndices = getEdgeIndices(width, height);
            const westIndicesSouthToNorth = edgeIndices.westIndicesSouthToNorth;
            const southIndicesEastToWest = edgeIndices.southIndicesEastToWest;
            const eastIndicesNorthToSouth = edgeIndices.eastIndicesNorthToSouth;
            const northIndicesWestToEast = edgeIndices.northIndicesWestToEast;

            indicesAndEdges = byWidth[height] = {
                indices: indices,
                westIndicesSouthToNorth: westIndicesSouthToNorth,
                southIndicesEastToWest: southIndicesEastToWest,
                eastIndicesNorthToSouth: eastIndicesNorthToSouth,
                northIndicesWestToEast: northIndicesWestToEast
            };
        }

        return indicesAndEdges;
    }
}
export { TerrainProvider };
