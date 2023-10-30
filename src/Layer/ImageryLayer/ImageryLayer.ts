import { Cartesian4 } from '../../Math/Cartesian4';
import { CesiumMath } from '../../Math/CesiumMath';
import { defaultValue } from '../../Util/defaultValue';
import { defined } from '../../Util/defined';
import { destroyObject } from '../../Util/destroyObject';
import { EllipsoidTerrainProvider } from '../../Math/Ellipsoid/EllipsoidTerrainProvider';
import { GeographicProjection } from '../../Core/Projection/GeographicProjection';
import { Rectangle } from '../../Math/Rectangle';
import { RequestState } from '../../Core/Request/RequestState';
import { TerrainProvider } from '../../Core/Terrain/TerrainProvider';
import { TileProviderError } from '../../Core/Tile/TileProviderError';
import { GeographicReprojectMaterial } from '../../Material/GeographicReprojectMaterial';
import { BufferAttribute, CanvasTexture, StaticDrawUsage } from 'three';
import { Context } from '../../Core/Renderer/Context';
import { FrameState } from '../../Core/Renderer/FrameState';
import { Imagery } from './Imagery';
import { ImageryState } from './ImageryState';
import { TileImagery } from './TileImagery';
import { when } from '../../Core/ThirdParty/when';
import { RequestType } from '../../Core/Request/RequestType';
import { ImagerySplitDirection } from './ImagerySplitDirection';
import { ComputeCommand } from '../../Core/Renderer/ComputeCommand';
import { Request } from '../../Core/Request/Request';
import { WebMercatorTilingScheme } from './WebMercatorTilingScheme';
import { WebMapTileServiceImageryProvider } from './WebMapTileServiceImageryProvider';
import { ContextLimits } from '../../Core/Renderer/ContextLimits';
import { WebMercatorProjection } from './WebMercatorProjection';
import { CesiumColor } from '../../Math/CesiumColor';
import { Engine3D, GPUAddressMode, Texture, Vector4 } from '@orillusion/core';

const imageryBoundsScratch = new Rectangle();
const tileImageryBoundsScratch = new Rectangle();
const clippedRectangleScratch = new Rectangle();
const terrainRectangleScratch = new Rectangle();

const getImageryCacheKey = function getImageryCacheKey(x: number, y: number, level: number) {
    return JSON.stringify([
        x,
        y,
        level
    ]);
};

/**
     * Gets the level with the specified world coordinate spacing between texels, or less.
     *
     * @param {ImageryLayer} layer The imagery layer to use.
     * @param {Number} texelSpacing The texel spacing for which to find a corresponding level.
     * @param {Number} latitudeClosestToEquator The latitude closest to the equator that we're concerned with.
     * @returns {Number} The level with the specified texel spacing or less.
     */
const getLevelWithMaximumTexelSpacing = (layer: ImageryLayer, texelSpacing: number, latitudeClosestToEquator: number): number => {
    // PERFORMANCE_IDEA: factor out the stuff that doesn't change.
    const imageryProvider = layer._imageryProvider;
    const tilingScheme = imageryProvider.tilingScheme;
    const ellipsoid = tilingScheme.ellipsoid;
    const latitudeFactor = !(layer._imageryProvider.tilingScheme.projection instanceof GeographicProjection)
        ? Math.cos(latitudeClosestToEquator)
        : 1.0;
    const tilingSchemeRectangle = tilingScheme.rectangle;
    const levelZeroMaximumTexelSpacing = ellipsoid.maximumRadius * tilingSchemeRectangle.width * latitudeFactor / (imageryProvider.tileWidth * tilingScheme.getNumberOfXTilesAtLevel(0));

    const twoToTheLevelPower = levelZeroMaximumTexelSpacing / texelSpacing;
    const level = Math.log(twoToTheLevelPower) / Math.log(2);
    const rounded = Math.round(level);
    return rounded | 0;
};

const finalizeReprojectTexture = (imageryLayer: ImageryLayer, context: Context, imagery: Imagery, texture?: Texture) => {
    imagery.state = ImageryState.READY;
};

const float32ArrayScratch = new Float32Array(2 * 64);

const reprojectToGeographic = (command: any, context: Context, texture: any, rectangle: Rectangle) => {
    // This function has gone through a number of iterations, because GPUs are awesome.

    // Originally, we had a very simple vertex shader and computed the Web Mercator texture coordinates
    // per-fragment in the fragment shader.  That worked well, except on mobile devices, because
    // fragment shaders have limited precision on many mobile devices.  The result was smearing artifacts
    // at medium zoom levels because different geographic texture coordinates would be reprojected to Web
    // Mercator as the same value.

    // Our solution was to reproject to Web Mercator in the vertex shader instead of the fragment shader.
    // This required far more vertex data.  With fragment shader reprojection, we only needed a single quad.
    // But to achieve the same precision with vertex shader reprojection, we needed a vertex for each
    // output pixel.  So we used a grid of 256x256 vertices, because most of our imagery
    // tiles are 256x256.  Fortunately the grid could be created and uploaded to the GPU just once and
    // re-used for all reprojections, so the performance was virtually unchanged from our original fragment
    // shader approach.  See https://github.com/AnalyticalGraphicsInc/cesium/pull/714.

    // Over a year later, we noticed (https://github.com/AnalyticalGraphicsInc/cesium/issues/2110)
    // that our reprojection code was creating a rare but severe artifact on some GPUs (Intel HD 4600
    // for one).  The problem was that the GLSL sin function on these GPUs had a discontinuity at fine scales in
    // a few places.

    // We solved this by implementing a more reliable sin function based on the CORDIC algorithm
    // (https://github.com/AnalyticalGraphicsInc/cesium/pull/2111).  Even though this was a fair
    // amount of code to be executing per vertex, the performance seemed to be pretty good on most GPUs.
    // Unfortunately, on some GPUs, the performance was absolutely terrible
    // (https://github.com/AnalyticalGraphicsInc/cesium/issues/2258).

    // So that brings us to our current solution, the one you see here.  Effectively, we compute the Web
    // Mercator texture coordinates on the CPU and store the T coordinate with each vertex (the S coordinate
    // is the same in Geographic and Web Mercator).  To make this faster, we reduced our reprojection mesh
    // to be only 2 vertices wide and 64 vertices high.  We should have reduced the width to 2 sooner,
    // because the extra vertices weren't buying us anything.  The height of 64 means we are technically
    // doing a slightly less accurate reprojection than we were before, but we can't see the difference
    // so it's worth the 4x speedup.

    let reproject = context.cache.imageryLayer_reproject;

    if (!defined(reproject)) {
        reproject = context.cache.imageryLayer_reproject = {
            vertexAttribute: undefined,
            material: undefined,
            geometry: undefined,
            destroy: function () {
                if (defined(this.framebuffer)) {
                    this.framebuffer.destroy();
                }
                if (defined(this.vertexArray)) {
                    this.vertexArray.destroy();
                }
                if (defined(this.shaderProgram)) {
                    this.shaderProgram.destroy();
                }
            }
        };

        const positions = new Float32Array(2 * 64 * 2);
        let index = 0;
        for (let j = 0; j < 64; ++j) {
            const y = j / 63.0;
            positions[index++] = 0.0;
            positions[index++] = y;
            positions[index++] = 1.0;
            positions[index++] = y;
        }

        const indices = TerrainProvider.getRegularGridIndices(2, 64);

        const indexBuffer = new BufferAttribute(indices, 1);
        indexBuffer.usage = StaticDrawUsage;

        reproject.material = new GeographicReprojectMaterial();
        reproject.geometry = command.geometry;
        reproject.geometry.setAttribute('position', new BufferAttribute(positions, 2));
        reproject.geometry.setAttribute('webMercatorT', new BufferAttribute(new Float32Array(64 * 2), 1));
        reproject.geometry.setIndex(indexBuffer);
    }

    texture.sampler = reproject.sampler;
    const material = reproject.material;
    const geometry = reproject.geometry;

    const width = texture.image.width;
    const height = texture.image.height;

    material.textureDimensions.x = width;
    material.textureDimensions.y = height;
    material.texture = texture;

    let sinLatitude = Math.sin(rectangle.south);
    const southMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));

    sinLatitude = Math.sin(rectangle.north);
    const northMercatorY = 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));
    const oneOverMercatorHeight = 1.0 / (northMercatorY - southMercatorY);

    const outputTexture = new Texture(undefined);
    // outputTexture.isRenderTargetTexture = true;
    // outputTexture.image = {
    //     width: width,
    //     height: height,
    //     depth: 1
    // };

    // Allocate memory for the mipmaps.  Failure to do this before rendering
    // to the texture via the FBO, and calling generateMipmap later,
    // will result in the texture appearing blank.  I can't pretend to
    // understand exactly why this is.
    // if (CesiumMath.isPowerOfTwo(width) && CesiumMath.isPowerOfTwo(height)) {
    //     outputTexture.generateMipmap(4354);
    // }

    const south = rectangle.south;
    const north = rectangle.north;

    const webMercatorT = float32ArrayScratch;

    let outputIndex = 0;
    for (let webMercatorTIndex = 0; webMercatorTIndex < 64; ++webMercatorTIndex) {
        const fraction = webMercatorTIndex / 63.0;
        const latitude = CesiumMath.lerp(south, north, fraction);
        sinLatitude = Math.sin(latitude);
        const mercatorY = 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
        const mercatorFraction = (mercatorY - southMercatorY) * oneOverMercatorHeight;
        webMercatorT[outputIndex++] = mercatorFraction;
        webMercatorT[outputIndex++] = mercatorFraction;
    }

    // reproject.vertexArray.getAttribute(1).vertexBuffer.copyFromArrayView(webMercatorT);

    geometry.attributes.webMercatorT.array = webMercatorT;
    geometry.attributes.webMercatorT.needsUpdate = true;

    // command.shaderProgram = reproject.shaderProgram;
    command.outputTexture = outputTexture;
    command.geometry = geometry;
    command.material = material;
};

class ImageryLayer {
    alpha: number;
    nightAlpha: number;
    dayAlpha: number;
    brightness: number;
    contrast: number;
    hue: number;
    saturation: number;
    gamma: number;
    splitDirection: ImagerySplitDirection;
    _imageryProvider: any;
    _minimumTerrainLevel: number | undefined;
    _maximumTerrainLevel: number | undefined;
    _rectangle: Rectangle;
    _imageryCache: any;
    show: boolean;
    _show: true;
    _layerIndex: number;
    _isBaseLayer: boolean;
    _requestImageError: any;
    _reprojectComputeCommands: any[];
    _skeletonPlaceholder: TileImagery;
    cutoutRectangle?: Rectangle;
    colorToAlpha?: CesiumColor;
    colorToAlphaThreshold: number;
    constructor(imageryProvider: any, options: {
        minimumTerrainLevel?: number,
        maximumTerrainLevel?: number,
        rectangle?: Rectangle,
        show?: boolean,
        alpha?: number,
        nightAlpha?: number,
        dayAlpha?: number,
        brightness?: number,
        contrast?: number,
        hue?: number,
        saturation?: number,
        gamma?: number,
        splitDirection?: ImagerySplitDirection,
        cutoutRectangle?: Rectangle,
        colorToAlpha?: CesiumColor,
        colorToAlphaThreshold?: number
    }) {
        /**
         * The alpha blending value of this layer, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number}
         * @default 1.0
         */
        this.alpha = defaultValue(
            options.alpha,
            defaultValue(imageryProvider.defaultAlpha, 1.0)
        );

        /**
         * The alpha blending value of this layer on the night side of the globe, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque. This only takes effect when {@link Globe#enableLighting} is <code>true</code>.
         *
         * @type {Number}
         * @default 1.0
         */
        this.nightAlpha = defaultValue(
            options.nightAlpha,
            defaultValue(imageryProvider.defaultNightAlpha, 1.0)
        );

        /**
         * The alpha blending value of this layer on the day side of the globe, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque. This only takes effect when {@link Globe#enableLighting} is <code>true</code>.
         *
         * @type {Number}
         * @default 1.0
         */
        this.dayAlpha = defaultValue(
            options.dayAlpha,
            defaultValue(imageryProvider.defaultDayAlpha, 1.0)
        );

        /**
         * The brightness of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_BRIGHTNESS}
         */
        this.brightness = defaultValue(
            options.brightness,
            defaultValue(
                imageryProvider.defaultBrightness,
                ImageryLayer.DEFAULT_BRIGHTNESS
            )
        );

        /**
         * The contrast of this layer.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_CONTRAST}
         */
        this.contrast = defaultValue(
            options.contrast,
            defaultValue(imageryProvider.defaultContrast, ImageryLayer.DEFAULT_CONTRAST)
        );

        /**
         * The hue of this layer in radians. 0.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_HUE}
        */
        this.hue = defaultValue(
            options.hue,
            defaultValue(imageryProvider.defaultHue, ImageryLayer.DEFAULT_HUE)
        );

        /**
         * The saturation of this layer. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_SATURATION}
         */
        this.saturation = defaultValue(
            options.saturation,
            defaultValue(
                imageryProvider.defaultSaturation,
                ImageryLayer.DEFAULT_SATURATION
            )
        );

        /**
         * The gamma correction to apply to this layer.  1.0 uses the unmodified imagery color.
         *
         * @type {Number}
         * @default {@link ImageryLayer.DEFAULT_GAMMA}
         */
        this.gamma = defaultValue(
            options.gamma,
            defaultValue(imageryProvider.defaultGamma, ImageryLayer.DEFAULT_GAMMA)
        );

        /**
         * The {@link ImagerySplitDirection} to apply to this layer.
         *
         * @type {ImagerySplitDirection}
         * @default {@link ImageryLayer.DEFAULT_SPLIT}
         */
        this.splitDirection = defaultValue(
            options.splitDirection,
            defaultValue(imageryProvider.defaultSplit, ImageryLayer.DEFAULT_SPLIT)
        );

        this._imageryProvider = imageryProvider;

        this._minimumTerrainLevel = options.minimumTerrainLevel;
        this._maximumTerrainLevel = options.maximumTerrainLevel;

        this._rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE) as Rectangle;
        // this._maximumAnisotropy = options.maximumAnisotropy;

        this._imageryCache = {};

        this._skeletonPlaceholder = new TileImagery(Imagery.createPlaceholder(this));

        this.show = defaultValue(options.show, true) as boolean;

        // The value of the show property on the last update.
        this._show = true;

        // The index of this layer in the ImageryLayerCollection.
        this._layerIndex = -1;

        // true if this is the base (lowest shown) layer.
        this._isBaseLayer = false;

        this._requestImageError = undefined;

        this._reprojectComputeCommands = [];

        /**
         * Rectangle cutout in this layer of imagery.
         *
         * @type {Rectangle}
         */
        this.cutoutRectangle = options.cutoutRectangle;

        /**
         * Color value that should be set to transparent.
         *
         * @type {Color}
         */
        this.colorToAlpha = options.colorToAlpha;

        /**
         * Normalized (0-1) threshold for color-to-alpha.
         *
         * @type {Number}
         */
        this.colorToAlphaThreshold = defaultValue(
            options.colorToAlphaThreshold,
            ImageryLayer.DEFAULT_APPLY_COLOR_TO_ALPHA_THRESHOLD
        ) as number;
    }

    get imageryProvider(): WebMapTileServiceImageryProvider {
        return this._imageryProvider;
    }

    get rectangle(): Rectangle {
        return this._rectangle;
    }

    /**
     * This value is used as the default brightness for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the brightness of the imagery.
     * @type {Number}
     * @default 1.0
     */
    static DEFAULT_BRIGHTNESS = 1.0;

    /**
     * This value is used as the default contrast for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the contrast of the imagery.
     * @type {Number}
     * @default 1.0
     */
    static DEFAULT_CONTRAST = 1.0;

    /**
     * This value is used as the default hue for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the hue of the imagery.
     * @type {Number}
     * @default 0.0
     */
    static DEFAULT_HUE = 0.0;

    /**
     * This value is used as the default saturation for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the saturation of the imagery.
     * @type {Number}
     * @default 1.0
     */
    static DEFAULT_SATURATION = 1.0;

    /**
     * This value is used as the default gamma for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the gamma of the imagery.
     * @type {Number}
     * @default 1.0
     */
    static DEFAULT_GAMMA = 1.0;

    /**
     * This value is used as the default split for the imagery layer if one is not provided during construction
     * or by the imagery provider.
     * @type {ImagerySplitDirection}
     * @default ImagerySplitDirection.NONE
     */
    static DEFAULT_SPLIT = ImagerySplitDirection.NONE;

    /**
     * This value is used as the default threshold for color-to-alpha if one is not provided
     * during construction or by the imagery provider.
     * @type {Number}
     * @default 0.004
     */
    static DEFAULT_APPLY_COLOR_TO_ALPHA_THRESHOLD = 0.004;

    /**
    * Updates frame state to execute any queued texture re-projections.
    *
    * @private
    *
    * @param {FrameState} frameState The frameState.
    */
    queueReprojectionCommands(frameState: FrameState): void {
        const computeCommands = this._reprojectComputeCommands;
        const length = computeCommands.length;
        for (let i = 0; i < length; ++i) {
            frameState.computeCommandList.push(computeCommands[i]);
        }
        computeCommands.length = 0;
    }

    /**
    * Gets a value indicating whether this layer is the base layer in the
    * {@link ImageryLayerCollection}.  The base layer is the one that underlies all
    * others.  It is special in that it is treated as if it has global rectangle, even if
    * it actually does not, by stretching the texels at the edges over the entire
    * globe.
    *
    * @returns {Boolean} true if this is the base layer; otherwise, false.
    */
    isBaseLayer(): boolean {
        return this._isBaseLayer;
    }

    /**
    * Create skeletons for the imagery tiles that partially or completely overlap a given terrain
    * tile.
    *
    * @private
    *
    * @param {Tile} tile The terrain tile.
    * @param {TerrainProvider} terrainProvider The terrain provider associated with the terrain tile.
    * @param {Number} insertionPoint The position to insert new skeletons before in the tile's imagery list.
    * @returns {Boolean} true if this layer overlaps any portion of the terrain tile; otherwise, false.
    */
    _createTileImagerySkeletons(tile: any, terrainProvider: EllipsoidTerrainProvider, insertionPoint?: number): boolean {
        const surfaceTile = tile.data;

        if (defined(this._minimumTerrainLevel) && tile.level < (this._minimumTerrainLevel as number)) {
            return false;
        }
        if (defined(this._maximumTerrainLevel) && tile.level > (this._maximumTerrainLevel as number)) {
            return false;
        }

        const imageryProvider = this._imageryProvider;

        if (!defined(insertionPoint)) {
            insertionPoint = surfaceTile.imagery.length as number;
        }

        if (!imageryProvider.ready) {
            // The imagery provider is not ready, so we can't create skeletons, yet.
            // Instead, add a placeholder so that we'll know to create
            // the skeletons once the provider is ready.
            (this._skeletonPlaceholder.loadingImagery as Imagery).addReference();
            surfaceTile.imagery.splice(insertionPoint, 0, this._skeletonPlaceholder);
            return true;
        }

        // Use Web Mercator for our texture coordinate computations if this imagery layer uses
        // that projection and the terrain tile falls entirely inside the valid bounds of the
        // projection.
        // var useWebMercatorT = imageryProvider.tilingScheme.projection instanceof WebMercatorProjection &&
        //                           tile.rectangle.north < WebMercatorProjection.MaximumLatitude &&
        //                           tile.rectangle.south > -WebMercatorProjection.MaximumLatitude;

        // 重投影
        // const useWebMercatorT = false;
        const useWebMercatorT =
            imageryProvider.tilingScheme.projection instanceof WebMercatorProjection &&
            tile.rectangle.north < WebMercatorProjection.MaximumLatitude &&
            tile.rectangle.south > -WebMercatorProjection.MaximumLatitude;

        // Compute the rectangle of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the rectangle.  The imagery TilingScheme's rectangle
        // always fully contains the ImageryProvider's rectangle.
        const imageryBounds = Rectangle.intersection(imageryProvider.rectangle, this._rectangle, imageryBoundsScratch) as Rectangle;
        let rectangle = Rectangle.intersection(tile.rectangle, imageryBounds, tileImageryBoundsScratch);

        if (!defined(rectangle)) {
            // There is no overlap between this terrain tile and this imagery
            // provider.  Unless this is the base layer, no skeletons need to be created.
            // We stretch texels at the edge of the base layer over the entire globe.
            if (!this.isBaseLayer()) {
                return false;
            }

            const baseImageryRectangle = imageryBounds;
            const baseTerrainRectangle = tile.rectangle;
            rectangle = tileImageryBoundsScratch;

            if (baseTerrainRectangle.south >= baseImageryRectangle.north) {
                rectangle.north = rectangle.south = baseImageryRectangle.north;
            } else if (baseTerrainRectangle.north <= baseImageryRectangle.south) {
                rectangle.north = rectangle.south = baseImageryRectangle.south;
            } else {
                rectangle.south = Math.max(baseTerrainRectangle.south, baseImageryRectangle.south);
                rectangle.north = Math.min(baseTerrainRectangle.north, baseImageryRectangle.north);
            }

            if (baseTerrainRectangle.west >= baseImageryRectangle.east) {
                rectangle.west = rectangle.east = baseImageryRectangle.east;
            } else if (baseTerrainRectangle.east <= baseImageryRectangle.west) {
                rectangle.west = rectangle.east = baseImageryRectangle.west;
            } else {
                rectangle.west = Math.max(baseTerrainRectangle.west, baseImageryRectangle.west);
                rectangle.east = Math.min(baseTerrainRectangle.east, baseImageryRectangle.east);
            }
        }

        let latitudeClosestToEquator = 0.0;
        if ((rectangle as Rectangle).south > 0.0) {
            latitudeClosestToEquator = (rectangle as Rectangle).south;
        } else if ((rectangle as Rectangle).north < 0.0) {
            latitudeClosestToEquator = (rectangle as Rectangle).north;
        }

        // Compute the required level in the imagery tiling scheme.
        // The errorRatio should really be imagerySSE / terrainSSE rather than this hard-coded value.
        // But first we need configurable imagery SSE and we need the rendering to be able to handle more
        // images attached to a terrain tile than there are available texture units.  So that's for the future.
        const errorRatio = 1.0;
        const targetGeometricError = errorRatio * (terrainProvider as EllipsoidTerrainProvider).getLevelMaximumGeometricError(tile.level);
        let imageryLevel = getLevelWithMaximumTexelSpacing(this, targetGeometricError, latitudeClosestToEquator);
        imageryLevel = Math.max(0, imageryLevel);
        const maximumLevel = imageryProvider.maximumLevel;
        if (imageryLevel > maximumLevel) {
            imageryLevel = maximumLevel;
        }

        if (defined(imageryProvider.minimumLevel)) {
            const minimumLevel = imageryProvider.minimumLevel;
            if (imageryLevel < minimumLevel) {
                imageryLevel = minimumLevel;
            }
        }

        const imageryTilingScheme = imageryProvider.tilingScheme;
        const northwestTileCoordinates = imageryTilingScheme.positionToTileXY(Rectangle.northwest((rectangle as Rectangle)), imageryLevel);
        const southeastTileCoordinates = imageryTilingScheme.positionToTileXY(Rectangle.southeast((rectangle as Rectangle)), imageryLevel);

        // If the southeast corner of the rectangle lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the rectangle lies very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.

        // We define "very close" as being within 1/512 of the width of the tile.
        let veryCloseX = tile.rectangle.width / 512.0;
        let veryCloseY = tile.rectangle.height / 512.0;

        const northwestTileRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileRectangle.south - tile.rectangle.north) < veryCloseY && northwestTileCoordinates.y < southeastTileCoordinates.y) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileRectangle.east - tile.rectangle.west) < veryCloseX && northwestTileCoordinates.x < southeastTileCoordinates.x) {
            ++northwestTileCoordinates.x;
        }

        const southeastTileRectangle = imageryTilingScheme.tileXYToRectangle(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileRectangle.north - tile.rectangle.south) < veryCloseY && southeastTileCoordinates.y > northwestTileCoordinates.y) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileRectangle.west - tile.rectangle.east) < veryCloseX && southeastTileCoordinates.x > northwestTileCoordinates.x) {
            --southeastTileCoordinates.x;
        }

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the imagery tile's tiling scheme.

        const terrainRectangle = Rectangle.clone(tile.rectangle, terrainRectangleScratch) as Rectangle;
        let imageryRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        let clippedImageryRectangle = Rectangle.intersection(imageryRectangle, imageryBounds, clippedRectangleScratch) as Rectangle;

        let imageryTileXYToRectangle;
        if (useWebMercatorT) {
            imageryTilingScheme.rectangleToNativeRectangle(terrainRectangle, terrainRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(imageryRectangle, imageryRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(clippedImageryRectangle, clippedImageryRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(imageryBounds, imageryBounds);
            imageryTileXYToRectangle = imageryTilingScheme.tileXYToNativeRectangle.bind(imageryTilingScheme);
            veryCloseX = terrainRectangle.width / 512.0;
            veryCloseY = terrainRectangle.height / 512.0;
        } else {
            imageryTileXYToRectangle = imageryTilingScheme.tileXYToRectangle.bind(imageryTilingScheme);
        }

        let minU;
        let maxU = 0.0;

        let minV = 1.0;
        let maxV;

        // If this is the northern-most or western-most tile in the imagery tiling scheme,
        // it may not start at the northern or western edge of the terrain tile.
        // Calculate where it does start.
        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.west - terrainRectangle.west) >= veryCloseX) {
            maxU = Math.min(1.0, (clippedImageryRectangle.west - terrainRectangle.west) / terrainRectangle.width);
        }

        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.north - terrainRectangle.north) >= veryCloseY) {
            minV = Math.max(0.0, (clippedImageryRectangle.north - terrainRectangle.south) / terrainRectangle.height);
        }

        const initialMinV = minV;

        for (let i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            minU = maxU;

            imageryRectangle = imageryTileXYToRectangle(i, northwestTileCoordinates.y, imageryLevel);
            clippedImageryRectangle = Rectangle.simpleIntersection(imageryRectangle, imageryBounds, clippedRectangleScratch) as Rectangle;

            if (!defined(clippedImageryRectangle)) {
                continue;
            }

            maxU = Math.min(1.0, (clippedImageryRectangle.east - terrainRectangle.west) / terrainRectangle.width);

            // If this is the eastern-most imagery tile mapped to this terrain tile,
            // and there are more imagery tiles to the east of this one, the maxU
            // should be 1.0 to make sure rounding errors don't make the last
            // image fall shy of the edge of the terrain tile.
            if (i === southeastTileCoordinates.x && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.east - terrainRectangle.east) < veryCloseX)) {
                maxU = 1.0;
            }

            minV = initialMinV;

            for (let j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                maxV = minV;

                imageryRectangle = imageryTileXYToRectangle(i, j, imageryLevel);
                clippedImageryRectangle = Rectangle.simpleIntersection(imageryRectangle, imageryBounds, clippedRectangleScratch) as Rectangle;

                if (!defined(clippedImageryRectangle)) {
                    continue;
                }

                minV = Math.max(0.0, (clippedImageryRectangle.south - terrainRectangle.south) / terrainRectangle.height);

                // If this is the southern-most imagery tile mapped to this terrain tile,
                // and there are more imagery tiles to the south of this one, the minV
                // should be 0.0 to make sure rounding errors don't make the last
                // image fall shy of the edge of the terrain tile.
                if (j === southeastTileCoordinates.y && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.south - terrainRectangle.south) < veryCloseY)) {
                    minV = 0.0;
                }

                const texCoordsRectangle = new Cartesian4(minU, minV, maxU, maxV);
                const imagery = this.getImageryFromCache(i, j, imageryLevel);
                surfaceTile.imagery.splice(insertionPoint, 0, new TileImagery(imagery, texCoordsRectangle, useWebMercatorT));
                ++(insertionPoint as number);
            }
        }

        return true;
    }

    getImageryFromCache(x: number, y: number, level: number, imageryRectangle?: Rectangle): Imagery {
        const cacheKey = getImageryCacheKey(x, y, level);
        let imagery = this._imageryCache[cacheKey];

        if (!defined(imagery)) {
            imagery = new Imagery(this, x, y, level, imageryRectangle);
            this._imageryCache[cacheKey] = imagery;
        }

        imagery.addReference();
        return imagery;
    }

    /**
    * Request a particular piece of imagery from the imagery provider.  This method handles raising an
    * error event if the request fails, and retrying the request if necessary.
    *
    * @private
    *
    * @param {Imagery} imagery The imagery to request.
    * @param {Function} [priorityFunction] The priority function used for sorting the imagery request.
    */
    _requestImagery(imagery: any): void {
        const imageryProvider = this._imageryProvider;

        const that = this;

        function failure(e?: any) {
            if (imagery.request.state === RequestState.CANCELLED) {
                // Cancelled due to low priority - try again later.
                imagery.state = ImageryState.UNLOADED;
                imagery.request = undefined;
                return;
            }

            // Initially assume failure.  handleError may retry, in which case the state will
            // change to TRANSITIONING.
            imagery.state = ImageryState.FAILED;
            imagery.request = undefined;

            const message =
                'Failed to obtain image tile X: ' +
                imagery.x +
                ' Y: ' +
                imagery.y +
                ' Level: ' +
                imagery.level +
                '.';
            that._requestImageError = TileProviderError.handleError(
                that._requestImageError,
                imageryProvider,
                imageryProvider.errorEvent,
                message,
                imagery.x,
                imagery.y,
                imagery.level,
                doRequest,
                e
            );
        }

        function success(image: any) {
            if (!defined(image)) {
                return failure();
            }

            const texture = new CanvasTexture(image);
            texture.anisotropy = ContextLimits.maxAnisotropy;
            imagery.image = texture;
            imagery.state = ImageryState.RECEIVED;
            imagery.request = undefined;

            TileProviderError.handleSuccess(that._requestImageError);
        }

        function doRequest() {
            const request = new Request({
                throttle: false,
                throttleByServer: true,
                type: RequestType.IMAGERY
            });
            imagery.request = request;
            imagery.state = ImageryState.TRANSITIONING;
            const imagePromise = imageryProvider.requestImage(
                imagery.x,
                imagery.y,
                imagery.level,
                request
            );
            imagery.imageUrl = request.url;

            if (!defined(imagePromise)) {
                // Too many parallel requests, so postpone loading tile.
                imagery.state = ImageryState.UNLOADED;
                imagery.request = undefined;
                return;
            }

            if (defined(imageryProvider.getTileCredits)) {
                imagery.credits = imageryProvider.getTileCredits(
                    imagery.x,
                    imagery.y,
                    imagery.level
                );
            }

            when(imagePromise, success, failure);
        }

        doRequest();
    }

    /**
    * Create a WebGL texture for a given {@link Imagery} instance.
    *
    * @private
    *
    * @param {Context} context The rendered context to use to create textures.
    * @param {Imagery} imagery The imagery for which to create a texture.
    */
    _createTexture(context: Context, imagery: any): any {
        const imageryProvider = this._imageryProvider;
        const image = imagery.image;

        // If this imagery provider has a discard policy, use it to check if this
        // image should be discarded.
        if (defined(imageryProvider.tileDiscardPolicy)) {
            const discardPolicy = imageryProvider.tileDiscardPolicy;
            if (defined(discardPolicy)) {
                // If the discard policy is not ready yet, transition back to the
                // RECEIVED state and we'll try again next time.
                if (!discardPolicy.isReady()) {
                    imagery.state = ImageryState.RECEIVED;
                    return;
                }

                // Mark discarded imagery tiles invalid.  Parent imagery will be used instead.
                if (discardPolicy.shouldDiscardImage(image)) {
                    imagery.state = ImageryState.INVALID;
                    return;
                }
            }
        }

        // //>>includeStart('debug', pragmas.debug);
        // if (this.minificationFilter !== TextureMinificationFilter.NEAREST &&
        //     this.minificationFilter !== TextureMinificationFilter.LINEAR) {
        //     throw new DeveloperError('ImageryLayer minification filter must be NEAREST or LINEAR');
        // }
        // //>>includeEnd('debug');

        // var sampler = new Sampler({
        //     minificationFilter : this.minificationFilter,
        //     magnificationFilter : this.magnificationFilter
        // });

        // // Imagery does not need to be discarded, so upload it to WebGL.
        // var texture;
        // if (defined(image.internalFormat)) {
        //     texture = new Texture({
        //         context : context,
        //         pixelFormat : image.internalFormat,
        //         width : image.width,
        //         height : image.height,
        //         source : {
        //             arrayBufferView : image.bufferView
        //         },
        //         sampler : sampler
        //     });
        // } else {
        //     texture = new Texture({
        //         context : context,
        //         source : image,
        //         pixelFormat : imageryProvider.hasAlphaChannel ? PixelFormat.RGBA : PixelFormat.RGB,
        //         sampler : sampler
        //     });
        // }

        // if (imageryProvider.tilingScheme.projection instanceof WebMercatorProjection) {
        //     imagery.textureWebMercator = texture;
        // } else {
        //     imagery.texture = texture;
        // }

        // imagery.texture = image;

        // imagery.texture = image;

        if (
            imageryProvider.tilingScheme.projection instanceof WebMercatorProjection
        ) {
            imagery.textureWebMercator = image;
        } else {
            imagery.texture = image;
        }
        imagery.image = undefined;
        imagery.state = ImageryState.TEXTURE_LOADED;
    }

    /**
    * Enqueues a command re-projecting a texture to a {@link GeographicProjection} on the next update, if necessary, and generate
    * mipmaps for the geographic texture.
    *
    * @private
    *
    * @param {FrameState} frameState The frameState.
    * @param {Imagery} imagery The imagery instance to reproject.
    * @param {Boolean} [needGeographicProjection=true] True to reproject to geographic, or false if Web Mercator is fine.
    */
    _reprojectTexture(frameState: FrameState, imagery: Imagery, needGeographicProjection = true): void {
        const texture = imagery.textureWebMercator || imagery.texture;
        const rectangle = imagery.rectangle;
        const context = frameState.context;

        needGeographicProjection = defaultValue(needGeographicProjection, true);

        Engine3D.res.loadTexture(imagery.imageUrl, {
        }, true).then(res => {
            // 放大模式，默认 linear 模式
            res.magFilter = 'linear';
            // 缩小模式，默认 linear 模式
            res.minFilter = 'linear';
            res.addressModeU = GPUAddressMode.clamp_to_edge;
            res.addressModeV = GPUAddressMode.clamp_to_edge;
            res.width = 256;
            res.height = 256;
            res.useMipmap = true;
            imagery.texture = res;
            imagery.state = ImageryState.READY;


        })
        // Reproject this texture if it is not already in a geographic projection and
        // the pixels are more than 1e-5 radians apart.  The pixel spacing cutoff
        // avoids precision problems in the reprojection transformation while making
        // no noticeable difference in the georeferencing of the image.
        //  if (needGeographicProjection &&
        //     !(this._imageryProvider.tilingScheme.projection instanceof GeographicProjection) &&
        //     rectangle.width / texture.image.width > 1e-5) {
        //      const that = this;
        //      imagery.addReference();
        //     //  finalizeReprojectTexture(that, context, imagery);
        //      console.log(imagery)
        //     //  imagery.releaseReference()
        //      const computeCommand = new ComputeCommand({
        //          persists: true,
        //          owner: this,
        //          // Update render resources right before execution instead of now.
        //          // This allows different ImageryLayers to share the same vao and buffers.
        //          preExecute: function (command: ComputeCommand) {
        //              reprojectToGeographic(command, context, texture, imagery.rectangle);
        //          },
        //          postExecute: function (outputTexture: any) {
        //              imagery.texture = outputTexture;
        //              finalizeReprojectTexture(that, context, imagery, outputTexture);
        //              imagery.releaseReference();
        //          }
        //      });

        //      this._reprojectComputeCommands.push(computeCommand);
        //  } else {
        //      if (needGeographicProjection) {
        //          imagery.texture = texture;

        //      }
        //      finalizeReprojectTexture(this, context, imagery, texture);
        //  }
    }

    /**
    * Calculate the translation and scale for a particular {@link TileImagery} attached to a
    * particular terrain tile.
    *
    * @private
    *
    * @param {Tile} tile The terrain tile.
    * @param {TileImagery} tileImagery The imagery tile mapping.
    * @returns {Cartesian4} The translation and scale where X and Y are the translation and Z and W
    *          are the scale.
    */
    _calculateTextureTranslationAndScale(tile: any, tileImagery: any): Vector4 {
        let imageryRectangle = tileImagery.readyImagery.rectangle;
        let terrainRectangle = tile.rectangle;

        if (tileImagery.useWebMercatorT) {
            const tilingScheme = tileImagery.readyImagery.imageryLayer.imageryProvider.tilingScheme;
            imageryRectangle = tilingScheme.rectangleToNativeRectangle(imageryRectangle, imageryBoundsScratch);
            terrainRectangle = tilingScheme.rectangleToNativeRectangle(terrainRectangle, terrainRectangleScratch);
        }

        const terrainWidth = terrainRectangle.width;
        const terrainHeight = terrainRectangle.height;

        const scaleX = terrainWidth / imageryRectangle.width;
        const scaleY = terrainHeight / imageryRectangle.height;
        return new Vector4(
            scaleX * (terrainRectangle.west - imageryRectangle.west) / terrainWidth,
            scaleY * (terrainRectangle.south - imageryRectangle.south) / terrainHeight,
            scaleX,
            scaleY
        );
    }

    /**
    * Cancels re-projection commands queued for the next frame.
    *
    * @private
    */
    cancelReprojections(): void {
        this._reprojectComputeCommands.length = 0;
    }

    removeImageryFromCache(imagery: Imagery): void {
        const cacheKey = getImageryCacheKey(imagery.x, imagery.y, imagery.level);
        delete this._imageryCache[cacheKey];
    }

    /**
    * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
    * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
    * <br /><br />
    * Once an object is destroyed, it should not be used; calling any function other than
    * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
    * assign the return value (<code>undefined</code>) to the object as done in the example.
    *
    * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
    *
    *
    * @example
    * imageryLayer = imageryLayer && imageryLayer.destroy();
    *
    * @see ImageryLayer#isDestroyed
    */
    destroy(): void {
        return destroyObject(this);
    }
}

/**
     * This value is used as the default brightness for the imagery layer if one is not provided during construction
     * or by the imagery provider. This value does not modify the brightness of the imagery.
     * @type {Number}
     * @default 1.0
     */
ImageryLayer.DEFAULT_BRIGHTNESS = 1.0;
/**
  * This value is used as the default contrast for the imagery layer if one is not provided during construction
  * or by the imagery provider. This value does not modify the contrast of the imagery.
  * @type {Number}
  * @default 1.0
  */
ImageryLayer.DEFAULT_CONTRAST = 1.0;
/**
  * This value is used as the default hue for the imagery layer if one is not provided during construction
  * or by the imagery provider. This value does not modify the hue of the imagery.
  * @type {Number}
  * @default 0.0
  */
ImageryLayer.DEFAULT_HUE = 0.0;
/**
  * This value is used as the default saturation for the imagery layer if one is not provided during construction
  * or by the imagery provider. This value does not modify the saturation of the imagery.
  * @type {Number}
  * @default 1.0
  */
ImageryLayer.DEFAULT_SATURATION = 1.0;
/**
  * This value is used as the default gamma for the imagery layer if one is not provided during construction
  * or by the imagery provider. This value does not modify the gamma of the imagery.
  * @type {Number}
  * @default 1.0
  */
ImageryLayer.DEFAULT_GAMMA = 1.0;

/**
  * This value is used as the default split for the imagery layer if one is not provided during construction
  * or by the imagery provider.
  * @type {ImagerySplitDirection}
  * @default ImagerySplitDirection.NONE
  */
ImageryLayer.DEFAULT_SPLIT = ImagerySplitDirection.NONE;

export { ImageryLayer };
