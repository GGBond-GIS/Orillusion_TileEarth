/* eslint-disable no-bitwise */
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { createVerticesFromHeightmap } from './createVerticesFromHeightmap';
import { GeographicProjection } from './GeographicProjection';
import { Rectangle } from './Rectangle';
import { TerrainEncoding } from './TerrainEncoding';
import { TerrainMesh } from './TerrainMesh';
import { TerrainProvider } from './TerrainProvider';
import { when } from '../ThirdParty/when';
import { GeographicTilingScheme } from './GeographicTilingScheme';
import { BoundingSphere } from './BoundingSphere';
import { Cartesian3 } from './Cartesian3';
import { OrientedBoundingBox } from './OrientedBoundingBox';
import { HeightmapEncoding } from './HeightmapEncoding';
import HeightmapTessellator from './HeightmapTessellator';

class HeightmapTerrainData {
    _buffer: any;
    _width: any;
    _height: any;
    _childTileMask: number;
    _createdByUpsampling: boolean;
    _skirtHeight?: number
    _mesh?: any
    _structure?: any
    _encoding: HeightmapEncoding;
    _waterMask?: boolean;
    _bufferType: any;
    constructor (options:any) {
        this._buffer = options.buffer;
        this._width = options.width;
        this._height = options.height;
        this._childTileMask = defaultValue(options.childTileMask, 15);
        this._encoding = defaultValue(options.encoding, HeightmapEncoding.NONE);

        const defaultStructure = HeightmapTessellator.DEFAULT_STRUCTURE;
        let structure = options.structure;
        if (!defined(structure)) {
            structure = defaultStructure;
        } else if (structure !== defaultStructure) {
            structure.heightScale = defaultValue(
                structure.heightScale,
                defaultStructure.heightScale
            );
            structure.heightOffset = defaultValue(
                structure.heightOffset,
                defaultStructure.heightOffset
            );
            structure.elementsPerHeight = defaultValue(
                structure.elementsPerHeight,
                defaultStructure.elementsPerHeight
            );
            structure.stride = defaultValue(structure.stride, defaultStructure.stride);
            structure.elementMultiplier = defaultValue(
                structure.elementMultiplier,
                defaultStructure.elementMultiplier
            );
            structure.isBigEndian = defaultValue(
                structure.isBigEndian,
                defaultStructure.isBigEndian
            );
        }

        this._structure = structure;
        this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);
        this._waterMask = options.waterMask;

        this._skirtHeight = undefined;
        this._bufferType =
          this._encoding === HeightmapEncoding.LERC
              ? Float32Array
              : this._buffer.constructor;
        this._mesh = undefined;
    }

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @private
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @param {Number} [exaggeration=1.0] The scale used to exaggerate the terrain.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    createMesh (options: any): any {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        const tilingScheme = options.tilingScheme;
        const x = options.x;
        const y = options.y;
        const level = options.level;
        const exaggeration = defaultValue(options.exaggeration, 1.0);
        const exaggerationRelativeHeight = defaultValue(
            options.exaggerationRelativeHeight,
            0.0
        );
        const throttle = defaultValue(options.throttle, true);

        const ellipsoid = tilingScheme.ellipsoid;
        const nativeRectangle = tilingScheme.tileXYToNativeRectangle(x, y, level);
        const rectangle = tilingScheme.tileXYToRectangle(x, y, level);

        // Compute the center of the tile for RTC rendering.
        const center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        const structure = this._structure;

        const levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
            ellipsoid,
            this._width,
            tilingScheme.getNumberOfXTilesAtLevel(0)
        );
        const thisLevelMaxError = levelZeroMaxError / (1 << level);
        this._skirtHeight = Math.min(thisLevelMaxError * 4.0, 1000.0);

        // const createMeshTaskProcessor = throttle
        //     ? createMeshTaskProcessorThrottle
        //     : createMeshTaskProcessorNoThrottle;

        //   var verticesPromise = createMeshTaskProcessor.scheduleTask({
        //     heightmap: this._buffer,
        //     structure: structure,
        //     includeWebMercatorT: true,
        //     width: this._width,
        //     height: this._height,
        //     nativeRectangle: nativeRectangle,
        //     rectangle: rectangle,
        //     relativeToCenter: center,
        //     ellipsoid: ellipsoid,
        //     skirtHeight: this._skirtHeight,
        //     isGeographic: tilingScheme.projection instanceof GeographicProjection,
        //     exaggeration: exaggeration,
        //     exaggerationRelativeHeight: exaggerationRelativeHeight,
        //     encoding: this._encoding,
        //   });

        const verticesPromise = when(createVerticesFromHeightmap({
            heightmap: this._buffer,
            structure: structure,
            includeWebMercatorT: true,
            width: this._width,
            height: this._height,
            nativeRectangle: nativeRectangle,
            rectangle: rectangle,
            relativeToCenter: center,
            ellipsoid: ellipsoid,
            skirtHeight: this._skirtHeight,
            isGeographic: tilingScheme.projection instanceof GeographicProjection,
            exaggeration: exaggeration,
            exaggerationRelativeHeight: exaggerationRelativeHeight,
            encoding: this._encoding
        }, []));

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        const that = this;
        return when(verticesPromise, function (result: any) {
            let indicesAndEdges : any;
            if (that._skirtHeight as number > 0.0) {
                indicesAndEdges = TerrainProvider.getRegularGridAndSkirtIndicesAndEdgeIndices(
                    result.gridWidth,
                    result.gridHeight
                );
            } else {
                // indicesAndEdges = TerrainProvider.getRegularGridIndicesAndEdgeIndices(
                //     result.gridWidth,
                //     result.gridHeight
                // );
            }

            const vertexCountWithoutSkirts = result.gridWidth * result.gridHeight;

            // Clone complex result objects because the transfer from the web worker
            // has stripped them down to JSON-style objects.
            that._mesh = new TerrainMesh(
                center,
                new Float32Array(result.vertices),
                indicesAndEdges.indices,
                indicesAndEdges.indexCountWithoutSkirts,
                vertexCountWithoutSkirts,
                result.minimumHeight,
                result.maximumHeight,
                BoundingSphere.clone(result.boundingSphere3D) as BoundingSphere,
                Cartesian3.clone(result.occludeePointInScaledSpace),
                result.numberOfAttributes,
                OrientedBoundingBox.clone(result.orientedBoundingBox),
                TerrainEncoding.clone(result.encoding),
                indicesAndEdges.westIndicesSouthToNorth,
                indicesAndEdges.southIndicesEastToWest,
                indicesAndEdges.eastIndicesNorthToSouth,
                indicesAndEdges.northIndicesWestToEast
            );

            // Free memory received from server after mesh is created.
            that._buffer = undefined;
            return that._mesh;
        });
    }

    /**
 * @param {Object} options Object with the following properties:
 * @param {TilingScheme} options.tilingScheme The tiling scheme to which this tile belongs.
 * @param {Number} options.x The X coordinate of the tile for which to create the terrain data.
 * @param {Number} options.y The Y coordinate of the tile for which to create the terrain data.
 * @param {Number} options.level The level of the tile for which to create the terrain data.
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 *
 * @private
 */
    _createMeshSync (options?: any) {
        const tilingScheme = options.tilingScheme;
        const x = options.x;
        const y = options.y;
        const level = options.level;
        const exaggeration = defaultValue(options.exaggeration, 1.0);
        const exaggerationRelativeHeight = defaultValue(
            options.exaggerationRelativeHeight,
            0.0
        );

        const ellipsoid = tilingScheme.ellipsoid;
        const nativeRectangle = tilingScheme.tileXYToNativeRectangle(x, y, level);
        const rectangle = tilingScheme.tileXYToRectangle(x, y, level);

        // Compute the center of the tile for RTC rendering.
        const center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        const structure = this._structure;

        const levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
            ellipsoid,
            this._width,
            tilingScheme.getNumberOfXTilesAtLevel(0)
        );
        const thisLevelMaxError = levelZeroMaxError / (1 << level);
        this._skirtHeight = Math.min(thisLevelMaxError * 4.0, 1000.0);

        const result = HeightmapTessellator.computeVertices({
            heightmap: this._buffer,
            structure: structure,
            includeWebMercatorT: true,
            width: this._width,
            height: this._height,
            nativeRectangle: nativeRectangle,
            rectangle: rectangle,
            relativeToCenter: center,
            ellipsoid: ellipsoid,
            skirtHeight: this._skirtHeight,
            isGeographic: tilingScheme.projection instanceof GeographicProjection,
            exaggeration: exaggeration,
            exaggerationRelativeHeight: exaggerationRelativeHeight
        });

        // Free memory received from server after mesh is created.
        this._buffer = undefined;

        let indicesAndEdges;
        if (this._skirtHeight > 0.0) {
            indicesAndEdges = TerrainProvider.getRegularGridAndSkirtIndicesAndEdgeIndices(
                this._width,
                this._height
            );
        } else {
            indicesAndEdges = TerrainProvider.getRegularGridIndicesAndEdgeIndices(
                this._width,
                this._height
            );
        }

        const vertexCountWithoutSkirts = result.gridWidth * result.gridHeight;

        // No need to clone here (as we do in the async version) because the result
        // is not coming from a web worker.
        this._mesh = new TerrainMesh(
            center,
            result.vertices,
            indicesAndEdges.indices,
            indicesAndEdges.indexCountWithoutSkirts,
            vertexCountWithoutSkirts,
            result.minimumHeight,
            result.maximumHeight,
            result.boundingSphere3D,
            result.occludeePointInScaledSpace,
            result.encoding.stride,
            result.orientedBoundingBox,
            result.encoding,
            indicesAndEdges.westIndicesSouthToNorth,
            indicesAndEdges.southIndicesEastToWest,
            indicesAndEdges.eastIndicesNorthToSouth,
            indicesAndEdges.northIndicesWestToEast
        );

        return this._mesh;
    }

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    wasCreatedByUpsampling (): boolean {
        return this._createdByUpsampling;
    }

    /**
     * Determines if a given child tile is available, based on the
     * {@link HeightmapTerrainData.childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    isChildAvailable (thisX: number, thisY: number, childX: number, childY: number): boolean {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(thisX)) {
            throw new DeveloperError('thisX is required.');
        }
        if (!defined(thisY)) {
            throw new DeveloperError('thisY is required.');
        }
        if (!defined(childX)) {
            throw new DeveloperError('childX is required.');
        }
        if (!defined(childY)) {
            throw new DeveloperError('childY is required.');
        }
        // >>includeEnd('debug');

        let bitNumber = 2; // northwest child
        if (childX !== thisX * 2) {
            ++bitNumber; // east child
        }
        if (childY !== thisY * 2) {
            bitNumber -= 2; // south child
        }

        return (this._childTileMask & 1 << bitNumber) !== 0;
    }
}

export { HeightmapTerrainData };
