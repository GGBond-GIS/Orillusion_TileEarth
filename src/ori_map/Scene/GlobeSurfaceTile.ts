/* eslint-disable no-prototype-builtins */
import { BoundingSphere } from '../Core/BoundingSphere';
import { Cartesian3 } from '../Core/Cartesian3';
import { defined } from '../Core/defined';
import { EllipsoidTerrainProvider } from '../Core/EllipsoidTerrainProvider';
import { TerrainEncoding } from '../Core/TerrainEncoding';
import { TerrainMesh } from '../Core/TerrainMesh';
import { TerrainQuantization } from '../Core/TerrainQuantization';
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, StaticDrawUsage, Uint16BufferAttribute } from 'three';
import { Context } from './Context';
import { FrameState } from './FrameState';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import { QuadtreeTile } from './QuadtreeTile';
import { QuadtreeTileLoadState } from './QuadtreeTileLoadState';
import { TerrainState } from './TerrainState';
import { when } from '../ThirdParty/when';
import { TerrainProvider } from '../Core/TerrainProvider';
import { RequestState } from '../Core/RequestState';
import { TileProviderError } from '../Core/TileProviderError';
import { RequestType } from '../Core/RequestType';
import { Request } from '../Core/Request';
import { TileBoundingRegion } from './TileBoundingRegion';
import { ImageryState } from './ImageryState';
import { Ray } from '../Core/Ray';
import { IntersectionTests } from '../Core/IntersectionTests';
import { Cartographic } from '../Core/Cartographic';
import { SceneMode } from '../Core/SceneMode';
import { IndexDatatype } from '../Core/IndexDatatype';
import { Cartesian4 } from '../Core/Cartesian4';
import { TileImagery } from './TileImagery';
import { Imagery } from './Imagery';
import { Ellipsoid } from '../Core/Ellipsoid';
import { BufferUsage } from '../Renderer/BufferUsage';
import { Buffer } from '../Renderer/Buffer';
import { GeometryBase, VertexAttributeName } from '@orillusion/core';

function disposeArray () {

    // this.array = null;

}

function czm_decompressTextureCoordinates( encoded:number)
{
   let temp = encoded / 4096.0;
   let xZeroTo4095 = new Float32Array([temp])[0];
   let stx = xZeroTo4095 / 4095.0;
   let sty = (encoded - xZeroTo4095 * 4096.0) / 4095.0;
   return [stx, sty];
}





const scratchCartographic = new Cartographic();

function getPosition (encoding: any, mode: any, projection: any, vertices: any, index: any, result: any) {
    let position = encoding.getExaggeratedPosition(vertices, index, result);

    if (defined(mode) && mode !== SceneMode.SCENE3D) {
        const ellipsoid = projection.ellipsoid;
        const positionCartographic = ellipsoid.cartesianToCartographic(
            position,
            scratchCartographic
        );
        position = projection.project(positionCartographic, result);
        position = Cartesian3.fromElements(
            position.z,
            position.x,
            position.y,
            result
        );
    }

    return position;
}

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();

function toggleGeodeticSurfaceNormals (
    surfaceTile: any,
    enabled: any,
    ellipsoid: any,
    frameState: any
) {
    const renderedMesh = surfaceTile.renderedMesh;
    const vertexBuffer = renderedMesh.vertices;
    const encoding = renderedMesh.encoding;
    const vertexCount = vertexBuffer.length / encoding.stride;

    // Calculate the new stride and generate a new buffer
    // Clone the other encoding, toggle geodetic surface normals, then clone again to get updated stride
    let newEncoding = TerrainEncoding.clone(encoding) as TerrainEncoding;
    newEncoding.hasGeodeticSurfaceNormals = enabled;
    newEncoding = TerrainEncoding.clone(newEncoding) as TerrainEncoding;
    const newStride = newEncoding.stride;
    const newVertexBuffer = new Float32Array(vertexCount * newStride);

    if (enabled) {
        encoding.addGeodeticSurfaceNormals(
            vertexBuffer,
            newVertexBuffer,
            ellipsoid
        );
    } else {
        encoding.removeGeodeticSurfaceNormals(vertexBuffer, newVertexBuffer);
    }

    renderedMesh.vertices = newVertexBuffer;
    renderedMesh.stride = newStride;

    // delete the old vertex array (which deletes the vertex buffer attached to it), and create a new vertex array with the new vertex buffer
    const isFill = renderedMesh !== surfaceTile.mesh;
    if (isFill) {
        GlobeSurfaceTile._freeVertexArray(surfaceTile.fill.vertexArray);
        surfaceTile.fill.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
            frameState.context,
            renderedMesh
        );
    } else {
        GlobeSurfaceTile._freeVertexArray(surfaceTile.vertexArray);
        surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
            frameState.context,
            renderedMesh
        );
    }
    GlobeSurfaceTile._freeVertexArray(surfaceTile.wireframeVertexArray);
    surfaceTile.wireframeVertexArray = undefined;
}

/**
 * Contains additional information about a {@link QuadtreeTile} of the globe's surface, and
 * encapsulates state transition logic for loading tiles.
 *
 * @constructor
 * @alias GlobeSurfaceTile
 * @private
 */

class GlobeSurfaceTile {
    /**
     * The {@link TileImagery} attached to this tile.
     * @type {TileImagery[]}
     * @default []
     */
    imagery: TileImagery[] = [];

    waterMaskTexture: any = undefined;
    waterMaskTranslationAndScale = new Cartesian4(0.0, 0.0, 1.0, 1.0);

    terrainData: any = undefined;
    vertexArray: any = undefined;

    /**
     * A bounding region used to estimate distance to the tile. The horizontal bounds are always tight-fitting,
     * but the `minimumHeight` and `maximumHeight` properties may be derived from the min/max of an ancestor tile
     * and be quite loose-fitting and thus very poor for estimating distance.
     * @type {TileBoundingRegion}
     */
    tileBoundingRegion: any = undefined;
    occludeePointInScaledSpace = new Cartesian3();
    boundingVolumeSourceTile: any = undefined;
    boundingVolumeIsFromMesh = false;

    terrainState = TerrainState.UNLOADED;
    mesh: any = undefined;
    fill: any = undefined;

    pickBoundingSphere = new BoundingSphere();

    surfaceShader: any = undefined;
    isClipped = true;

    clippedByBoundaries = false;
    wireframeVertexArray?: any;

    /**
     * Gets a value indicating whether or not this tile is eligible to be unloaded.
     * Typically, a tile is ineligible to be unloaded while an asynchronous operation,
     * such as a request for data, is in progress on it.  A tile will never be
     * unloaded while it is needed for rendering, regardless of the value of this
     * property.
     * @memberof GlobeSurfaceTile.prototype
     * @type {Boolean}
     */
    get eligibleForUnloading (): boolean {
        // Do not remove tiles that are transitioning or that have
        // imagery that is transitioning.
        const terrainState = this.terrainState;
        const loadingIsTransitioning =
        terrainState === TerrainState.RECEIVING ||
        terrainState === TerrainState.TRANSFORMING;

        let shouldRemoveTile = !loadingIsTransitioning;

        const imagery = this.imagery;
        for (let i = 0, len = imagery.length; shouldRemoveTile && i < len; ++i) {
            const tileImagery = imagery[i] as TileImagery;
            shouldRemoveTile =
            !defined(tileImagery.loadingImagery) ||
            (tileImagery.loadingImagery as Imagery).state !== ImageryState.TRANSITIONING;
        }

        return shouldRemoveTile;
    }

    /**
     * Gets the {@link TerrainMesh} that is used for rendering this tile, if any.
     * Returns the value of the {@link GlobeSurfaceTile#mesh} property if
     * {@link GlobeSurfaceTile#vertexArray} is defined. Otherwise, It returns the
     * {@link TerrainFillMesh#mesh} property of the {@link GlobeSurfaceTile#fill}.
     * If there is no fill, it returns undefined.
     *
     * @memberof GlobeSurfaceTile.prototype
     * @type {TerrainMesh}
     */
    get renderedMesh (): any {
        if (defined(this.vertexArray)) {
            return this.mesh;
        } else if (defined(this.fill)) {
            return this.fill.mesh;
        }
        return undefined;
    }

    pick (
        ray: any,
        mode: any,
        projection: any,
        cullBackFaces: any,
        result: any
    ) {
        const mesh = this.renderedMesh;
        if (!defined(mesh)) {
            return undefined;
        }

        const vertices = mesh.vertices;
        const indices = mesh.indices;
        const encoding = mesh.encoding;
        const indicesLength = indices.length;

        let minT = Number.MAX_VALUE;

        for (let i = 0; i < indicesLength; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            const v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
            const v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
            const v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

            const t = IntersectionTests.rayTriangleParametric(
                ray,
                v0,
                v1,
                v2,
                cullBackFaces
            );
            if (defined(t) && t < minT && t >= 0.0) {
                minT = t;
            }
        }

        return minT !== Number.MAX_VALUE
            ? Ray.getPoint(ray, minT, result)
            : undefined;
    }

    freeResources () {
        if (defined(this.waterMaskTexture)) {
            --this.waterMaskTexture.referenceCount;
            if (this.waterMaskTexture.referenceCount === 0) {
                this.waterMaskTexture.destroy();
            }
            this.waterMaskTexture = undefined;
        }

        this.terrainData = undefined;

        this.terrainState = TerrainState.UNLOADED;
        this.mesh = undefined;
        this.fill = this.fill && this.fill.destroy();

        const imageryList = this.imagery;
        for (let i = 0, len = imageryList.length; i < len; ++i) {
            imageryList[i].freeResources();
        }
        this.imagery.length = 0;

        this.freeVertexArray();
    }

    freeVertexArray () {
        GlobeSurfaceTile._freeVertexArray(this.vertexArray);
        this.vertexArray = undefined;
        GlobeSurfaceTile._freeVertexArray(this.wireframeVertexArray);
        this.wireframeVertexArray = undefined;
    }

    static initialize (
        tile: any,
        terrainProvider: any,
        imageryLayerCollection: any
    ) {
        let surfaceTile = tile.data;
        if (!defined(surfaceTile)) {
            surfaceTile = tile.data = new GlobeSurfaceTile();
        }

        if (tile.state === QuadtreeTileLoadState.START) {
            prepareNewTile(tile, terrainProvider, imageryLayerCollection);
            tile.state = QuadtreeTileLoadState.LOADING;
        }
    }

    static processStateMachine (
        tile: any,
        frameState: any,
        terrainProvider: any,
        imageryLayerCollection: any,
        vertexArraysToDestroy: any,
        terrainOnly: any
    ) {
        GlobeSurfaceTile.initialize(tile, terrainProvider, imageryLayerCollection);

        const surfaceTile = tile.data;

        if (tile.state === QuadtreeTileLoadState.LOADING) {
            processTerrainStateMachine(
                tile,
                frameState,
                terrainProvider,
                imageryLayerCollection,
                vertexArraysToDestroy
            );
        }

        // From here down we're loading imagery, not terrain. We don't want to load imagery until
        // we're certain that the terrain tiles are actually visible, though. We'll load terrainOnly
        // in these scenarios:
        //   * our bounding volume isn't accurate so we're not certain this tile is really visible (see GlobeSurfaceTileProvider#loadTile).
        //   * we want to upsample from this tile but don't plan to render it (see processTerrainStateMachine).
        if (terrainOnly) {
            return;
        }

        const wasAlreadyRenderable = tile.renderable;

        // The terrain is renderable as soon as we have a valid vertex array.
        tile.renderable = defined(surfaceTile.vertexArray);

        // But it's not done loading until it's in the READY state.
        const isTerrainDoneLoading = surfaceTile.terrainState === TerrainState.READY;

        // If this tile's terrain and imagery are just upsampled from its parent, mark the tile as
        // upsampled only.  We won't refine a tile if its four children are upsampled only.
        tile.upsampledFromParent =
      defined(surfaceTile.terrainData) &&
      surfaceTile.terrainData.wasCreatedByUpsampling();

        const isImageryDoneLoading = surfaceTile.processImagery(
            tile,
            terrainProvider,
            frameState
        );
        if (isTerrainDoneLoading && isImageryDoneLoading) {
            const callbacks = tile._loadedCallbacks;
            const newCallbacks = {};
            for (const layerId in callbacks) {
                if (callbacks.hasOwnProperty(layerId)) {
                    if (!callbacks[layerId](tile)) {
                        newCallbacks[layerId] = callbacks[layerId];
                    }
                }
            }
            tile._loadedCallbacks = newCallbacks;

            tile.state = QuadtreeTileLoadState.DONE;
        }

        // Once a tile is renderable, it stays renderable, because doing otherwise would
        // cause detail (or maybe even the entire globe) to vanish when adding a new
        // imagery layer. `GlobeSurfaceTileProvider._onLayerAdded` sets renderable to
        // false for all affected tiles that are not currently being rendered.
        if (wasAlreadyRenderable) {
            tile.renderable = true;
        }
    }

    processImagery (
        tile: QuadtreeTile,
        terrainProvider: any,
        frameState: FrameState,
        skipLoading?: any
    ) {
        const surfaceTile = tile.data as GlobeSurfaceTile;
        let isUpsampledOnly = tile.upsampledFromParent;
        let isAnyTileLoaded = false;
        let isDoneLoading = true;

        // Transition imagery states
        const tileImageryCollection = surfaceTile.imagery;
        let i, len;
        for (i = 0, len = tileImageryCollection.length; i < len; ++i) {
            const tileImagery = tileImageryCollection[i] as TileImagery;
            if (!defined(tileImagery.loadingImagery)) {
                isUpsampledOnly = false;
                continue;
            }

            if ((tileImagery.loadingImagery as Imagery).state === ImageryState.PLACEHOLDER) {
                const imageryLayer = (tileImagery.loadingImagery as Imagery).imageryLayer;
                if (imageryLayer.imageryProvider.ready) {
                // Remove the placeholder and add the actual skeletons (if any)
                // at the same position.  Then continue the loop at the same index.
                    tileImagery.freeResources();
                    tileImageryCollection.splice(i, 1);
                    imageryLayer._createTileImagerySkeletons(tile, terrainProvider, i);
                    --i;
                    len = tileImageryCollection.length;
                    continue;
                } else {
                    isUpsampledOnly = false;
                }
            }

            const thisTileDoneLoading = tileImagery.processStateMachine(
                tile,
                frameState,
                skipLoading
            );
            isDoneLoading = isDoneLoading && thisTileDoneLoading;

            // The imagery is renderable as soon as we have any renderable imagery for this region.
            isAnyTileLoaded =
            isAnyTileLoaded ||
            thisTileDoneLoading ||
            defined(tileImagery.readyImagery);

            isUpsampledOnly =
            isUpsampledOnly &&
            defined(tileImagery.loadingImagery) &&
            ((tileImagery.loadingImagery as Imagery).state === ImageryState.FAILED ||
            (tileImagery.loadingImagery as Imagery).state === ImageryState.INVALID);
        }

        tile.upsampledFromParent = isUpsampledOnly;
        // Allow rendering if any available layers are loaded
        tile.renderable = tile.renderable && (isAnyTileLoaded || isDoneLoading);

        return isDoneLoading;
    }

    addGeodeticSurfaceNormals (
        ellipsoid: Ellipsoid,
        frameState: FrameState
    ): void {
        toggleGeodeticSurfaceNormals(this, true, ellipsoid, frameState);
    }

    removeGeodeticSurfaceNormals (
        frameState: FrameState
    ): void {
        toggleGeodeticSurfaceNormals(this, false, undefined, frameState);
    }

    static _createVertexArrayForMesh (context: Context, mesh: any) {
        const typedArray = mesh.vertices;
        const buffer = Buffer.createVertexBuffer({
            context: context,
            typedArray: typedArray,
            usage: BufferUsage.STATIC_DRAW
        });
        const attributes = mesh.encoding.getAttributes(buffer);

        const indexBuffers = mesh.indices.indexBuffers || {};
        let indexBuffer = indexBuffers[context.id];
        if (!defined(indexBuffer) || indexBuffer.isDestroyed()) {
            const indices = mesh.indices;
            indexBuffer = Buffer.createIndexBuffer({
                context: context,
                typedArray: indices,
                usage: BufferUsage.STATIC_DRAW,
                indexDatatype: IndexDatatype.fromSizeInBytes(indices.BYTES_PER_ELEMENT)
            });
            indexBuffer.vertexArrayDestroyable = false;
            indexBuffer.referenceCount = 1;
            indexBuffers[context.id] = indexBuffer;
            mesh.indices.indexBuffers = indexBuffers;
        } else {
            ++indexBuffer.referenceCount;
        }

        const geometry = new GeometryBase();

        if ((mesh.encoding as TerrainEncoding).quantization === TerrainQuantization.BITS12) {
            // const vertexBuffer = new Float32BufferAttribute(typedArray, 4).onUpload(disposeArray);
            // geometry.setAttribute('compressed0', vertexBuffer);
            const vertexBuffer = new InterleavedBuffer(typedArray, attributes[0].componentsPerAttribute);
            vertexBuffer.setUsage(StaticDrawUsage);
            const compressed0 = new InterleavedBufferAttribute(vertexBuffer, attributes[0].componentsPerAttribute, 0, false);
            console.log(compressed0,vertexBuffer,mesh);
            compressed0.data
            // geometry.setAttribute('compressed0', compressed0);
            let positon= [];
            let uv = [];
            for (let index = 0; index < compressed0.array.length; index+=4) {
                
                const element0 = vertexBuffer.array[index];
                const element1 = vertexBuffer.array[index+1];
                const element2 = vertexBuffer.array[index+2];
                const element3 = vertexBuffer.array[index+3];
                let xy = czm_decompressTextureCoordinates(element0);
                let zh = czm_decompressTextureCoordinates(element1);
                let position =[...xy,zh[0]]
                let textureCoordinates = czm_decompressTextureCoordinates(element2);
            
                uv.push(...textureCoordinates);
                positon.push(...position);
            }
            geometry.setAttribute(VertexAttributeName.position,new Float32Array(positon));
            geometry.setAttribute(VertexAttributeName.uv, new Float32Array(uv) as Float32Array);
            mesh.show = false;
            //压缩定点算法还没做这里取消渲染
        } else {
            const vertexBuffer = new InterleavedBuffer(typedArray, attributes[0].componentsPerAttribute + attributes[1].componentsPerAttribute);

            vertexBuffer.setUsage(StaticDrawUsage);

            const position3DAndHeight = new InterleavedBufferAttribute(vertexBuffer, attributes[0].componentsPerAttribute - 1, 0, false);
            const textureCoordAndEncodedNormals = new InterleavedBufferAttribute(vertexBuffer, attributes[1].componentsPerAttribute - 1, attributes[0].componentsPerAttribute, false);
            let positon = [];
            let uv =[];
            for (let index = 0; index < vertexBuffer.array.length; index+=7) {
                const element = vertexBuffer.array[index];
                const element1 = vertexBuffer.array[index+1];
                const element2 = vertexBuffer.array[index+2];
                const element3 = vertexBuffer.array[index+3];
                const element4 = vertexBuffer.array[index+4];
                const element5 = vertexBuffer.array[index+5];
                const element6 = vertexBuffer.array[index+6];
                positon.push(...[element,element1,element2]);
                uv.push(...[element4,element5])
            }
            let feop = new Float32Array(positon);

            geometry.setIndices(mesh.indices);
            geometry.setAttribute(VertexAttributeName.position, feop as Float32Array);
            geometry.setAttribute(VertexAttributeName.uv, new Float32Array(uv) as Float32Array);
            mesh.show = true;

            // geometry.setAttribute('textureCoordAndEncodedNormals', textureCoordAndEncodedNormals);
        }

     
        geometry.addSubGeometry({
            indexStart: 0,
            indexCount: mesh.indices.length,
            vertexStart: 0,
            index: 0,
        });
        (mesh as any).geometry = geometry;
        // debugger;
        return geometry;

        // return new VertexArray({
        //     context: context,
        //     attributes: attributes,
        //     indexBuffer: indexBuffer
        // });

        //! ----------------------------------------

        // const typedArray = mesh.vertices;
        // const geometry = new BufferGeometry();

        // const attributes = (mesh.encoding as TerrainEncoding).getAttributes([]);

        // const indexBuffers = (mesh.indices as any).indexBuffers || {};
        // let indexBuffer = indexBuffers[context.id];

        // if (!defined(indexBuffer)) {
        //     const indexDatatype = IndexDatatype.fromSizeInBytes(mesh.indices.BYTES_PER_ELEMENT);
        //     const bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype) / 2;
        //     indexBuffer = new Uint16BufferAttribute(mesh.indices, bytesPerIndex).onUpload(disposeArray);

        //     indexBuffers[context.id] = indexBuffer;
        //     (mesh.indices as any).indexBuffers = indexBuffers;
        // } else {
        //     ++indexBuffer.referenceCount;
        // }

        // geometry.setIndex(indexBuffer);

        // if ((mesh.encoding as TerrainEncoding).quantization === TerrainQuantization.BITS12) {
        //     const vertexBuffer = new Float32BufferAttribute(typedArray, 4).onUpload(disposeArray);
        //     geometry.setAttribute('compressed0', vertexBuffer);
        // } else {
        //     const vertexBuffer = new InterleavedBuffer(typedArray, attributes[0].componentsPerAttribute + attributes[1].componentsPerAttribute);

        //     vertexBuffer.setUsage(StaticDrawUsage);

        //     const position3DAndHeight = new InterleavedBufferAttribute(vertexBuffer, attributes[0].componentsPerAttribute, 0, false);
        //     const textureCoordAndEncodedNormals = new InterleavedBufferAttribute(vertexBuffer, attributes[1].componentsPerAttribute, attributes[0].componentsPerAttribute, false);

        //     geometry.setAttribute('position3DAndHeight', position3DAndHeight);
        //     geometry.setAttribute('textureCoordAndEncodedNormals', textureCoordAndEncodedNormals);
        // }

        // // tileTerrain.vertexArray = mesh.vertices;
        // (mesh as any).geometry = geometry;

        // return geometry;
    }

    static _freeVertexArray (vertexArray: any) {
        if (defined(vertexArray)) {
            const indexBuffer = vertexArray.index;

            // if (!vertexArray.isDestroyed()) {
            //     vertexArray.destroy();
            // }

            // if (
            //     defined(indexBuffer) &&
            // !indexBuffer.isDestroyed() &&
            // defined(indexBuffer.referenceCount)
            // ) {
            //     --indexBuffer.referenceCount;
            //     if (indexBuffer.referenceCount === 0) {
            //         indexBuffer.destroy();
            //     }
            // }

            // let attributes = vertexArray.attributes;

            // for (const key in attributes) {
            //     // (attributes[key] as BufferAttribute).array = [];
            //     // (attributes[key] as any) = null;

            //     if (attributes[key] instanceof InterleavedBufferAttribute) {
            //         (attributes[key] as InterleavedBufferAttribute).data.array = [];
            //     } else if (attributes[key] instanceof BufferAttribute) {
            //         (attributes[key] as BufferAttribute).array = [];
            //     }
            // }
            // attributes = {};
            // if (defined(indexBuffer)) {
            //     (indexBuffer as BufferAttribute).array = [];
            //     indexBuffer = null;
            // }
            // console.log(vertexArray);
            // vertexArray.
            // console.log(vertexArray);
            // vertexArray.destroy(true);
        }
    }

    _findAncestorTileWithTerrainData (tile: any) {
        let sourceTile = tile.parent;

        while (
            defined(sourceTile) &&
          (!defined(sourceTile.data) ||
            !defined(sourceTile.data.terrainData) ||
            sourceTile.data.terrainData.wasCreatedByUpsampling())
        ) {
            sourceTile = sourceTile.parent;
        }

        return sourceTile;
    }

    _computeWaterMaskTranslationAndScale (
        tile: any,
        sourceTile: any,
        result: any
    ) {
        const sourceTileRectangle = sourceTile.rectangle;
        const tileRectangle = tile.rectangle;
        const tileWidth = tileRectangle.width;
        const tileHeight = tileRectangle.height;

        const scaleX = tileWidth / sourceTileRectangle.width;
        const scaleY = tileHeight / sourceTileRectangle.height;
        result.x =
          (scaleX * (tileRectangle.west - sourceTileRectangle.west)) / tileWidth;
        result.y =
          (scaleY * (tileRectangle.south - sourceTileRectangle.south)) / tileHeight;
        result.z = scaleX;
        result.w = scaleY;

        return result;
    }
}

function prepareNewTile (tile: any, terrainProvider: any, imageryLayerCollection: any) {
    let available = terrainProvider.getTileDataAvailable(
        tile.x,
        tile.y,
        tile.level
    );

    if (!defined(available) && defined(tile.parent)) {
        // Provider doesn't know if this tile is available. Does the parent tile know?
        const parent = tile.parent;
        const parentSurfaceTile = parent.data;
        if (defined(parentSurfaceTile) && defined(parentSurfaceTile.terrainData)) {
            available = parentSurfaceTile.terrainData.isChildAvailable(
                parent.x,
                parent.y,
                tile.x,
                tile.y
            );
        }
    }

    if (available === false) {
        // This tile is not available, so mark it failed so we start upsampling right away.
        tile.data.terrainState = TerrainState.FAILED;
    }

    // Map imagery tiles to this terrain tile
    for (let i = 0, len = imageryLayerCollection.length; i < len; ++i) {
        const layer = imageryLayerCollection.get(i);
        if (layer.show) {
            layer._createTileImagerySkeletons(tile, terrainProvider);
        }
    }
}

function processTerrainStateMachine (
    tile: any,
    frameState: FrameState,
    terrainProvider: any,
    imageryLayerCollection: any,
    vertexArraysToDestroy: any
) {
    const surfaceTile = tile.data;

    // If this tile is FAILED, we'll need to upsample from the parent. If the parent isn't
    // ready for that, let's push it along.
    const parent = tile.parent;
    if (
        surfaceTile.terrainState === TerrainState.FAILED &&
      parent !== undefined
    ) {
        const parentReady =
        parent.data !== undefined &&
        parent.data.terrainData !== undefined &&
        parent.data.terrainData.canUpsample !== false;
        if (!parentReady) {
            GlobeSurfaceTile.processStateMachine(
                parent,
                frameState,
                terrainProvider,
                imageryLayerCollection,
                vertexArraysToDestroy,
                true
            );
        }
    }

    if (surfaceTile.terrainState === TerrainState.FAILED) {
        upsample(
            surfaceTile,
            tile,
            frameState,
            terrainProvider,
            tile.x,
            tile.y,
            tile.level
        );
    }

    if (surfaceTile.terrainState === TerrainState.UNLOADED) {
        requestTileGeometry(
            surfaceTile,
            terrainProvider,
            tile.x,
            tile.y,
            tile.level
        );
    }

    if (surfaceTile.terrainState === TerrainState.RECEIVED) {
        transform(
            surfaceTile,
            frameState,
            terrainProvider,
            tile.x,
            tile.y,
            tile.level
        );
    }

    if (surfaceTile.terrainState === TerrainState.TRANSFORMED) {
        createResources(
            surfaceTile,
            frameState.context,
            terrainProvider,
            tile.x,
            tile.y,
            tile.level,
            vertexArraysToDestroy
        );
    }

    if (
        surfaceTile.terrainState >= TerrainState.RECEIVED &&
      surfaceTile.waterMaskTexture === undefined &&
      terrainProvider.hasWaterMask
    ) {
        const terrainData = surfaceTile.terrainData;
        if (terrainData.waterMask !== undefined) {
            // createWaterMaskTextureIfNeeded(frameState.context, surfaceTile);
        } else {
            const sourceTile = surfaceTile._findAncestorTileWithTerrainData(tile);
            if (defined(sourceTile) && defined(sourceTile.data.waterMaskTexture)) {
                surfaceTile.waterMaskTexture = sourceTile.data.waterMaskTexture;
                ++surfaceTile.waterMaskTexture.referenceCount;
                surfaceTile._computeWaterMaskTranslationAndScale(
                    tile,
                    sourceTile,
                    surfaceTile.waterMaskTranslationAndScale
                );
            }
        }
    }
}

function upsample (surfaceTile: any, tile: any, frameState: any, terrainProvider: any, x: any, y: any, level: any) {
    const parent = tile.parent;
    if (!parent) {
        // Trying to upsample from a root tile. No can do. This tile is a failure.
        tile.state = QuadtreeTileLoadState.FAILED;
        return;
    }

    const sourceData = parent.data.terrainData;
    const sourceX = parent.x;
    const sourceY = parent.y;
    const sourceLevel = parent.level;

    if (!defined(sourceData)) {
        // Parent is not available, so we can't upsample this tile yet.
        return;
    }

    const terrainDataPromise = sourceData.upsample(
        terrainProvider.tilingScheme,
        sourceX,
        sourceY,
        sourceLevel,
        x,
        y,
        level
    );
    if (!defined(terrainDataPromise)) {
        // The upsample request has been deferred - try again later.
        return;
    }

    surfaceTile.terrainState = TerrainState.RECEIVING;

    when(
        terrainDataPromise,
        function (terrainData: any) {
            surfaceTile.terrainData = terrainData;
            surfaceTile.terrainState = TerrainState.RECEIVED;
        },
        function () {
            surfaceTile.terrainState = TerrainState.FAILED;
        }
    );
}

function requestTileGeometry (surfaceTile: any, terrainProvider: any, x: any, y: any, level: any) {
    function success (terrainData: any) {
        surfaceTile.terrainData = terrainData;
        surfaceTile.terrainState = TerrainState.RECEIVED;
        surfaceTile.request = undefined;
    }

    function failure (error: any) {
        if (surfaceTile.request.state === RequestState.CANCELLED) {
        // Cancelled due to low priority - try again later.
            surfaceTile.terrainData = undefined;
            surfaceTile.terrainState = TerrainState.UNLOADED;
            surfaceTile.request = undefined;
            return;
        }

        // Initially assume failure.  handleError may retry, in which case the state will
        // change to RECEIVING or UNLOADED.
        surfaceTile.terrainState = TerrainState.FAILED;
        surfaceTile.request = undefined;

        const message =
        'Failed to obtain terrain tile X: ' +
        x +
        ' Y: ' +
        y +
        ' Level: ' +
        level +
        '. Error message: "' +
        error +
        '"';
        terrainProvider._requestError = TileProviderError.handleError(
            terrainProvider._requestError,
            terrainProvider,
            terrainProvider.errorEvent,
            message,
            x,
            y,
            level,
            doRequest
        );
    }

    function doRequest () {
        // Request the terrain from the terrain provider.
        const request = new Request({
            throttle: false,
            throttleByServer: true,
            type: RequestType.TERRAIN
        });
        surfaceTile.request = request;

        const requestPromise = terrainProvider.requestTileGeometry(
            x,
            y,
            level,
            request
        );

        // If the request method returns undefined (instead of a promise), the request
        // has been deferred.
        if (defined(requestPromise)) {
            surfaceTile.terrainState = TerrainState.RECEIVING;
            when(requestPromise, success, failure);
        } else {
        // Deferred - try again later.
            surfaceTile.terrainState = TerrainState.UNLOADED;
            surfaceTile.request = undefined;
        }
    }

    doRequest();
}

const scratchCreateMeshOptions = {
    tilingScheme: undefined,
    x: 0,
    y: 0,
    level: 0,
    exaggeration: 1.0,
    exaggerationRelativeHeight: 0.0,
    throttle: true
};

function transform (surfaceTile: any, frameState: any, terrainProvider: any, x: any, y: any, level: any) {
    const tilingScheme = terrainProvider.tilingScheme;

    const createMeshOptions = scratchCreateMeshOptions;
    createMeshOptions.tilingScheme = tilingScheme;
    createMeshOptions.x = x;
    createMeshOptions.y = y;
    createMeshOptions.level = level;
    createMeshOptions.exaggeration = frameState.terrainExaggeration;
    createMeshOptions.exaggerationRelativeHeight =
      frameState.terrainExaggerationRelativeHeight;
    createMeshOptions.throttle = true;

    const terrainData = surfaceTile.terrainData;
    const meshPromise = terrainData.createMesh(createMeshOptions);

    if (!defined(meshPromise)) {
        // Postponed.
        return;
    }

    surfaceTile.terrainState = TerrainState.TRANSFORMING;

    when(
        meshPromise,
        function (mesh: any) {
            surfaceTile.mesh = mesh;
            surfaceTile.terrainState = TerrainState.TRANSFORMED;
        },
        function () {
            surfaceTile.terrainState = TerrainState.FAILED;
        }
    );
}

function createResources (
    surfaceTile: any,
    context: any,
    terrainProvider: any,
    x: any,
    y: any,
    level: any,
    vertexArraysToDestroy: any
) {
    surfaceTile.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
        context,
        surfaceTile.mesh
    );
    surfaceTile.terrainState = TerrainState.READY;
    surfaceTile.fill =
      surfaceTile.fill && surfaceTile.fill.destroy(vertexArraysToDestroy);
}

// function getContextWaterMaskData (context: any) {
//     let data = context.cache.tile_waterMaskData;

//     if (!defined(data)) {
//         const allWaterTexture = Texture.create({
//             context: context,
//             pixelFormat: PixelFormat.LUMINANCE,
//             pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
//             source: {
//                 arrayBufferView: new Uint8Array([255]),
//                 width: 1,
//                 height: 1
//             }
//         });
//         allWaterTexture.referenceCount = 1;

//         const sampler = new Sampler({
//             wrapS: TextureWrap.CLAMP_TO_EDGE,
//             wrapT: TextureWrap.CLAMP_TO_EDGE,
//             minificationFilter: TextureMinificationFilter.LINEAR,
//             magnificationFilter: TextureMagnificationFilter.LINEAR
//         });

//         data = {
//             allWaterTexture: allWaterTexture,
//             sampler: sampler,
//             destroy: function () {
//                 this.allWaterTexture.destroy();
//             }
//         };

//         context.cache.tile_waterMaskData = data;
//     }

//     return data;
// }

// function createWaterMaskTextureIfNeeded (context, surfaceTile) {
//     const waterMask = surfaceTile.terrainData.waterMask;
//     const waterMaskData = getContextWaterMaskData(context);
//     let texture;

//     const waterMaskLength = waterMask.length;
//     if (waterMaskLength === 1) {
//         // Length 1 means the tile is entirely land or entirely water.
//         // A value of 0 indicates entirely land, a value of 1 indicates entirely water.
//         if (waterMask[0] !== 0) {
//             texture = waterMaskData.allWaterTexture;
//         } else {
//         // Leave the texture undefined if the tile is entirely land.
//             return;
//         }
//     } else {
//         const textureSize = Math.sqrt(waterMaskLength);
//         texture = Texture.create({
//             context: context,
//             pixelFormat: PixelFormat.LUMINANCE,
//             pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
//             source: {
//                 width: textureSize,
//                 height: textureSize,
//                 arrayBufferView: waterMask
//             },
//             sampler: waterMaskData.sampler,
//             flipY: false
//         });

//         texture.referenceCount = 0;
//     }

//     ++texture.referenceCount;
//     surfaceTile.waterMaskTexture = texture;

//     Cartesian4.fromElements(
//         0.0,
//         0.0,
//         1.0,
//         1.0,
//         surfaceTile.waterMaskTranslationAndScale
//     );
// }

export { GlobeSurfaceTile };
