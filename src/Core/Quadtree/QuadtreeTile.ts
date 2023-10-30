import { defined } from '../../Util/defined';
import { DeveloperError } from '../../Util/DeveloperError';
import { GeographicTilingScheme } from '../../ori_map/Core/GeographicTilingScheme';
import { Rectangle } from '../../Math/Rectangle';
import { FrameState } from '../Renderer/FrameState';
import { GlobeSurfaceTile } from '../Globe/GlobeSurfaceTile';
import { QuadtreeTileLoadState } from './QuadtreeTileLoadState';
import TileSelectionResult, { TileSelectionResultEnum } from '../Tile/TileSelectionResult';

/**
 * A single tile in a {@link QuadtreePrimitive}.
 *
 * @alias QuadtreeTile
 * @constructor
 * @private
 *
 * @param {Number} options.level The level of the tile in the quadtree.
 * @param {Number} options.x The X coordinate of the tile in the quadtree.  0 is the westernmost tile.
 * @param {Number} options.y The Y coordinate of the tile in the quadtree.  0 is the northernmost tile.
 * @param {TilingScheme} options.tilingScheme The tiling scheme in which this tile exists.
 * @param {QuadtreeTile} [options.parent] This tile's parent, or undefined if this is a root tile.
 */
class QuadtreeTile {
    state: QuadtreeTileLoadState;
    _x: number;
    _y: number;
    _level: number;
    _rectangle: Rectangle
    _tilingScheme: GeographicTilingScheme;
    _parent?: any;
    _southwestChild?: QuadtreeTile;
    _southeastChild?: QuadtreeTile;
    _northwestChild?: QuadtreeTile;
    _northeastChild?: QuadtreeTile;

    _distance: number;
    _loadPriority: number;
    _lastSelectionResult: TileSelectionResultEnum;

    replacementNext: any;
    replacementPrevious: any;
    renderable: boolean;
    upsampledFromParent: boolean;

    _customData: any[];
    _frameUpdated: any;
    _lastSelectionResultFrame: any;
    _loadedCallbacks: any;
    data?: GlobeSurfaceTile;
    constructor (options: {
        level: number,
        x: number,
        y: number,
        tilingScheme: GeographicTilingScheme,
        parent?:any
    }) {
        this._tilingScheme = options.tilingScheme;
        this._x = options.x;
        this._y = options.y;
        this._level = options.level;
        this._parent = options.parent;
        this._rectangle = this._tilingScheme.tileXYToRectangle(
            this._x,
            this._y,
            this._level
        );

        this._southwestChild = undefined;
        this._southeastChild = undefined;
        this._northwestChild = undefined;
        this._northeastChild = undefined;

        // TileReplacementQueue gets/sets these private properties.
        this.replacementPrevious = undefined;
        this.replacementNext = undefined;

        // The distance from the camera to this tile, updated when the tile is selected
        // for rendering.  We can get rid of this if we have a better way to sort by
        // distance - for example, by using the natural ordering of a quadtree.
        // QuadtreePrimitive gets/sets this private property.
        this._distance = 0.0;
        this._loadPriority = 0.0;

        this._customData = [];
        this._frameUpdated = undefined;
        this._lastSelectionResult = TileSelectionResult.NONE;
        this._lastSelectionResultFrame = undefined;
        this._loadedCallbacks = {};

        /**
         * Gets or sets the current state of the tile in the tile load pipeline.
         * @type {QuadtreeTileLoadState}
         * @default {@link QuadtreeTileLoadState.START}
         */
        this.state = QuadtreeTileLoadState.START;

        /**
         * Gets or sets a value indicating whether or not the tile is currently renderable.
         * @type {Boolean}
         * @default false
         */
        this.renderable = false;

        /**
         * Gets or set a value indicating whether or not the tile was entirely upsampled from its
         * parent tile.  If all four children of a parent tile were upsampled from the parent,
         * we will render the parent instead of the children even if the LOD indicates that
         * the children would be preferable.
         * @type {Boolean}
         * @default false
         */
        this.upsampledFromParent = false;

        /**
         * Gets or sets the additional data associated with this tile.  The exact content is specific to the
         * {@link QuadtreeTileProvider}.
         * @type {Object}
         * @default undefined
         */
        this.data = undefined;
    }

    get tilingScheme (): GeographicTilingScheme {
        return this._tilingScheme;
    }

    get x (): number {
        return this._x;
    }

    get y (): number {
        return this._y;
    }

    get level (): number {
        return this._level;
    }

    get parent (): QuadtreeTile {
        return this._parent;
    }

    get rectangle (): Rectangle {
        return this._rectangle;
    }

    get children (): QuadtreeTile[] {
        return [
            this.northwestChild,
            this.northeastChild,
            this.southwestChild,
            this.southeastChild
        ];
    }

    get southwestChild () : QuadtreeTile {
        if (!defined(this._southwestChild)) {
            this._southwestChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2,
                y: this.y * 2 + 1,
                level: this.level + 1,
                parent: this
            });
        }
        return this._southwestChild as QuadtreeTile;
    }

    get southeastChild () : QuadtreeTile {
        if (!defined(this._southeastChild)) {
            this._southeastChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2 + 1,
                y: this.y * 2 + 1,
                level: this.level + 1,
                parent: this
            });
        }
        return this._southeastChild as QuadtreeTile;
    }

    get northwestChild () : QuadtreeTile {
        if (!defined(this._northwestChild)) {
            this._northwestChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2,
                y: this.y * 2,
                level: this.level + 1,
                parent: this
            });
        }
        return this._northwestChild as QuadtreeTile;
    }

    get northeastChild () : QuadtreeTile {
        if (!defined(this._northeastChild)) {
            this._northeastChild = new QuadtreeTile({
                tilingScheme: this.tilingScheme,
                x: this.x * 2 + 1,
                y: this.y * 2,
                level: this.level + 1,
                parent: this
            });
        }
        return this._northeastChild as QuadtreeTile;
    }

    get customData (): any[] {
        return this._customData;
    }

    get needsLoading (): boolean {
        return this.state < QuadtreeTileLoadState.DONE;
    }

    get eligibleForUnloading (): boolean {
        let result = true;

        if (defined(this.data)) {
            result = (this.data as GlobeSurfaceTile).eligibleForUnloading;
            if (!defined(result)) {
                result = true;
            }
        }

        return result;
    }

    /**
     * Creates a rectangular set of tiles for level of detail zero, the coarsest, least detailed level.
     *
     * @memberof QuadtreeTile
     *
     * @param {TilingScheme} tilingScheme The tiling scheme for which the tiles are to be created.
     * @returns {QuadtreeTile[]} An array containing the tiles at level of detail zero, starting with the
     * tile in the northwest corner and followed by the tile (if any) to its east.
     */
    static createLevelZeroTiles (tilingScheme:GeographicTilingScheme): QuadtreeTile[] {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        // >>includeEnd('debug');

        const numberOfLevelZeroTilesX = tilingScheme.getNumberOfXTilesAtLevel(0);
        const numberOfLevelZeroTilesY = tilingScheme.getNumberOfYTilesAtLevel(0);

        const result = new Array(numberOfLevelZeroTilesX * numberOfLevelZeroTilesY);

        let index = 0;
        for (let y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (let x = 0; x < numberOfLevelZeroTilesX; ++x) {
                result[index++] = new QuadtreeTile({
                    tilingScheme: tilingScheme,
                    x: x,
                    y: y,
                    level: 0
                });
            }
        }

        return result;
    }

    _updateCustomData (
        frameNumber: number,
        added?: any,
        removed?: any
    ): void {
        let customData = this.customData;

        let i;
        let data;
        let rectangle;

        if (defined(added) && defined(removed)) {
            customData = customData.filter(function (value) {
                return removed.indexOf(value) === -1;
            });
            this._customData = customData;

            rectangle = this._rectangle;
            for (i = 0; i < added.length; ++i) {
                data = added[i];
                if (Rectangle.contains(rectangle, data.positionCartographic)) {
                    customData.push(data);
                }
            }

            this._frameUpdated = frameNumber;
        } else {
            // interior or leaf tile, update from parent
            const parent = this._parent;
            if (defined(parent) && this._frameUpdated !== parent._frameUpdated) {
                customData.length = 0;

                rectangle = this._rectangle;
                const parentCustomData = parent.customData;
                for (i = 0; i < parentCustomData.length; ++i) {
                    data = parentCustomData[i];
                    if (Rectangle.contains(rectangle, data.positionCartographic)) {
                        customData.push(data);
                    }
                }

                this._frameUpdated = parent._frameUpdated;
            }
        }
    }

    /**
 * Frees the resources associated with this tile and returns it to the <code>START</code>
 * {@link QuadtreeTileLoadState}.  If the {@link QuadtreeTile#data} property is defined and it
 * has a <code>freeResources</code> method, the method will be invoked.
 *
 * @memberof QuadtreeTile
 */
    freeResources (): void {
        this.state = QuadtreeTileLoadState.START;
        this.renderable = false;
        this.upsampledFromParent = false;

        if (defined(this.data) && defined((this.data as GlobeSurfaceTile).freeResources)) {
            (this.data as GlobeSurfaceTile).freeResources();
        }

        freeTile(this._southwestChild);
        this._southwestChild = undefined;
        freeTile(this._southeastChild);
        this._southeastChild = undefined;
        freeTile(this._northwestChild);
        this._northwestChild = undefined;
        freeTile(this._northeastChild);
        this._northeastChild = undefined;
    }
}

function freeTile (tile: any) {
    if (defined(tile)) {
        tile.freeResources();
    }
}

export { QuadtreeTile };
