import { BoundingSphere } from '../Bound/BoundingSphere';
import { Cartesian2 } from '../../Math/Cartesian2';
import { Cartesian3 } from '../../Math/Cartesian3';
import { Cartographic } from '../../Math/Cartographic';
import { CesiumColor } from '../../Math/CesiumColor';
import { defaultValue } from '../../Util/defaultValue';
import { defined } from '../../Util/defined';
import { DeveloperError } from '../../Util/DeveloperError';
import { Ellipsoid } from '../../Math/Ellipsoid/Ellipsoid';
import { EllipsoidTerrainProvider } from '../../Math/Ellipsoid/EllipsoidTerrainProvider';
import { Event } from '../../Util/Event';
import { IntersectionTests } from '../Request/IntersectionTests';
import { NearFarScalar } from '../Camera/NearFarScalar';
import { Object3DCollection } from '../Renderer/Object3DCollection';
import { Ray } from '../../Math/Ray';
import { Rectangle } from '../../Math/Rectangle';
import { SceneMode } from '../Scene/SceneMode';
import { ShaderSource } from '../../ori_map/Renderer/ShaderSource';
// import GlobeFS from '../Shader/GlobeFS.glsl';
// import GlobeVS from '../Shader/GlobeVS.glsl';
import GroundAtmosphere from '../../ori_map/Shader/GroundAtmosphere';
import { Raycaster, Vector2 } from 'three';
import { FrameState } from '../Renderer/FrameState';
import { GlobeSurfaceShaderSet } from './GlobeSurfaceShaderSet';
import { GlobeSurfaceTileProvider } from './GlobeSurfaceTileProvider';
import { ImageryLayerCollection } from '../../Layer/ImageryLayer/ImageryLayerCollection';
import { QuadtreePrimitive } from '../Quadtree/QuadtreePrimitive';
import { CesiumScene } from '../Scene/CesiumScene';

const scratchGetHeightCartesian = new Cartesian3();
const scratchGetHeightIntersection = new Cartesian3();
const scratchGetHeightCartographic = new Cartographic();
const scratchGetHeightRay = new Ray();

const scratchArray: any = [];
const scratchSphereIntersectionResult = {
    start: 0.0,
    stop: 0.0
};

const intersectionPoint = new Cartesian3();

const raycaster = new Raycaster();
const mouse = new Vector2();

// const pickEarth = new Mesh(new SphereBufferGeometry(6378137, 32, 32));

function tileIfContainsCartographic (tile: any, cartographic: any) {
    return defined(tile) && Rectangle.contains(tile.rectangle, cartographic)
        ? tile
        : undefined;
}

function createComparePickTileFunction (rayOrigin: Cartesian3) {
    return function (a:any, b:any) {
        const aDist = BoundingSphere.distanceSquaredTo(
            a.pickBoundingSphere,
            rayOrigin
        );
        const bDist = BoundingSphere.distanceSquaredTo(
            b.pickBoundingSphere,
            rayOrigin
        );

        return aDist - bDist;
    };
}
// const makeShadersDirty = (globe: Globe) => {
//     const defines: any[] = [];

//     // const requireNormals =
//     //   defined(globe._material) &&
//     //   (globe._material.shaderSource.match(/slope/) ||
//     //     globe._material.shaderSource.match('normalEC'));

//     const requireNormals = false;

//     const fragmentSources = [GroundAtmosphere];
//     // if (
//     //     defined(globe._material) &&
//     //   (!requireNormals || globe._terrainProvider.requestVertexNormals)
//     // ) {
//     //     fragmentSources.push(globe._material.shaderSource);
//     //     defines.push('APPLY_MATERIAL');
//     //     globe._surface._tileProvider.materialUniformMap = globe._material._uniforms;
//     // } else {
//     //     globe._surface._tileProvider.materialUniformMap = undefined;
//     // }

//     globe._surface._tileProvider.materialUniformMap = undefined;

//     fragmentSources.push(GlobeFS);

//     globe._surfaceShaderSet.baseVertexShaderSource = new ShaderSource({
//         sources: [GroundAtmosphere, GlobeVS],
//         defines: defines
//     });

//     globe._surfaceShaderSet.baseFragmentShaderSource = new ShaderSource({
//         sources: fragmentSources,
//         defines: defines
//     });
//     // globe._surfaceShaderSet.material = globe._material;
// };

class Globe extends Object3DCollection {
    _ellipsoid:Ellipsoid
    _surface: QuadtreePrimitive;
    maximumScreenSpaceError: number;
    _imageryLayerCollection: ImageryLayerCollection;
    _terrainProviderChanged: Event;
    tileCacheSize: number;
    _terrainProvider: EllipsoidTerrainProvider;
    showGroundAtmosphere: true;
    _zoomedOutOceanSpecularIntensity: number;
    terrainExaggeration: number;
    terrainExaggerationRelativeHeight: number;
    _surfaceShaderSet = new GlobeSurfaceShaderSet();
    _undergroundColor = CesiumColor.clone(CesiumColor.BLACK);
    _undergroundColorAlphaByDistance: NearFarScalar;

    enableLighting = false;
    dynamicAtmosphereLighting = false;
    dynamicAtmosphereLightingFromSun = false;
    visible: boolean;
    constructor (ellipsoid = Ellipsoid.WGS84) {
        super();
        this.visible = true;
        const terrainProvider = new EllipsoidTerrainProvider({
            ellipsoid: ellipsoid
        });

        this._ellipsoid = ellipsoid;

        const imageryLayerCollection = new ImageryLayerCollection();

        this._imageryLayerCollection = imageryLayerCollection;

        this._surface = new QuadtreePrimitive({
            tileProvider: new GlobeSurfaceTileProvider({
                terrainProvider: new EllipsoidTerrainProvider(),
                imageryLayers: imageryLayerCollection,
                surfaceShaderSet: this._surfaceShaderSet
            })
        });

        this._terrainProvider = terrainProvider;
        this._terrainProviderChanged = new Event();

        this.maximumScreenSpaceError = 2;

        this._undergroundColorAlphaByDistance = new NearFarScalar(
            ellipsoid.maximumRadius / 1000.0,
            0.0,
            ellipsoid.maximumRadius / 5.0,
            1.0
        );

        /**
         * The size of the terrain tile cache, expressed as a number of tiles.  Any additional
         * tiles beyond this number will be freed, as long as they aren't needed for rendering
         * this frame.  A larger number will consume more memory but will show detail faster
         * when, for example, zooming out and then back in.
         *
         * @type {Number}
         * @default 100
         */
        this.tileCacheSize = 100;

        /**
         * Enable the ground atmosphere, which is drawn over the globe when viewed from a distance between <code>lightingFadeInDistance</code> and <code>lightingFadeOutDistance</code>.
         *
         * @demo {@link https://sandcastle.cesium.com/index.html?src=Ground%20Atmosphere.html|Ground atmosphere demo in Sandcastle}
         *
         * @type {Boolean}
         * @default true
         */
        this.showGroundAtmosphere = true;

        this._zoomedOutOceanSpecularIntensity = 0.4;

        /**
         * A scalar used to exaggerate the terrain. Defaults to <code>1.0</code> (no exaggeration).
         * A value of <code>2.0</code> scales the terrain by 2x.
         * A value of <code>0.0</code> makes the terrain completely flat.
         * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
         * @type {Number}
         * @default 1.0
         */
        this.terrainExaggeration = 1.0;

        /**
         * The height from which terrain is exaggerated. Defaults to <code>0.0</code> (scaled relative to ellipsoid surface).
         * Terrain that is above this height will scale upwards and terrain that is below this height will scale downwards.
         * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
         * If {@link Globe#terrainExaggeration} is <code>1.0</code> this value will have no effect.
         * @type {Number}
         * @default 0.0
         */
        this.terrainExaggerationRelativeHeight = 0.0;

        this.terrainProvider = new EllipsoidTerrainProvider();

        this._undergroundColorAlphaByDistance = new NearFarScalar(
            ellipsoid.maximumRadius / 1000.0,
            0.0,
            ellipsoid.maximumRadius / 5.0,
            1.0
        );

        // makeShadersDirty(this);

        this.terrainProvider = new EllipsoidTerrainProvider();
    }

    get ellipsoid (): Ellipsoid {
        return this._ellipsoid;
    }

    get terrainProvider (): EllipsoidTerrainProvider {
        return this._terrainProvider;
    }

    set terrainProvider (value: EllipsoidTerrainProvider) {
        if (value !== this._terrainProvider) {
            this._terrainProvider = value;
            this._terrainProviderChanged.raiseEvent(value);
        }
    }

    get imageryLayers (): ImageryLayerCollection {
        return this._imageryLayerCollection;
    }

    get imageryLayersUpdatedEvent (): Event {
        return this._surface.tileProvider.imageryLayersUpdatedEvent;
    }

    get tilesLoaded (): boolean {
        if (!defined(this._surface)) {
            return true;
        }
        return (
            this._surface.tileProvider.ready &&
            this._surface._tileLoadQueueHigh.length === 0 &&
            this._surface._tileLoadQueueMedium.length === 0 &&
            this._surface._tileLoadQueueLow.length === 0
        );
    }

    get terrainProviderChanged (): Event {
        return this._terrainProviderChanged;
    }

    /**
     * Get the height of the surface at a given cartographic.
     *
     * @param {Cartographic} cartographic The cartographic for which to find the height.
     * @returns {Number|undefined} The height of the cartographic or undefined if it could not be found.
     */
    getHeight (cartographic: Cartographic): number | undefined {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required');
        }
        // >>includeEnd('debug');

        const levelZeroTiles = this._surface._levelZeroTiles;
        if (!defined(levelZeroTiles)) {
            return;
        }

        let tile;
        let i;

        const length = levelZeroTiles.length;
        for (i = 0; i < length; ++i) {
            tile = levelZeroTiles[i];
            if (Rectangle.contains(tile.rectangle, cartographic)) {
                break;
            }
        }

        if (i >= length) {
            return undefined;
        }

        let tileWithMesh = tile;

        while (defined(tile)) {
            tile =
        tileIfContainsCartographic(tile._southwestChild, cartographic) ||
        tileIfContainsCartographic(tile._southeastChild, cartographic) ||
        tileIfContainsCartographic(tile._northwestChild, cartographic) ||
        tile._northeastChild;

            if (
                defined(tile) &&
        defined(tile.data) &&
        defined(tile.data.renderedMesh)
            ) {
                tileWithMesh = tile;
            }
        }

        tile = tileWithMesh;

        // This tile was either rendered or culled.
        // It is sometimes useful to get a height from a culled tile,
        // e.g. when we're getting a height in order to place a billboard
        // on terrain, and the camera is looking at that same billboard.
        // The culled tile must have a valid mesh, though.
        if (
            !defined(tile) ||
      !defined(tile.data) ||
      !defined(tile.data.renderedMesh)
        ) {
            // Tile was not rendered (culled).
            return undefined;
        }

        const projection = this._surface._tileProvider.tilingScheme.projection;
        const ellipsoid = this._surface._tileProvider.tilingScheme.ellipsoid;

        // cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
        const cartesian = Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            0.0,
            ellipsoid,
            scratchGetHeightCartesian
        );

        const ray = scratchGetHeightRay;
        const surfaceNormal = ellipsoid.geodeticSurfaceNormal(cartesian, ray.direction) as Cartesian3;

        // Try to find the intersection point between the surface normal and z-axis.
        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
        const rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
            cartesian,
            11500.0,
            ray.origin
        );

        // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
        if (!defined(rayOrigin)) {
            // intersection point is outside the ellipsoid, try other value
            // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
            let minimumHeight;
            if (defined(tile.data.tileBoundingRegion)) {
                minimumHeight = tile.data.tileBoundingRegion.minimumHeight;
            }
            const magnitude = Math.min(defaultValue(minimumHeight, 0.0), -11500.0);

            // multiply by the *positive* value of the magnitude
            const vectorToMinimumPoint = Cartesian3.multiplyByScalar(
                surfaceNormal,
                Math.abs(magnitude) + 1,
                scratchGetHeightIntersection
            );
            Cartesian3.subtract(cartesian, vectorToMinimumPoint, ray.origin);
        }

        const intersection = tile.data.pick(
            ray,
            undefined,
            projection,
            false,
            scratchGetHeightIntersection
        );
        if (!defined(intersection)) {
            return undefined;
        }

        return (ellipsoid as any).cartesianToCartographic(
            intersection,
            scratchGetHeightCartographic
        ).height;
    }

    render (frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        const surface = this._surface;
        const pass = frameState.passes;

        if (pass.render) {
            surface.render(frameState);
        }
    }

    beginFrame (frameState: FrameState): void {
        const surface = this._surface;
        const tileProvider = surface.tileProvider;
        const terrainProvider = this.terrainProvider;

        const pass = frameState.passes;
        const mode = frameState.mode;

        if (pass.render) {
            if (this.showGroundAtmosphere) {
                this._zoomedOutOceanSpecularIntensity = 0.4;
            } else {
                this._zoomedOutOceanSpecularIntensity = 0.5;
            }

            tileProvider.terrainProvider = this.terrainProvider;

            surface.maximumScreenSpaceError = this.maximumScreenSpaceError;
            surface.tileCacheSize = this.tileCacheSize;

            tileProvider.terrainProvider = this.terrainProvider;
            surface.beginFrame(frameState);
        }
    }

    endFrame (frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        if (frameState.passes.render) {
            this._surface.endFrame(frameState);
        }
    }

    update2 (frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        if (frameState.passes.render) {
            this._surface.update(frameState);
        }
    }

    pickWorldCoordinates (ray: Ray,
        scene: CesiumScene,
        cullBackFaces = true,
        result?: Cartesian3): Cartesian3 | undefined {
        cullBackFaces = defaultValue(cullBackFaces, true);

        const mode = scene.mode;
        const projection = scene.mapProjection;

        const sphereIntersections = scratchArray;
        sphereIntersections.length = 0;

        const tilesToRender = this._surface._tilesToRender;
        let length = tilesToRender.length;

        let tile;
        let i;

        for (i = 0; i < length; ++i) {
            tile = tilesToRender[i];
            const surfaceTile = tile.data;

            if (!defined(surfaceTile)) {
                continue;
            }

            let boundingVolume = surfaceTile.pickBoundingSphere;
            if (mode !== SceneMode.SCENE3D) {
                surfaceTile.pickBoundingSphere = boundingVolume = BoundingSphere.fromRectangleWithHeights2D(
                    tile.rectangle,
                    projection,
                    surfaceTile.tileBoundingRegion.minimumHeight,
                    surfaceTile.tileBoundingRegion.maximumHeight,
                    boundingVolume
                );
                Cartesian3.fromElements(
                    boundingVolume.center.z,
                    boundingVolume.center.x,
                    boundingVolume.center.y,
                    boundingVolume.center
                );
            } else if (defined(surfaceTile.renderedMesh)) {
                BoundingSphere.clone(
                    surfaceTile.tileBoundingRegion.boundingSphere,
                    boundingVolume
                );
            } else {
                // So wait how did we render this thing then? It shouldn't be possible to get here.
                continue;
            }

            // const boundingSphereIntersection = IntersectionTests.intersectSphere(
            //     ray,
            //     boundingVolume,
            //     intersectionPoint
            // );
            const boundingSphereIntersection = IntersectionTests.raySphere(
                ray,
                boundingVolume,
                scratchSphereIntersectionResult
            );

            if (defined(boundingSphereIntersection)) {
                sphereIntersections.push(surfaceTile);
            }
        }

        sphereIntersections.sort(createComparePickTileFunction(ray.origin));

        let intersection;
        length = sphereIntersections.length;
        for (i = 0; i < length; ++i) {
            intersection = sphereIntersections[i].pick(
                ray,
                scene.mode,
                scene.mapProjection,
                cullBackFaces,
                result
            );
            if (defined(intersection)) {
                break;
            }
        }

        return intersection;
    }
}

export { Globe };
