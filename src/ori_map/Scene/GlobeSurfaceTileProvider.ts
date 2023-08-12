/* eslint-disable no-mixed-operators */

import { BoundingSphere } from '../Core/BoundingSphere';
import { Cartesian3 } from '../Core/Cartesian3';
import { Cartesian4 } from '../Core/Cartesian4';
import { Cartographic } from '../Core/Cartographic';
import { CesiumColor } from '../Core/CesiumColor';
import { CesiumMath } from '../Core/CesiumMath';
import { CesiumMatrix4 } from '../Core/CesiumMatrix4';
import { combine } from '../Core/combine';
import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { DeveloperError } from '../Core/DeveloperError';
import { EllipsoidTerrainProvider } from '../Core/EllipsoidTerrainProvider';
import { Event } from '../Core/Event';
import { GeographicTilingScheme } from '../Core/GeographicTilingScheme';
import { Intersect } from '../Core/Intersect';
import { NearFarScalar } from '../Core/NearFarScalar';
import { OrientedBoundingBox } from '../Core/OrientedBoundingBox';
import { Rectangle } from '../Core/Rectangle';
import { SceneMode } from '../Core/SceneMode';
import { TerrainExaggeration } from '../Core/TerrainExaggeration';
import { TerrainQuantization } from '../Core/TerrainQuantization';
import { Visibility } from '../Core/Visibility';
import { GlobeSurfaceTileMaterial } from '../Material/GlobeSurfaceTileMaterial';
import { TileMaterial } from '../Material/TileMaterial';
import { DrawMeshCommand } from '../Renderer/DrawMeshCommand';
import { Vector4, Vector3, DoubleSide, Matrix4, Vector2 } from 'three';
import { TerrainProvider } from './../Core/TerrainProvider';
import { ContextLimits } from './ContextLimits';
import { FrameState } from './FrameState';
import { GlobeSurfaceShaderSet } from './GlobeSurfaceShaderSet';
import { GlobeSurfaceTile } from './GlobeSurfaceTile';
import { GlobeTranslucencyState } from './GlobeTranslucencyState';
import { Imagery } from './Imagery';
import { ImageryLayer } from './ImageryLayer';
import { ImageryLayerCollection } from './ImageryLayerCollection';
import { ImageryState } from './ImageryState';
import { QuadtreeOccluders } from './QuadtreeOccluders';
import { QuadtreePrimitive } from './QuadtreePrimitive';
import { QuadtreeTile } from './QuadtreeTile';
import { QuadtreeTileLoadState } from './QuadtreeTileLoadState';
import { ShadowMode } from './ShadowMode';
import { TerrainFillMesh } from './TerrainFillMesh';
import { TerrainState } from './TerrainState';
import { TileBoundingRegion } from './TileBoundingRegion';
import { TileImagery } from './TileImagery';
import TileSelectionResult from './TileSelectionResult';

const readyImageryScratch: any[] = [];
const canRenderTraversalStack: any[] = [];

const cornerPositionsScratch = [
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
];

const tileDirectionScratch = new Cartesian3();

function computeOccludeePoint (
    tileProvider:GlobeSurfaceTileProvider,
    center:Cartesian3,
    rectangle:Rectangle,
    minimumHeight: number,
    maximumHeight: number,
    result: Cartesian3
) {
    const ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
    const ellipsoid = ellipsoidalOccluder.ellipsoid;

    const cornerPositions = cornerPositionsScratch;
    Cartesian3.fromRadians(
        rectangle.west,
        rectangle.south,
        maximumHeight,
        ellipsoid,
        cornerPositions[0]
    );
    Cartesian3.fromRadians(
        rectangle.east,
        rectangle.south,
        maximumHeight,
        ellipsoid,
        cornerPositions[1]
    );
    Cartesian3.fromRadians(
        rectangle.west,
        rectangle.north,
        maximumHeight,
        ellipsoid,
        cornerPositions[2]
    );
    Cartesian3.fromRadians(
        rectangle.east,
        rectangle.north,
        maximumHeight,
        ellipsoid,
        cornerPositions[3]
    );

    return ellipsoidalOccluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
        center,
        cornerPositions,
        minimumHeight,
        result
    );
}

function updateTileBoundingRegion (tile: QuadtreeTile, tileProvider:GlobeSurfaceTileProvider, frameState:FrameState) {
    let surfaceTile = tile.data;
    if (surfaceTile === undefined) {
        surfaceTile = tile.data = new GlobeSurfaceTile();
    }

    const ellipsoid = tile.tilingScheme.ellipsoid;
    if (surfaceTile.tileBoundingRegion === undefined) {
        surfaceTile.tileBoundingRegion = new TileBoundingRegion({
            computeBoundingVolumes: false,
            rectangle: tile.rectangle,
            ellipsoid: ellipsoid,
            minimumHeight: 0.0,
            maximumHeight: 0.0
        });
    }

    const tileBoundingRegion = surfaceTile.tileBoundingRegion;
    const oldMinimumHeight = tileBoundingRegion.minimumHeight;
    const oldMaximumHeight = tileBoundingRegion.maximumHeight;
    let hasBoundingVolumesFromMesh = false;
    let sourceTile = tile;

    // Get min and max heights from the mesh.
    // If the mesh is not available, get them from the terrain data.
    // If the terrain data is not available either, get them from an ancestor.
    // If none of the ancestors are available, then there are no min and max heights for this tile at this time.
    const mesh = surfaceTile.mesh;
    const terrainData = surfaceTile.terrainData;
    if (
        mesh !== undefined &&
      mesh.minimumHeight !== undefined &&
      mesh.maximumHeight !== undefined
    ) {
        tileBoundingRegion.minimumHeight = mesh.minimumHeight;
        tileBoundingRegion.maximumHeight = mesh.maximumHeight;
        hasBoundingVolumesFromMesh = true;
    } else if (
        terrainData !== undefined &&
      terrainData._minimumHeight !== undefined &&
      terrainData._maximumHeight !== undefined
    ) {
        tileBoundingRegion.minimumHeight = terrainData._minimumHeight;
        tileBoundingRegion.maximumHeight = terrainData._maximumHeight;
    } else {
        // No accurate min/max heights available, so we're stuck with min/max heights from an ancestor tile.
        tileBoundingRegion.minimumHeight = Number.NaN;
        tileBoundingRegion.maximumHeight = Number.NaN;

        let ancestorTile = tile.parent;
        while (ancestorTile !== undefined) {
            const ancestorSurfaceTile = ancestorTile.data;
            if (ancestorSurfaceTile !== undefined) {
                const ancestorMesh = ancestorSurfaceTile.mesh;
                const ancestorTerrainData = ancestorSurfaceTile.terrainData;
                if (
                    ancestorMesh !== undefined &&
            ancestorMesh.minimumHeight !== undefined &&
            ancestorMesh.maximumHeight !== undefined
                ) {
                    tileBoundingRegion.minimumHeight = ancestorMesh.minimumHeight;
                    tileBoundingRegion.maximumHeight = ancestorMesh.maximumHeight;
                    break;
                } else if (
                    ancestorTerrainData !== undefined &&
            ancestorTerrainData._minimumHeight !== undefined &&
            ancestorTerrainData._maximumHeight !== undefined
                ) {
                    tileBoundingRegion.minimumHeight = ancestorTerrainData._minimumHeight;
                    tileBoundingRegion.maximumHeight = ancestorTerrainData._maximumHeight;
                    break;
                }
            }
            ancestorTile = ancestorTile.parent;
        }
        sourceTile = ancestorTile;
    }

    // Update bounding regions from the min and max heights
    if (sourceTile !== undefined) {
        const exaggeration = frameState.terrainExaggeration;
        const exaggerationRelativeHeight =
        frameState.terrainExaggerationRelativeHeight;
        const hasExaggeration = exaggeration !== 1.0;
        if (hasExaggeration) {
            hasBoundingVolumesFromMesh = false;
            tileBoundingRegion.minimumHeight = TerrainExaggeration.getHeight(
                tileBoundingRegion.minimumHeight,
                exaggeration,
                exaggerationRelativeHeight
            );
            tileBoundingRegion.maximumHeight = TerrainExaggeration.getHeight(
                tileBoundingRegion.maximumHeight,
                exaggeration,
                exaggerationRelativeHeight
            );
        }

        if (hasBoundingVolumesFromMesh) {
            if (!surfaceTile.boundingVolumeIsFromMesh) {
                tileBoundingRegion._orientedBoundingBox = OrientedBoundingBox.clone(
                    mesh.orientedBoundingBox,
                    tileBoundingRegion._orientedBoundingBox
                ) as OrientedBoundingBox;
                tileBoundingRegion._boundingSphere = BoundingSphere.clone(
                    mesh.boundingSphere3D,
                    tileBoundingRegion._boundingSphere
                );
                surfaceTile.occludeePointInScaledSpace = Cartesian3.clone(
                    mesh.occludeePointInScaledSpace,
                    surfaceTile.occludeePointInScaledSpace
                );

                // If the occludee point is not defined, fallback to calculating it from the OBB
                if (!defined(surfaceTile.occludeePointInScaledSpace)) {
                    surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(
                        tileProvider,
                        tileBoundingRegion._orientedBoundingBox.center,
                        tile.rectangle,
                        tileBoundingRegion.minimumHeight,
                        tileBoundingRegion.maximumHeight,
                        surfaceTile.occludeePointInScaledSpace
                    ) as Cartesian3;
                }
            }
        } else {
            const needsBounds =
          tileBoundingRegion._orientedBoundingBox === undefined ||
          tileBoundingRegion._boundingSphere === undefined;
            const heightChanged =
          tileBoundingRegion.minimumHeight !== oldMinimumHeight ||
          tileBoundingRegion.maximumHeight !== oldMaximumHeight;
            if (heightChanged || needsBounds) {
                // Bounding volumes need to be recomputed in some circumstances
                tileBoundingRegion.computeBoundingVolumes(ellipsoid);
                surfaceTile.occludeePointInScaledSpace = computeOccludeePoint(
                    tileProvider,
                    (tileBoundingRegion._orientedBoundingBox as OrientedBoundingBox).center,
                    tile.rectangle,
                    tileBoundingRegion.minimumHeight,
                    tileBoundingRegion.maximumHeight,
                    surfaceTile.occludeePointInScaledSpace
                ) as Cartesian3;
            }
        }
        surfaceTile.boundingVolumeSourceTile = sourceTile;
        surfaceTile.boundingVolumeIsFromMesh = hasBoundingVolumesFromMesh;
    } else {
        surfaceTile.boundingVolumeSourceTile = undefined;
        surfaceTile.boundingVolumeIsFromMesh = false;
    }
}

const boundingSphereScratch = new BoundingSphere();
const rectangleIntersectionScratch = new Rectangle();
const splitCartographicLimitRectangleScratch = new Rectangle();
const rectangleCenterScratch = new Cartographic();

// cartographicLimitRectangle may span the IDL, but tiles never will.
function clipRectangleAntimeridian (tileRectangle:Rectangle, cartographicLimitRectangle:Rectangle):Rectangle {
    if (cartographicLimitRectangle.west < cartographicLimitRectangle.east) {
        return cartographicLimitRectangle;
    }
    const splitRectangle = Rectangle.clone(
        cartographicLimitRectangle,
        splitCartographicLimitRectangleScratch
    ) as Rectangle;
    const tileCenter = Rectangle.center(tileRectangle, rectangleCenterScratch);
    if (tileCenter.longitude > 0.0) {
        splitRectangle.east = CesiumMath.PI;
    } else {
        splitRectangle.west = -CesiumMath.PI;
    }
    return splitRectangle;
}

function isUndergroundVisible (tileProvider:GlobeSurfaceTileProvider, frameState: FrameState): boolean {
    // if (frameState.cameraUnderground) {
    //     return true;
    // }

    // if (frameState.globeTranslucencyState.translucent) {
    //     return true;
    // }

    // if (tileProvider.backFaceCulling) {
    //     return false;
    // }

    // const clippingPlanes = tileProvider._clippingPlanes;
    // if (defined(clippingPlanes) && clippingPlanes.enabled) {
    //     return true;
    // }

    if (!Rectangle.equals(tileProvider.cartographicLimitRectangle, Rectangle.MAX_VALUE)) {
        return true;
    }

    return false;
}

const otherPassesInitialColor = new Cartesian4(0.0, 0.0, 0.0, 0.0);
const modifiedModelViewScratch = new CesiumMatrix4();
const modifiedModelViewProjectionScratch = new CesiumMatrix4();
const tileRectangleScratch = new Vector4();
const localizedCartographicLimitRectangleScratch = new Cartesian4();
const localizedTranslucencyRectangleScratch = new Cartesian4();
const rtcScratch = new Cartesian3();
const centerEyeScratch = new Cartesian3();
const southwestScratch = new Cartesian3();
const northeastScratch = new Cartesian3();

const surfaceShaderSetOptionsScratch: any = {
    frameState: undefined,
    surfaceTile: undefined,
    numberOfDayTextures: undefined,
    applyBrightness: undefined,
    applyContrast: undefined,
    applyHue: undefined,
    applySaturation: undefined,
    applyGamma: undefined,
    applyAlpha: undefined,
    applyDayNightAlpha: undefined,
    applySplit: undefined,
    showReflectiveOcean: undefined,
    showOceanWaves: undefined,
    enableLighting: undefined,
    dynamicAtmosphereLighting: undefined,
    dynamicAtmosphereLightingFromSun: undefined,
    showGroundAtmosphere: undefined,
    perFragmentGroundAtmosphere: undefined,
    hasVertexNormals: undefined,
    useWebMercatorProjection: undefined,
    enableFog: undefined,
    enableClippingPlanes: undefined,
    clippingPlanes: undefined,
    clippedByBoundaries: undefined,
    hasImageryLayerCutout: undefined,
    colorCorrect: undefined,
    colorToAlpha: undefined,
    hasGeodeticSurfaceNormals: undefined,
    hasExaggeration: undefined
};

function sortTileImageryByLayerIndex (a: any, b: any) {
    let aImagery = a.loadingImagery;
    if (!defined(aImagery)) {
        aImagery = a.readyImagery;
    }

    let bImagery = b.loadingImagery;
    if (!defined(bImagery)) {
        bImagery = b.readyImagery;
    }

    return aImagery.imageryLayer._layerIndex - bImagery.imageryLayer._layerIndex;
}

const createMaterialMap = (frameState: FrameState, tileProvider: any, surfaceShaderSetOptions: any, quantization: TerrainQuantization): TileMaterial => {
    const material = new TileMaterial({
        // side: DoubleSide
        // wireframe: true
        // depthTest: false
    }, surfaceShaderSetOptions);
    material.defines.INCLUDE_WEB_MERCATOR_Y = '';
    if (quantization === TerrainQuantization.NONE) {
        return material;
    }

    material.defines.QUANTIZATION_BITS12 = '';

    return material;
};

const setUniform = (command: DrawMeshCommand, uniformMap: any, globeSurfaceMaterial: any) => {
    const properties = uniformMap.properties;

    const material = command.material as GlobeSurfaceTileMaterial;

    const uniforms = globeSurfaceMaterial.uniforms;

    uniforms.u_backFaceAlphaByDistance.value = uniformMap.u_backFaceAlphaByDistance();
    uniforms.u_center3D.value = uniformMap.u_center3D();
    // uniforms.clippingPlanesEdgeColor.value = uniformMap.u_clippingPlanesEdgeColor;
    // uniforms.clippingPlanesEdgeWidth.value = uniformMap.u_clippingPlanesEdgeWidth;
    uniforms.u_colorsToAlpha.value = uniformMap.u_colorsToAlpha();
    uniforms.u_dayIntensity.value = uniformMap.u_dayIntensity();
    uniforms.u_dayTextureAlpha.value = uniformMap.u_dayTextureAlpha();
    uniforms.u_dayTextureBrightness.value = uniformMap.u_dayTextureBrightness();
    uniforms.u_dayTextureContrast.value = uniformMap.u_dayTextureContrast();
    uniforms.u_dayTextureCutoutRectangles.value = uniformMap.u_dayTextureCutoutRectangles();
    uniforms.u_dayTextureDayAlpha.value = uniformMap.u_dayTextureDayAlpha();
    uniforms.u_dayTextureHue.value = uniformMap.u_dayTextureHue();
    uniforms.u_dayTextureNightAlpha.value = uniformMap.u_dayTextureNightAlpha();
    uniforms.u_dayTextureOneOverGamma.value = uniformMap.u_dayTextureOneOverGamma();
    uniforms.u_dayTextureSaturation.value = uniformMap.u_dayTextureSaturation();
    uniforms.u_dayTextureSplit.value = uniformMap.u_dayTextureSplit();
    uniforms.u_dayTextureTexCoordsRectangle.value = uniformMap.u_dayTextureTexCoordsRectangle();
    uniforms.u_dayTextureTranslationAndScale.value = uniformMap.u_dayTextureTranslationAndScale();
    uniforms.u_dayTextureUseWebMercatorT.value = uniformMap.u_dayTextureUseWebMercatorT();
    uniforms.u_dayTextures.value = uniformMap.u_dayTextures();
    uniforms.u_fillHighlightColor.value = uniformMap.u_fillHighlightColor();
    uniforms.u_frontFaceAlphaByDistance.value = uniformMap.u_frontFaceAlphaByDistance();
    uniforms.u_hsbShift.value = uniformMap.u_hsbShift();
    uniforms.u_initialColor.value = uniformMap.u_initialColor();
    uniforms.u_lightingFadeDistance.value = uniformMap.u_lightingFadeDistance();
    uniforms.u_localizedCartographicLimitRectangle.value = uniformMap.u_cartographicLimitRectangle();
    uniforms.u_localizedTranslucencyRectangle.value = uniformMap.u_translucencyRectangle();
    uniforms.u_minMaxHeight.value = uniformMap.u_minMaxHeight();
    uniforms.u_modifiedModelView.value = uniformMap.u_modifiedModelView();
    uniforms.u_modifiedModelViewProjection.value = uniformMap.u_modifiedModelViewProjection();
    uniforms.u_nightFadeDistance.value = uniformMap.u_nightFadeDistance();
    uniforms.u_oceanNormalMap.value = uniformMap.u_oceanNormalMap();
    uniforms.u_scaleAndBias.value = uniformMap.u_scaleAndBias();
    uniforms.u_southAndNorthLatitude.value = uniformMap.u_southAndNorthLatitude();
    uniforms.u_southMercatorYAndOneOverHeight.value = uniformMap.u_southMercatorYAndOneOverHeight();
    uniforms.u_terrainExaggerationAndRelativeHeight.value = uniformMap.u_terrainExaggerationAndRelativeHeight();
    uniforms.u_tileRectangle.value = uniformMap.u_tileRectangle();
    uniforms.u_undergroundColor.value = uniformMap.u_undergroundColor();
    uniforms.u_undergroundColorAlphaByDistance.value = uniformMap.u_undergroundColorAlphaByDistance();
    uniforms.u_waterMask.value = uniformMap.u_waterMask();
    uniforms.u_waterMaskTranslationAndScale.value = uniformMap.u_waterMaskTranslationAndScale();
    uniforms.u_zoomedOutOceanSpecularIntensity.value = uniformMap.u_zoomedOutOceanSpecularIntensity();
};

const createTileUniformMap = (frameState: FrameState, globeSurfaceTileProvider: GlobeSurfaceTileProvider) => {
    const uniformMap = {
        u_initialColor: function () {
            return this.properties.initialColor;
        },
        u_fillHighlightColor: function () {
            return this.properties.fillHighlightColor;
        },
        u_zoomedOutOceanSpecularIntensity: function () {
            return this.properties.zoomedOutOceanSpecularIntensity;
        },
        u_oceanNormalMap: function () {
            return this.properties.oceanNormalMap;
        },
        u_lightingFadeDistance: function () {
            return this.properties.lightingFadeDistance;
        },
        u_nightFadeDistance: function () {
            return this.properties.nightFadeDistance;
        },
        u_center3D: function () {
            return this.properties.center3D;
        },
        u_terrainExaggerationAndRelativeHeight: function () {
            return this.properties.terrainExaggerationAndRelativeHeight;
        },
        u_tileRectangle: function () {
            return this.properties.tileRectangle;
        },
        u_modifiedModelView: function () {
            const viewMatrix = frameState.camera.viewMatrix;
            const centerEye = CesiumMatrix4.multiplyByPoint(
                viewMatrix,
                this.properties.rtc,
                centerEyeScratch
            );
            CesiumMatrix4.setTranslation(viewMatrix, centerEye, modifiedModelViewScratch);

            CesiumMatrix4.transformToThreeMatrix4(modifiedModelViewScratch, this.properties_three.modifiedModelView);
            return this.properties_three.modifiedModelView;
        },
        u_modifiedModelViewProjection: function () {
            const viewMatrix = frameState.camera.viewMatrix;
            const projectionMatrix = frameState.camera.frustum.cesiumProjectMatrix;
            const centerEye = CesiumMatrix4.multiplyByPoint(
                viewMatrix,
                this.properties.rtc,
                centerEyeScratch
            );
            CesiumMatrix4.setTranslation(
                viewMatrix,
                centerEye,
                modifiedModelViewProjectionScratch
            );
            CesiumMatrix4.multiply(
                projectionMatrix,
                modifiedModelViewProjectionScratch,
                modifiedModelViewProjectionScratch
            );

            CesiumMatrix4.transformToThreeMatrix4(modifiedModelViewProjectionScratch, this.properties_three.modifiedModelViewProjection);
            return this.properties_three.modifiedModelViewProjection;
        },
        u_dayTextures: function () {
            return this.properties.dayTextures;
        },
        u_dayTextureTranslationAndScale: function () {
            return this.properties.dayTextureTranslationAndScale;
        },
        u_dayTextureTexCoordsRectangle: function () {
            return this.properties.dayTextureTexCoordsRectangle;
        },
        u_dayTextureUseWebMercatorT: function () {
            return this.properties.dayTextureUseWebMercatorT;
        },
        u_dayTextureAlpha: function () {
            return this.properties.dayTextureAlpha;
        },
        u_dayTextureNightAlpha: function () {
            return this.properties.dayTextureNightAlpha;
        },
        u_dayTextureDayAlpha: function () {
            return this.properties.dayTextureDayAlpha;
        },
        u_dayTextureBrightness: function () {
            return this.properties.dayTextureBrightness;
        },
        u_dayTextureContrast: function () {
            return this.properties.dayTextureContrast;
        },
        u_dayTextureHue: function () {
            return this.properties.dayTextureHue;
        },
        u_dayTextureSaturation: function () {
            return this.properties.dayTextureSaturation;
        },
        u_dayTextureOneOverGamma: function () {
            return this.properties.dayTextureOneOverGamma;
        },
        u_dayIntensity: function () {
            return this.properties.dayIntensity;
        },
        u_southAndNorthLatitude: function () {
            return this.properties.southAndNorthLatitude;
        },
        u_southMercatorYAndOneOverHeight: function () {
            return this.properties.southMercatorYAndOneOverHeight;
        },
        u_waterMask: function () {
            return this.properties.waterMask;
        },
        u_waterMaskTranslationAndScale: function () {
            return this.properties.waterMaskTranslationAndScale;
        },
        u_minMaxHeight: function () {
            return this.properties.minMaxHeight;
        },
        u_scaleAndBias: function () {
            return this.properties.scaleAndBias;
        },
        u_dayTextureSplit: function () {
            return this.properties.dayTextureSplit;
        },
        u_dayTextureCutoutRectangles: function () {
            return this.properties.dayTextureCutoutRectangles;
        },
        // u_clippingPlanes: function () {
        //     const clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
        //     if (defined(clippingPlanes) && defined(clippingPlanes.texture)) {
        //         // Check in case clippingPlanes hasn't been updated yet.
        //         return clippingPlanes.texture;
        //     }
        //     return frameState.context.defaultTexture;
        // },
        u_cartographicLimitRectangle: function () {
            return this.properties.localizedCartographicLimitRectangle;
        },
        // u_clippingPlanesMatrix: function () {
        //     const clippingPlanes = globeSurfaceTileProvider._clippingPlanes;
        //     const transform = defined(clippingPlanes)
        //         ? Matrix4.multiply(
        //             frameState.context.uniformState.view,
        //             clippingPlanes.modelMatrix,
        //             scratchClippingPlanesMatrix
        //         )
        //         : Matrix4.IDENTITY;

        //     return Matrix4.inverseTranspose(
        //         transform,
        //         scratchInverseTransposeClippingPlanesMatrix
        //     );
        // },
        // u_clippingPlanesEdgeStyle: function () {
        //     const style = this.properties.clippingPlanesEdgeColor;
        //     style.alpha = this.properties.clippingPlanesEdgeWidth;
        //     return style;
        // },
        u_minimumBrightness: function () {
            return frameState.fog.minimumBrightness;
        },
        u_hsbShift: function () {
            return this.properties.hsbShift;
        },
        u_colorsToAlpha: function () {
            return this.properties.colorsToAlpha;
        },
        u_frontFaceAlphaByDistance: function () {
            return this.properties.frontFaceAlphaByDistance;
        },
        u_backFaceAlphaByDistance: function () {
            return this.properties.backFaceAlphaByDistance;
        },
        u_translucencyRectangle: function () {
            return this.properties.localizedTranslucencyRectangle;
        },
        u_undergroundColor: function () {
            const undergroundColor = this.properties.undergroundColor;
            this.properties_three.undergroundColor.set(undergroundColor.red, undergroundColor.green, undergroundColor.blue, undergroundColor.alpha);
            return this.properties_three.undergroundColor;
        },
        u_undergroundColorAlphaByDistance: function () {
            return this.properties.undergroundColorAlphaByDistance;
        },

        // make a separate object so that changes to the properties are seen on
        // derived commands that combine another uniform map with this one.
        properties: {
            initialColor: new Vector4(0.0, 0.0, 0.5, 1.0),
            fillHighlightColor: new Vector4(0.0, 0.0, 0.0, 0.0),
            zoomedOutOceanSpecularIntensity: 0.5,
            oceanNormalMap: undefined,
            lightingFadeDistance: new Vector2(6500000.0, 9000000.0),
            nightFadeDistance: new Vector2(10000000.0, 40000000.0),
            hsbShift: new Vector3(),

            center3D: new Vector3(),
            rtc: new Cartesian3(),
            modifiedModelView: new CesiumMatrix4(),
            tileRectangle: new Vector4(),

            terrainExaggerationAndRelativeHeight: new Vector2(1.0, 0.0),

            dayTextures: [],
            dayTextureTranslationAndScale: [],
            dayTextureTexCoordsRectangle: [],
            dayTextureUseWebMercatorT: [],
            dayTextureAlpha: [],
            dayTextureNightAlpha: [],
            dayTextureDayAlpha: [],
            dayTextureBrightness: [],
            dayTextureContrast: [],
            dayTextureHue: [],
            dayTextureSaturation: [],
            dayTextureOneOverGamma: [],
            dayTextureSplit: [],
            dayTextureCutoutRectangles: [],
            dayIntensity: 0.0,
            colorsToAlpha: [],

            southAndNorthLatitude: new Vector2(),
            southMercatorYAndOneOverHeight: new Vector2(),

            waterMask: undefined,
            waterMaskTranslationAndScale: new Vector4(),

            minMaxHeight: new Vector2(),
            scaleAndBias: new Matrix4(),
            // clippingPlanesEdgeColor: CesiumColor.clone(CesiumColor.WHITE),
            clippingPlanesEdgeWidth: 0.0,

            localizedCartographicLimitRectangle: new Vector4(),

            frontFaceAlphaByDistance: new Vector4(),
            backFaceAlphaByDistance: new Vector4(),
            localizedTranslucencyRectangle: new Vector4(),
            undergroundColor: CesiumColor.clone(CesiumColor.TRANSPARENT),
            undergroundColorAlphaByDistance: new Vector4()
        },
        properties_three: {
            undergroundColor: new Vector4(),
            modifiedModelView: new Matrix4(),
            modifiedModelViewProjection: new Matrix4()
        }
    };

    if (defined(globeSurfaceTileProvider.materialUniformMap)) {
        return combine(uniformMap, globeSurfaceTileProvider.materialUniformMap);
    }

    return uniformMap;
};

// function updateCredits (surface: GlobeSurfaceTileProvider, frameState: FrameState) {
//     const creditDisplay = frameState.creditDisplay;
//     if (
//         surface._terrainProvider.ready &&
//       defined(surface._terrainProvider.credit)
//     ) {
//         creditDisplay.addCredit(surface._terrainProvider.credit);
//     }

//     const imageryLayers = surface._imageryLayers;
//     for (let i = 0, len = imageryLayers.length; i < len; ++i) {
//         const imageryProvider = imageryLayers.get(i).imageryProvider;
//         if (imageryProvider.ready && defined(imageryProvider.credit)) {
//             creditDisplay.addCredit(imageryProvider.credit);
//         }
//     }
// }

const defaultUndergroundColor = CesiumColor.TRANSPARENT;
const defaultundergroundColorAlphaByDistance = new NearFarScalar();

const addDrawCommandsForTile = (tileProvider: GlobeSurfaceTileProvider, tile: any, frameState: FrameState) => {
    const surfaceTile = tile.data;

    if (!defined(surfaceTile.vertexArray)) {
        if (surfaceTile.fill === undefined) {
            // No fill was created for this tile, probably because this tile is not connected to
            // any renderable tiles. So create a simple tile in the middle of the tile's possible
            // height range.
            surfaceTile.fill = new (TerrainFillMesh as any)(tile);
        }
        surfaceTile.fill.update(tileProvider, frameState);
    }

    let maxTextures = ContextLimits.maximumTextureImageUnits;

    let waterMaskTexture = surfaceTile.waterMaskTexture;
    let waterMaskTranslationAndScale = surfaceTile.waterMaskTranslationAndScale;
    if (!defined(waterMaskTexture) && defined(surfaceTile.fill)) {
        waterMaskTexture = surfaceTile.fill.waterMaskTexture;
        waterMaskTranslationAndScale =
        surfaceTile.fill.waterMaskTranslationAndScale;
    }

    const cameraUnderground = frameState.cameraUnderground;

    const globeTranslucencyState = frameState.globeTranslucencyState as GlobeTranslucencyState;
    const translucent = globeTranslucencyState.translucent;
    const frontFaceAlphaByDistance =
      globeTranslucencyState.frontFaceAlphaByDistance;
    const backFaceAlphaByDistance = globeTranslucencyState.backFaceAlphaByDistance;
    const translucencyRectangle = globeTranslucencyState.rectangle;

    const undergroundColor = defaultValue(
        tileProvider.undergroundColor,
        defaultUndergroundColor
    ) as CesiumColor;
    const undergroundColorAlphaByDistance = defaultValue(
        tileProvider.undergroundColorAlphaByDistance,
        defaultundergroundColorAlphaByDistance
    ) as NearFarScalar;
    const showUndergroundColor =
        isUndergroundVisible(tileProvider, frameState) &&
        frameState.mode === SceneMode.SCENE3D &&
        undergroundColor.alpha > 0.0 &&
        (undergroundColorAlphaByDistance.nearValue > 0.0 ||
          undergroundColorAlphaByDistance.farValue > 0.0);

    const showReflectiveOcean = tileProvider.hasWaterMask && defined(waterMaskTexture);
    const oceanNormalMap = tileProvider.oceanNormalMap;
    const showOceanWaves = showReflectiveOcean && defined(oceanNormalMap);
    const hasVertexNormals =
        tileProvider.terrainProvider.ready &&
        tileProvider.terrainProvider.hasVertexNormals;
    const enableFog = frameState.fog.enabled && !cameraUnderground;
    const showGroundAtmosphere =
        tileProvider.showGroundAtmosphere && frameState.mode === SceneMode.SCENE3D;
    const castShadows =
        ShadowMode.castShadows(tileProvider.shadows) && !translucent;
    const receiveShadows =
        ShadowMode.receiveShadows(tileProvider.shadows) && !translucent;

    const hueShift = tileProvider.hueShift;
    const saturationShift = tileProvider.saturationShift;
    const brightnessShift = tileProvider.brightnessShift;

    let colorCorrect = !(
        CesiumMath.equalsEpsilon(hueShift, 0.0, CesiumMath.EPSILON7) &&
        CesiumMath.equalsEpsilon(saturationShift, 0.0, CesiumMath.EPSILON7) &&
        CesiumMath.equalsEpsilon(brightnessShift, 0.0, CesiumMath.EPSILON7)
    );

    let perFragmentGroundAtmosphere = false;
    if (showGroundAtmosphere) {
        const cameraDistance = Cartesian3.magnitude(frameState.camera.positionWC);
        const fadeOutDistance = tileProvider.nightFadeOutDistance;
        perFragmentGroundAtmosphere = cameraDistance > fadeOutDistance;
    }

    if (showReflectiveOcean) {
        --maxTextures;
    }
    if (showOceanWaves) {
        --maxTextures;
    }
    if (
        defined(frameState.shadowState) &&
        frameState.shadowState.shadowsEnabled
    ) {
        --maxTextures;
    }
    // if (
    //     defined(tileProvider.clippingPlanes) &&
    //     tileProvider.clippingPlanes.enabled
    // ) {
    //     --maxTextures;
    // }

    maxTextures -= globeTranslucencyState.numberOfTextureUniforms;

    const mesh = surfaceTile.renderedMesh;
    const rtc = mesh.center;
    const encoding = mesh.encoding;
    const tileBoundingRegion = surfaceTile.tileBoundingRegion;

    const exaggeration = frameState.terrainExaggeration;
    const exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
    const hasExaggeration = exaggeration !== 1.0;
    const hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;
    // Not used in 3D.
    const tileRectangle = tileRectangleScratch;

    // Only used for Mercator projections.
    const southLatitude = 0.0;
    const northLatitude = 0.0;
    const southMercatorY = 0.0;
    const oneOverMercatorHeight = 0.0;

    const useWebMercatorProjection = false;

    const surfaceShaderSetOptions = surfaceShaderSetOptionsScratch;
    surfaceShaderSetOptions.frameState = frameState;
    surfaceShaderSetOptions.surfaceTile = surfaceTile;
    surfaceShaderSetOptions.showReflectiveOcean = showReflectiveOcean;
    surfaceShaderSetOptions.showOceanWaves = showOceanWaves;
    surfaceShaderSetOptions.enableLighting = tileProvider.enableLighting;
    surfaceShaderSetOptions.dynamicAtmosphereLighting =
        tileProvider.dynamicAtmosphereLighting;
    surfaceShaderSetOptions.dynamicAtmosphereLightingFromSun =
        tileProvider.dynamicAtmosphereLightingFromSun;
    surfaceShaderSetOptions.showGroundAtmosphere = showGroundAtmosphere;
    surfaceShaderSetOptions.perFragmentGroundAtmosphere = perFragmentGroundAtmosphere;
    surfaceShaderSetOptions.hasVertexNormals = hasVertexNormals;
    surfaceShaderSetOptions.useWebMercatorProjection = useWebMercatorProjection;
    surfaceShaderSetOptions.clippedByBoundaries = surfaceTile.clippedByBoundaries;
    surfaceShaderSetOptions.hasGeodeticSurfaceNormals = hasGeodeticSurfaceNormals;
    surfaceShaderSetOptions.hasExaggeration = hasExaggeration;

    const quantization = encoding.quantization;

    const tileImageryCollection = surfaceTile.imagery;
    let imageryIndex = 0;
    const imageryLen = tileImageryCollection.length;

    const showSkirts =
    tileProvider.showSkirts && !cameraUnderground && !translucent;
    const backFaceCulling =
    tileProvider.backFaceCulling && !cameraUnderground && !translucent;
    // const firstPassRenderState = backFaceCulling
    //     ? tileProvider._renderState
    //     : tileProvider._disableCullingRenderState;
    // const otherPassesRenderState = backFaceCulling
    //     ? tileProvider._blendRenderState
    //     : tileProvider._disableCullingBlendRenderState;
    // const renderState = firstPassRenderState;

    let initialColor = tileProvider._firstPassInitialColor;

    const context = frameState.context;

    const materialUniformMapChanged =
        tileProvider._materialUniformMap !== tileProvider.materialUniformMap;
    if (materialUniformMapChanged) {
        tileProvider._materialUniformMap = tileProvider.materialUniformMap;
        const drawCommandsLength = tileProvider._drawCommands.length;
        for (let i = 0; i < drawCommandsLength; ++i) {
            // tileProvider._uniformMaps[i] = createTileUniformMap(
            //     frameState,
            //     tileProvider
            // );
        }
    }

    do {
        let numberOfDayTextures = 0;

        let command: DrawMeshCommand;
        let material: TileMaterial;

        let globeSurfaceMaterial: GlobeSurfaceTileMaterial;

        let uniformMap: any;

        const dayTextures = [];
        const dayTextureTranslationAndScale = [];
        const dayTextureTexCoordsRectangle = [];
        while (numberOfDayTextures < maxTextures && imageryIndex < imageryLen) {
            const tileImagery = tileImageryCollection[imageryIndex];
            const imagery = tileImagery.readyImagery;
            ++imageryIndex;

            if (!defined(imagery)) {
                continue;
            }

            const texture = tileImagery.useWebMercatorT
                ? imagery.textureWebMercator
                : imagery.texture;

            const imageryLayer = imagery.imageryLayer;

            if (!defined(tileImagery.textureTranslationAndScale)) {
                tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, tileImagery);
            }

            dayTextures[numberOfDayTextures] = texture;
            dayTextureTranslationAndScale[numberOfDayTextures] = tileImagery.textureTranslationAndScale;
            dayTextureTexCoordsRectangle[numberOfDayTextures] = tileImagery.textureCoordinateRectangle;

            ++numberOfDayTextures;
        }

        surfaceShaderSetOptions.numberOfDayTextures = dayTextures.length;

        if (tileProvider._drawCommands.length <= tileProvider._usedDrawCommands) {
            command = new DrawMeshCommand();
            command.owner = tile;
            command.frustumCulled = false;
            command.boundingVolume = new BoundingSphere();
            command.orientedBoundingBox = undefined;

            material = createMaterialMap(frameState, tileProvider, surfaceShaderSetOptions, quantization);

            uniformMap = createTileUniformMap(frameState, tileProvider);

            globeSurfaceMaterial = new GlobeSurfaceTileMaterial();

            tileProvider._drawCommands.push(command);
            tileProvider._materialMaps.push(material);
            tileProvider._uniformMaps.push(globeSurfaceMaterial);
        } else {
            command = tileProvider._drawCommands[tileProvider._usedDrawCommands];
            material = tileProvider._materialMaps[tileProvider._usedDrawCommands];

            globeSurfaceMaterial = tileProvider._uniformMaps[tileProvider._usedDrawCommands];

            uniformMap = createTileUniformMap(frameState, tileProvider);
        }

        if (material.defines.TEXTURE_UNITS !== material.dayTextures.length ||
            imageryLen !== material.dayTextures.length ||
            quantization === TerrainQuantization.BITS12 && !defined(material.defines.QUANTIZATION_BITS12) ||
            quantization === TerrainQuantization.NONE && defined(material.defines.QUANTIZATION_BITS12)
        ) {
            material.dispose();
            material = createMaterialMap(frameState, tileProvider, surfaceShaderSetOptions, quantization);

            globeSurfaceMaterial.dispose();
            uniformMap = createTileUniformMap(frameState, tileProvider);
            globeSurfaceMaterial = new GlobeSurfaceTileMaterial();
        }

        command.owner = tile;
        ++tileProvider._usedDrawCommands;

        material.dayTextures = dayTextures;
        material.dayTextureTranslationAndScale = dayTextureTranslationAndScale;
        material.dayTextureTexCoordsRectangle = dayTextureTexCoordsRectangle;
        Cartesian4.clone(initialColor, material.initialColor);

        const viewMatrix = frameState.camera.viewMatrix;
        const projectionMatrix = frameState.camera.frustum.cesiumProjectMatrix;
        const centerEye = CesiumMatrix4.multiplyByPoint(
            viewMatrix,
            rtc,
            centerEyeScratch
        );
        CesiumMatrix4.setTranslation(
            viewMatrix,
            centerEye,
            modifiedModelViewProjectionScratch
        );
        CesiumMatrix4.multiply(
            projectionMatrix,
            modifiedModelViewProjectionScratch,
            modifiedModelViewProjectionScratch
        );

        CesiumMatrix4.transformToThreeMatrix4(modifiedModelViewProjectionScratch, material.modifiedModelViewProjectionScratch);

        material.tileRectangle = tileRectangle;

        material.minMaxHeight.x = encoding.minimumHeight;
        material.minMaxHeight.y = encoding.maximumHeight;

        material.scaleAndBias = encoding.threeMatrix4;

        const uniformMapProperties = uniformMap.properties;
        Cartesian4.clone(initialColor, uniformMapProperties.initialColor);
        uniformMapProperties.oceanNormalMap = oceanNormalMap;
        uniformMapProperties.lightingFadeDistance.x =
          tileProvider.lightingFadeOutDistance;
        uniformMapProperties.lightingFadeDistance.y =
          tileProvider.lightingFadeInDistance;
        uniformMapProperties.nightFadeDistance.x =
          tileProvider.nightFadeOutDistance;
        uniformMapProperties.nightFadeDistance.y = tileProvider.nightFadeInDistance;
        uniformMapProperties.zoomedOutOceanSpecularIntensity =
          tileProvider.zoomedOutOceanSpecularIntensity;

        const frontFaceAlphaByDistanceFinal = cameraUnderground
            ? backFaceAlphaByDistance
            : frontFaceAlphaByDistance;
        const backFaceAlphaByDistanceFinal = cameraUnderground
            ? frontFaceAlphaByDistance
            : backFaceAlphaByDistance;

        if (defined(frontFaceAlphaByDistanceFinal)) {
            Cartesian4.fromElements(
                frontFaceAlphaByDistanceFinal.near,
                frontFaceAlphaByDistanceFinal.nearValue,
                frontFaceAlphaByDistanceFinal.far,
                frontFaceAlphaByDistanceFinal.farValue,
                uniformMapProperties.frontFaceAlphaByDistance
            );
            Cartesian4.fromElements(
                backFaceAlphaByDistanceFinal.near,
                backFaceAlphaByDistanceFinal.nearValue,
                backFaceAlphaByDistanceFinal.far,
                backFaceAlphaByDistanceFinal.farValue,
                uniformMapProperties.backFaceAlphaByDistance
            );
        }

        Cartesian4.fromElements(
            undergroundColorAlphaByDistance.near,
            undergroundColorAlphaByDistance.nearValue,
            undergroundColorAlphaByDistance.far,
            undergroundColorAlphaByDistance.farValue,
            uniformMapProperties.undergroundColorAlphaByDistance
        );
        CesiumColor.clone(undergroundColor, uniformMapProperties.undergroundColor);

        const highlightFillTile =
          !defined(surfaceTile.vertexArray) &&
          defined(tileProvider.fillHighlightColor) &&
          (tileProvider.fillHighlightColor as CesiumColor).alpha > 0.0;
        if (highlightFillTile) {
            CesiumColor.clone(
                (tileProvider.fillHighlightColor as CesiumColor),
                uniformMapProperties.fillHighlightColor
            );
        }

        uniformMapProperties.terrainExaggerationAndRelativeHeight.x = exaggeration;
        uniformMapProperties.terrainExaggerationAndRelativeHeight.y = exaggerationRelativeHeight;

        uniformMapProperties.center3D.set(mesh.center.x, mesh.center.y, mesh.center.z);
        Cartesian3.clone(rtc, uniformMapProperties.rtc);

        Cartesian4.clone(tileRectangle, uniformMapProperties.tileRectangle);
        uniformMapProperties.southAndNorthLatitude.x = southLatitude;
        uniformMapProperties.southAndNorthLatitude.y = northLatitude;
        uniformMapProperties.southMercatorYAndOneOverHeight.x = southMercatorY;
        uniformMapProperties.southMercatorYAndOneOverHeight.y = oneOverMercatorHeight;

        // Convert tile limiter rectangle from cartographic to texture space using the tileRectangle.
        const localizedCartographicLimitRectangle = localizedCartographicLimitRectangleScratch;
        const cartographicLimitRectangle = clipRectangleAntimeridian(
            tile.rectangle,
            tileProvider.cartographicLimitRectangle
        );

        const localizedTranslucencyRectangle = localizedTranslucencyRectangleScratch;
        const clippedTranslucencyRectangle = clipRectangleAntimeridian(
            tile.rectangle,
            translucencyRectangle
        );

        Cartesian3.fromElements(
            hueShift,
            saturationShift,
            brightnessShift,
            uniformMapProperties.hsbShift
        );

        const cartographicTileRectangle = tile.rectangle;
        const inverseTileWidth = 1.0 / cartographicTileRectangle.width;
        const inverseTileHeight = 1.0 / cartographicTileRectangle.height;
        localizedCartographicLimitRectangle.x =
          (cartographicLimitRectangle.west - cartographicTileRectangle.west) *
          inverseTileWidth;
        localizedCartographicLimitRectangle.y =
          (cartographicLimitRectangle.south - cartographicTileRectangle.south) *
          inverseTileHeight;
        localizedCartographicLimitRectangle.z =
          (cartographicLimitRectangle.east - cartographicTileRectangle.west) *
          inverseTileWidth;
        localizedCartographicLimitRectangle.w =
          (cartographicLimitRectangle.north - cartographicTileRectangle.south) *
          inverseTileHeight;

        Cartesian4.clone(
            localizedCartographicLimitRectangle,
            uniformMapProperties.localizedCartographicLimitRectangle
        );

        localizedTranslucencyRectangle.x =
          (clippedTranslucencyRectangle.west - cartographicTileRectangle.west) *
          inverseTileWidth;
        localizedTranslucencyRectangle.y =
          (clippedTranslucencyRectangle.south - cartographicTileRectangle.south) *
          inverseTileHeight;
        localizedTranslucencyRectangle.z =
          (clippedTranslucencyRectangle.east - cartographicTileRectangle.west) *
          inverseTileWidth;
        localizedTranslucencyRectangle.w =
          (clippedTranslucencyRectangle.north - cartographicTileRectangle.south) *
          inverseTileHeight;

        Cartesian4.clone(
            localizedTranslucencyRectangle,
            uniformMapProperties.localizedTranslucencyRectangle
        );

        // For performance, use fog in the shader only when the tile is in fog.
        const applyFog =
          enableFog &&
          CesiumMath.fog(tile._distance, frameState.fog.density) >
            CesiumMath.EPSILON3;
        colorCorrect = colorCorrect && (applyFog || showGroundAtmosphere);

        let applyBrightness = false;
        let applyContrast = false;
        let applyHue = false;
        let applySaturation = false;
        let applyGamma = false;
        let applyAlpha = false;
        let applyDayNightAlpha = false;
        let applySplit = false;
        let applyCutout = false;
        let applyColorToAlpha = false;

        let numberOfDayTextures2 = 0;
        let imageryIndex2 = 0;

        while (numberOfDayTextures2 < maxTextures && imageryIndex2 < imageryLen) {
            const tileImagery = tileImageryCollection[imageryIndex2];
            const imagery = tileImagery.readyImagery;
            ++imageryIndex2;

            if (!defined(imagery) || imagery.imageryLayer.alpha === 0.0) {
                continue;
            }

            const texture = tileImagery.useWebMercatorT
                ? imagery.textureWebMercator
                : imagery.texture;

            // >>includeStart('debug', pragmas.debug);
            if (!defined(texture)) {
                // Our "ready" texture isn't actually ready.  This should never happen.
                //
                // Side note: It IS possible for it to not be in the READY ImageryState, though.
                // This can happen when a single imagery tile is shared by two terrain tiles (common)
                // and one of them (A) needs a geographic version of the tile because it is near the poles,
                // and the other (B) does not.  B can and will transition the imagery tile to the READY state
                // without reprojecting to geographic.  Then, later, A will deem that same tile not-ready-yet
                // because it only has the Web Mercator texture, and flip it back to the TRANSITIONING state.
                // The imagery tile won't be in the READY state anymore, but it's still READY enough for B's
                // purposes.
                throw new DeveloperError('readyImagery is not actually ready!');
            }
            // >>includeEnd('debug');

            const imageryLayer = imagery.imageryLayer;

            if (!defined(tileImagery.textureTranslationAndScale)) {
                tileImagery.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(
                    tile,
                    tileImagery
                );
            }

            uniformMapProperties.dayTextures[numberOfDayTextures2] = texture;
            uniformMapProperties.dayTextureTranslationAndScale[numberOfDayTextures2] =
              tileImagery.textureTranslationAndScale_vector4;
            uniformMapProperties.dayTextureTexCoordsRectangle[numberOfDayTextures2] =
              tileImagery.textureCoordinateRectangle_vector4;
            uniformMapProperties.dayTextureUseWebMercatorT[numberOfDayTextures2] =
              tileImagery.useWebMercatorT;

            uniformMapProperties.dayTextureAlpha[numberOfDayTextures2] =
              imageryLayer.alpha;
            applyAlpha =
              applyAlpha ||
              uniformMapProperties.dayTextureAlpha[numberOfDayTextures2] !== 1.0;

            uniformMapProperties.dayTextureNightAlpha[numberOfDayTextures2] =
              imageryLayer.nightAlpha;
            applyDayNightAlpha =
              applyDayNightAlpha ||
              uniformMapProperties.dayTextureNightAlpha[numberOfDayTextures2] !== 1.0;

            uniformMapProperties.dayTextureDayAlpha[numberOfDayTextures2] =
              imageryLayer.dayAlpha;
            applyDayNightAlpha =
              applyDayNightAlpha ||
              uniformMapProperties.dayTextureDayAlpha[numberOfDayTextures2] !== 1.0;

            uniformMapProperties.dayTextureBrightness[numberOfDayTextures2] =
              imageryLayer.brightness;
            applyBrightness =
              applyBrightness ||
              uniformMapProperties.dayTextureBrightness[numberOfDayTextures2] !==
                ImageryLayer.DEFAULT_BRIGHTNESS;

            uniformMapProperties.dayTextureContrast[numberOfDayTextures2] =
              imageryLayer.contrast;
            applyContrast =
              applyContrast ||
              uniformMapProperties.dayTextureContrast[numberOfDayTextures2] !==
                ImageryLayer.DEFAULT_CONTRAST;

            uniformMapProperties.dayTextureHue[numberOfDayTextures2] =
              imageryLayer.hue;
            applyHue =
              applyHue ||
              uniformMapProperties.dayTextureHue[numberOfDayTextures2] !==
                ImageryLayer.DEFAULT_HUE;

            uniformMapProperties.dayTextureSaturation[numberOfDayTextures2] =
              imageryLayer.saturation;
            applySaturation =
              applySaturation ||
              uniformMapProperties.dayTextureSaturation[numberOfDayTextures2] !==
                ImageryLayer.DEFAULT_SATURATION;

            uniformMapProperties.dayTextureOneOverGamma[numberOfDayTextures2] =
              1.0 / imageryLayer.gamma;
            applyGamma =
              applyGamma ||
              uniformMapProperties.dayTextureOneOverGamma[numberOfDayTextures2] !==
                1.0 / ImageryLayer.DEFAULT_GAMMA;

            uniformMapProperties.dayTextureSplit[numberOfDayTextures2] =
              imageryLayer.splitDirection;
            applySplit =
              applySplit ||
              uniformMapProperties.dayTextureSplit[numberOfDayTextures2] !== 0.0;

            // Update cutout rectangle
            let dayTextureCutoutRectangle =
              uniformMapProperties.dayTextureCutoutRectangles[numberOfDayTextures2];
            if (!defined(dayTextureCutoutRectangle)) {
                dayTextureCutoutRectangle = uniformMapProperties.dayTextureCutoutRectangles[
                    numberOfDayTextures2
                ] = new Vector4();
            }

            Cartesian4.clone(Cartesian4.ZERO, dayTextureCutoutRectangle);
            if (defined(imageryLayer.cutoutRectangle)) {
                const cutoutRectangle = clipRectangleAntimeridian(
                    cartographicTileRectangle,
                    imageryLayer.cutoutRectangle
                );
                const intersection = Rectangle.simpleIntersection(
                    cutoutRectangle,
                    cartographicTileRectangle,
                    rectangleIntersectionScratch
                );
                applyCutout = defined(intersection) || applyCutout;

                dayTextureCutoutRectangle.x =
                (cutoutRectangle.west - cartographicTileRectangle.west) *
                inverseTileWidth;
                dayTextureCutoutRectangle.y =
                (cutoutRectangle.south - cartographicTileRectangle.south) *
                inverseTileHeight;
                dayTextureCutoutRectangle.z =
                (cutoutRectangle.east - cartographicTileRectangle.west) *
                inverseTileWidth;
                dayTextureCutoutRectangle.w =
                (cutoutRectangle.north - cartographicTileRectangle.south) *
                inverseTileHeight;
            }

            // Update color to alpha
            let colorToAlpha =
              uniformMapProperties.colorsToAlpha[numberOfDayTextures2];
            if (!defined(colorToAlpha)) {
                colorToAlpha = uniformMapProperties.colorsToAlpha[
                    numberOfDayTextures2
                ] = new Vector4();
            }

            const hasColorToAlpha =
              defined(imageryLayer.colorToAlpha) &&
              imageryLayer.colorToAlphaThreshold > 0.0;
            applyColorToAlpha = applyColorToAlpha || hasColorToAlpha;

            if (hasColorToAlpha) {
                const color = imageryLayer.colorToAlpha;
                colorToAlpha.x = color.red;
                colorToAlpha.y = color.green;
                colorToAlpha.z = color.blue;
                colorToAlpha.w = imageryLayer.colorToAlphaThreshold;
            } else {
                colorToAlpha.w = -1.0;
            }

            // if (defined(imagery.credits)) {
            //     const credits = imagery.credits;
            //     for (
            //         let creditIndex = 0, creditLength = credits.length;
            //         creditIndex < creditLength;
            //         ++creditIndex
            //     ) {
            //         creditDisplay.addCredit(credits[creditIndex]);
            //     }
            // }

            ++numberOfDayTextures2;
        }

        // trim texture array to the used length so we don't end up using old textures
        // which might get destroyed eventually
        uniformMapProperties.dayTextures.length = numberOfDayTextures2;
        uniformMapProperties.waterMask = waterMaskTexture;
        Cartesian4.clone(
            waterMaskTranslationAndScale,
            uniformMapProperties.waterMaskTranslationAndScale
        );

        uniformMapProperties.minMaxHeight.x = encoding.minimumHeight;
        uniformMapProperties.minMaxHeight.y = encoding.maximumHeight;

        uniformMapProperties.scaleAndBias.copy(encoding.threeMatrix4);

        // update clipping planes
        //     const clippingPlanes = tileProvider._clippingPlanes;
        //     const clippingPlanesEnabled =
        //   defined(clippingPlanes) && clippingPlanes.enabled && tile.isClipped;
        //     if (clippingPlanesEnabled) {
        //         uniformMapProperties.clippingPlanesEdgeColor = Color.clone(
        //             clippingPlanes.edgeColor,
        //             uniformMapProperties.clippingPlanesEdgeColor
        //         );
        //         uniformMapProperties.clippingPlanesEdgeWidth = clippingPlanes.edgeWidth;
        //     }

        surfaceShaderSetOptions.numberOfDayTextures = numberOfDayTextures2;
        surfaceShaderSetOptions.applyBrightness = applyBrightness;
        surfaceShaderSetOptions.applyContrast = applyContrast;
        surfaceShaderSetOptions.applyHue = applyHue;
        surfaceShaderSetOptions.applySaturation = applySaturation;
        surfaceShaderSetOptions.applyGamma = applyGamma;
        surfaceShaderSetOptions.applyAlpha = applyAlpha;
        surfaceShaderSetOptions.applyDayNightAlpha = applyDayNightAlpha;
        surfaceShaderSetOptions.applySplit = applySplit;
        surfaceShaderSetOptions.enableFog = applyFog;
        surfaceShaderSetOptions.enableClippingPlanes = false;
        // surfaceShaderSetOptions.clippingPlanes = clippingPlanes;
        surfaceShaderSetOptions.hasImageryLayerCutout = applyCutout;
        surfaceShaderSetOptions.colorCorrect = colorCorrect;
        surfaceShaderSetOptions.highlightFillTile = highlightFillTile;
        surfaceShaderSetOptions.colorToAlpha = applyColorToAlpha;
        surfaceShaderSetOptions.showUndergroundColor = showUndergroundColor;
        surfaceShaderSetOptions.translucent = translucent;

        const shaderProgram = tileProvider._surfaceShaderSet.getShaderProgram(
            surfaceShaderSetOptions
        );
        command.geometry.dispose();

        command.geometry = mesh.geometry;
        command.material = material;

        // setUniform(command, uniformMap, globeSurfaceMaterial);
        // command.material = globeSurfaceMaterial;

        // (command.material as GlobeSurfaceTileMaterial).vertexShader = shaderProgram._vertexShaderText;
        // (command.material as GlobeSurfaceTileMaterial).fragmentShader = shaderProgram._fragmentShaderText;

        setUniform(command, uniformMap, shaderProgram.material);
        // command.material = shaderProgram.material;

        const boundingVolume = command.boundingVolume;
        const orientedBoundingBox = command.orientedBoundingBox;
        command.boundingVolume = BoundingSphere.clone(surfaceTile.boundingSphere3D, boundingVolume);
        command.orientedBoundingBox = OrientedBoundingBox.clone(surfaceTile.orientedBoundingBox, orientedBoundingBox);

        frameState.commandList.push(command);

        initialColor = otherPassesInitialColor;
    } while (imageryIndex < imageryLen);
};

class GlobeSurfaceTileProvider {
    lightingFadeOutDistance = 6500000.0;
    lightingFadeInDistance = 9000000.0;
    hasWaterMask = false;

    zoomedOutOceanSpecularIntensity = 0.5;

    _imageryLayers: ImageryLayerCollection;
    _quadtree?: QuadtreePrimitive;
    _terrainProvider: EllipsoidTerrainProvider | TerrainProvider;
    _errorEvent = new Event();

    _imageryLayersUpdatedEvent = new Event();
    _tileLoadedEvent = new Event();
    _tilesToRenderByTextureCount: any[] = []

    enableLighting = false;
    dynamicAtmosphereLighting = false;
    dynamicAtmosphereLightingFromSun = false;
    showGroundAtmosphere = false;
    shadows = ShadowMode.RECEIVE_ONLY;

    materialUniformMap: any;
    _materialUniformMap: any

    _surfaceShaderSet: GlobeSurfaceShaderSet;

    /**
     * The color to use to highlight terrain fill tiles. If undefined, fill tiles are not
     * highlighted at all. The alpha value is used to alpha blend with the tile's
     * actual color. Because terrain fill tiles do not represent the actual terrain surface,
     * it may be useful in some applications to indicate visually that they are not to be trusted.
     * @type {Color}
     * @default undefined
     */
    fillHighlightColor?: CesiumColor = undefined;

    showSkirts = true;

    backFaceCulling = true;

    _drawCommands: any[] = [];
    _compressCommands: any[] = [];
    _materialMaps: any[] = [];
    _uniformMaps: any[] = [];
    _compressUniformMaps: any[] = [];

    _usedDrawCommands = 0;
    _usedCompressCommands = 0;

    hueShift = 0.0;
    saturationShift = 0.0;
    brightnessShift = 0.0;

    nightFadeInDistance = 0.0;

    undergroundColor?: CesiumColor;

    _vertexArraysToDestroy: any[] = [];
    cartographicLimitRectangle = Rectangle.clone(Rectangle.MAX_VALUE) as Rectangle;

    _debug: {
        wireframe: boolean,
        boundingSphereTile: BoundingSphere | undefined,
        tilesRendered?: any,
        texturesRendered?: any
    }

    _baseColor: CesiumColor | undefined;
    _firstPassInitialColor = new Cartesian4(0.0, 0.0, 0.5, 1.0);

    _layerOrderChanged: boolean;
    _hasFillTilesThisFrame = false;
    _hasLoadedTilesThisFrame = false;

    nightFadeOutDistance = 0;

    undergroundColorAlphaByDistance?: NearFarScalar;

    oceanNormalMap: any;
    constructor (options: {
        terrainProvider: EllipsoidTerrainProvider;
        imageryLayers: ImageryLayerCollection;
        surfaceShaderSet: GlobeSurfaceShaderSet
    }) {
        this._quadtree = undefined;
        this._imageryLayers = options.imageryLayers;
        this._surfaceShaderSet = options.surfaceShaderSet;
        this._terrainProvider = options.terrainProvider;

        this._imageryLayers.layerAdded.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerAdded, this);
        this._imageryLayers.layerRemoved.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerRemoved, this);
        this._imageryLayers.layerMoved.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerMoved, this);
        this._imageryLayers.layerShownOrHidden.addEventListener(GlobeSurfaceTileProvider.prototype._onLayerShownOrHidden, this);

        this._debug = {
            wireframe: false,
            boundingSphereTile: undefined
        };

        this._layerOrderChanged = false;

        this._baseColor = undefined;
        this.baseColor = new CesiumColor(0.0, 0.0, 0.5, 1.0);
    }

    get baseColor (): CesiumColor {
        return this._baseColor as CesiumColor;
    }

    set baseColor (value: CesiumColor) {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        // >>includeEnd('debug');

        this._baseColor = value;
        this._firstPassInitialColor = Cartesian4.fromColor(value, this._firstPassInitialColor);
    }

    get quadtree (): QuadtreePrimitive {
        return (this._quadtree as QuadtreePrimitive);
    }

    set quadtree (value: QuadtreePrimitive) {
        this._quadtree = value;
    }

    get tilingScheme (): GeographicTilingScheme {
        return this._terrainProvider.tilingScheme as GeographicTilingScheme;
    }

    get terrainProvider (): EllipsoidTerrainProvider | TerrainProvider {
        return this._terrainProvider;
    }

    set terrainProvider (terrainProvider: EllipsoidTerrainProvider | TerrainProvider) {
        if (this._terrainProvider === terrainProvider) {
            return;
        }

        // >>includeStart('debug', pragmas.debug);
        if (!defined(terrainProvider)) {
            throw new DeveloperError('terrainProvider is required.');
        }
        // >>includeEnd('debug');

        this._terrainProvider = terrainProvider;

        if (defined(this._quadtree)) {
            (this._quadtree as QuadtreePrimitive).invalidateAllTiles();
        }
    }

    get imageryLayersUpdatedEvent (): Event {
        return this._imageryLayersUpdatedEvent;
    }

    get ready (): any {
        return (
            this._terrainProvider.ready &&
            (this._imageryLayers.length === 0 ||
              this._imageryLayers.get(0).imageryProvider.ready)
        );
    }

    /**
     * Determines if the given tile can be refined
     * @param {QuadtreeTile} tile The tile to check.
     * @returns {boolean} True if the tile can be refined, false if it cannot.
     */
    anRefine (tile: QuadtreeTile): boolean {
    // Only allow refinement it we know whether or not the children of this tile exist.
    // For a tileset with `availability`, we'll always be able to refine.
    // We can ask for availability of _any_ child tile because we only need to confirm
    // that we get a yes or no answer, it doesn't matter what the answer is.
        if (defined((tile.data as GlobeSurfaceTile).terrainData)) {
            return true;
        }
        const childAvailable = this.terrainProvider.getTileDataAvailable(
            tile.x * 2,
            tile.y * 2,
            tile.level + 1
        );
        return childAvailable !== undefined;
    }

    /**
     * Called at the beginning of the update cycle for each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
     * or any other functions.
     *
     * @param {FrameState} frameState The frame state.
     */
    beginUpdate (frameState: FrameState): void {
        const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        for (let i = 0, len = tilesToRenderByTextureCount.length; i < len; ++i) {
            const tiles = tilesToRenderByTextureCount[i];
            if (defined(tiles)) {
                tiles.length = 0;
            }
        }
        // update clipping planes
        // const clippingPlanes = this._clippingPlanes;
        // if (defined(clippingPlanes) && clippingPlanes.enabled) {
        //     clippingPlanes.update(frameState);
        // }
        this._usedDrawCommands = 0;

        this._hasLoadedTilesThisFrame = false;
        this._hasFillTilesThisFrame = false;
    }

    /**
   * Called at the end of the update cycle for each render frame, after {@link QuadtreeTileProvider#showTileThisFrame}
   * and any other functions.
   *
   * @param {FrameState} frameState The frame state.
   */
    endUpdate (frameState: FrameState) {
        // if (!defined(this._renderState)) {
        //     this._renderState = RenderState.fromCache({
        //         // Write color and depth
        //         cull: {
        //             enabled: true
        //         },
        //         depthTest: {
        //             enabled: true,
        //             func: DepthFunction.LESS
        //         }
        //     });

        //     this._blendRenderState = RenderState.fromCache({
        //         // Write color and depth
        //         cull: {
        //             enabled: true
        //         },
        //         depthTest: {
        //             enabled: true,
        //             func: DepthFunction.LESS_OR_EQUAL
        //         },
        //         blending: BlendingState.ALPHA_BLEND
        //     });

        //     let rs = clone(this._renderState, true);
        //     rs.cull.enabled = false;
        //     this._disableCullingRenderState = RenderState.fromCache(rs);

        //     rs = clone(this._blendRenderState, true);
        //     rs.cull.enabled = false;
        //     this._disableCullingBlendRenderState = RenderState.fromCache(rs);
        // }

        // If this frame has a mix of loaded and fill tiles, we need to propagate
        // loaded heights to the fill tiles.
        // if (this._hasFillTilesThisFrame && this._hasLoadedTilesThisFrame) {
        //     TerrainFillMesh.updateFillTiles(
        //         this,
        //         this._quadtree._tilesToRender,
        //         frameState,
        //         this._vertexArraysToDestroy
        //     );
        // }

        // When terrain exaggeration changes, all of the loaded tiles need to generate
        // geodetic surface normals so they can scale properly when rendered.
        // When exaggeration is reset, geodetic surface normals are removed to decrease
        // memory usage. Some tiles might have been constructed with the correct
        // exaggeration already, so skip over them.

        // If the geodetic surface normals can't be created because the tile doesn't
        // have a mesh, keep checking until the tile does have a mesh. This can happen
        // if the tile's mesh starts construction in a worker thread right before the
        // exaggeration changes.

        //     const quadtree = this.quadtree;
        //     const exaggeration = frameState.terrainExaggeration;
        //     const exaggerationRelativeHeight = frameState.terrainExaggerationRelativeHeight;
        //     const hasExaggerationScale = exaggeration !== 1.0;
        //     const exaggerationChanged =
        //   this._oldTerrainExaggeration !== exaggeration ||
        //   this._oldTerrainExaggerationRelativeHeight !== exaggerationRelativeHeight;

        //     // Keep track of the next time there is a change in exaggeration
        //     this._oldTerrainExaggeration = exaggeration;
        //     this._oldTerrainExaggerationRelativeHeight = exaggerationRelativeHeight;

        //     const processingChange =
        //   exaggerationChanged || this._processingTerrainExaggerationChange;
        //     let continueProcessing = false;

        //     if (processingChange) {
        //         quadtree.forEachRenderedTile(function (tile) {
        //             const surfaceTile = tile.data;
        //             const mesh = surfaceTile.renderedMesh;
        //             if (mesh !== undefined) {
        //                 // Check the tile's terrain encoding to see if it has been exaggerated yet
        //                 const encoding = mesh.encoding;
        //                 const encodingExaggerationScaleChanged =
        //         encoding.exaggeration !== exaggeration;
        //                 const encodingRelativeHeightChanged =
        //         encoding.exaggerationRelativeHeight !== exaggerationRelativeHeight;

        //                 if (encodingExaggerationScaleChanged || encodingRelativeHeightChanged) {
        //                     // Turning exaggeration scale on/off requires adding or removing geodetic surface normals
        //                     // Relative height only translates, so it has no effect on normals
        //                     if (encodingExaggerationScaleChanged) {
        //                         if (hasExaggerationScale && !encoding.hasGeodeticSurfaceNormals) {
        //                             const ellipsoid = tile.tilingScheme.ellipsoid;
        //                             surfaceTile.addGeodeticSurfaceNormals(ellipsoid, frameState);
        //                         } else if (
        //                             !hasExaggerationScale &&
        //             encoding.hasGeodeticSurfaceNormals
        //                         ) {
        //                             surfaceTile.removeGeodeticSurfaceNormals(frameState);
        //                         }
        //                     }

        //                     encoding.exaggeration = exaggeration;
        //                     encoding.exaggerationRelativeHeight = exaggerationRelativeHeight;

        //                     // Notify the quadtree that this tile's height has changed
        //                     quadtree._tileToUpdateHeights.push(tile);
        //                     const customData = tile.customData;
        //                     const customDataLength = customData.length;
        //                     for (let i = 0; i < customDataLength; i++) {
        //                         // Restart the level so that a height update is triggered
        //                         const data = customData[i];
        //                         data.level = -1;
        //                     }
        //                 }
        //             } else {
        //                 // this tile may come into view at a later time so keep the loop active
        //                 continueProcessing = true;
        //             }
        //         });
        //     }

        //     this._processingTerrainExaggerationChange = continueProcessing;

        // Add the tile render commands to the command list, sorted by texture count.
        const tilesToRenderByTextureCount = this._tilesToRenderByTextureCount;
        for (
            let textureCountIndex = 0,
                textureCountLength = tilesToRenderByTextureCount.length;
            textureCountIndex < textureCountLength;
            ++textureCountIndex
        ) {
            const tilesToRender = tilesToRenderByTextureCount[textureCountIndex];
            if (!defined(tilesToRender)) {
                continue;
            }

            for (
                let tileIndex = 0, tileLength = tilesToRender.length;
                tileIndex < tileLength;
                ++tileIndex
            ) {
                const tile = tilesToRender[tileIndex];
                const tileBoundingRegion = tile.data.tileBoundingRegion;
                addDrawCommandsForTile(this, tile, frameState);
                frameState.minimumTerrainHeight = Math.min(
                    frameState.minimumTerrainHeight,
                    tileBoundingRegion.minimumHeight
                );
            }
        }
    }

    _onLayerAdded (layer:ImageryLayer, index: number): void {
        if (layer.show) {
            const terrainProvider = this._terrainProvider;

            const that = this;
            const imageryProvider = layer.imageryProvider;
            const tileImageryUpdatedEvent = this._imageryLayersUpdatedEvent;
            imageryProvider._reload = function () {
            // Clear the layer's cache
                layer._imageryCache = {};

                (that._quadtree as QuadtreePrimitive).forEachLoadedTile(function (tile: any) {
                    // If this layer is still waiting to for the loaded callback, just return
                    if (defined(tile._loadedCallbacks[layer._layerIndex])) {
                        return;
                    }

                    let i;

                    // Figure out how many TileImageries we will need to remove and where to insert new ones
                    const tileImageryCollection = tile.data.imagery;
                    const length = tileImageryCollection.length;
                    let startIndex = -1;
                    let tileImageriesToFree = 0;
                    for (i = 0; i < length; ++i) {
                        const tileImagery = tileImageryCollection[i];
                        const imagery = defaultValue(
                            tileImagery.readyImagery,
                            tileImagery.loadingImagery
                        );
                        if (imagery.imageryLayer === layer) {
                            if (startIndex === -1) {
                                startIndex = i;
                            }

                            ++tileImageriesToFree;
                        } else if (startIndex !== -1) {
                            // iterated past the section of TileImageries belonging to this layer, no need to continue.
                            break;
                        }
                    }

                    if (startIndex === -1) {
                        return;
                    }

                    // Insert immediately after existing TileImageries
                    const insertionPoint = startIndex + tileImageriesToFree;

                    // Create new TileImageries for all loaded tiles
                    // if (
                    //     layer._createTileImagerySkeletons(
                    //         tile,
                    //         terrainProvider,
                    //         insertionPoint
                    //     )
                    // ) {
                    //     // Add callback to remove old TileImageries when the new TileImageries are ready
                    //     tile._loadedCallbacks[layer._layerIndex] = getTileReadyCallback(
                    //         tileImageriesToFree,
                    //         layer,
                    //         terrainProvider
                    //     );

                    //     tile.state = QuadtreeTileLoadState.LOADING;
                    // }
                });
            };

            // create TileImageries for this layer for all previously loaded tiles
            (this._quadtree as QuadtreePrimitive).forEachLoadedTile(function (tile: any) {
                if ((layer as ImageryLayer)._createTileImagerySkeletons(tile, (terrainProvider as EllipsoidTerrainProvider))) {
                    tile.state = QuadtreeTileLoadState.LOADING;

                    // Tiles that are not currently being rendered need to load the new layer before they're renderable.
                    // We don't mark the rendered tiles non-renderable, though, because that would make the globe disappear.
                    if (
                        tile.level !== 0 &&
                (tile._lastSelectionResultFrame !==
                  (that.quadtree as QuadtreePrimitive)._lastSelectionFrameNumber ||
                  tile._lastSelectionResult !== TileSelectionResult.RENDERED)
                    ) {
                        tile.renderable = false;
                    }
                }
            });

            this._layerOrderChanged = true;
            tileImageryUpdatedEvent.raiseEvent();
        }
    }

    _onLayerRemoved (layer: ImageryLayer, index?: number): void {
        // destroy TileImagerys for this layer for all previously loaded tiles
        (this._quadtree as QuadtreePrimitive).forEachLoadedTile(function (tile: any) {
            const tileImageryCollection = tile.data.imagery;

            let startIndex = -1;
            let numDestroyed = 0;
            for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
                const tileImagery = tileImageryCollection[i];
                let imagery = tileImagery.loadingImagery;
                if (!defined(imagery)) {
                    imagery = tileImagery.readyImagery;
                }
                if (imagery.imageryLayer === layer) {
                    if (startIndex === -1) {
                        startIndex = i;
                    }

                    tileImagery.freeResources();
                    ++numDestroyed;
                } else if (startIndex !== -1) {
                    // iterated past the section of TileImagerys belonging to this layer, no need to continue.
                    break;
                }
            }

            if (startIndex !== -1) {
                tileImageryCollection.splice(startIndex, numDestroyed);
            }
        });

        if (defined(layer.imageryProvider)) {
            layer.imageryProvider._reload = undefined;
        }

        this._imageryLayersUpdatedEvent.raiseEvent();
    }

    _onLayerMoved (
        layer?:any,
        newIndex?:number,
        oldIndex?: number
    ): void {
        this._layerOrderChanged = true;
        this._imageryLayersUpdatedEvent.raiseEvent();
    }

    _onLayerShownOrHidden (
        layer: ImageryLayer,
        index: number,
        show: boolean
    ): void {
        if (show) {
            this._onLayerAdded(layer, index);
        } else {
            this._onLayerRemoved(layer, index);
        }
    }

    /**
     * Make updates to the tile provider that are not involved in rendering. Called before the render update cycle.
     */
    update (frameState: FrameState) {
    // update collection: imagery indices, base layers, raise layer show/hide event
        this._imageryLayers._update();
    }

    /**
     * Called at the beginning of each render frame, before {@link QuadtreeTileProvider#showTileThisFrame}
     * @param {FrameState} frameState The frame state.
     */
    initialize (frameState: FrameState): void {
        // update each layer for texture reprojection.
        this._imageryLayers.queueReprojectionCommands(frameState);

        if (this._layerOrderChanged) {
            this._layerOrderChanged = false;

            // Sort the TileImagery instances in each tile by the layer index.
            (this._quadtree as QuadtreePrimitive).forEachLoadedTile(function (tile: any) {
                tile.data.imagery.sort(sortTileImageryByLayerIndex);
            });
        }

        // Add credits for terrain and imagery providers.
        // updateCredits(this, frameState);

        const vertexArraysToDestroy = this._vertexArraysToDestroy;
        const length = vertexArraysToDestroy.length;
        for (let j = 0; j < length; ++j) {
            GlobeSurfaceTile._freeVertexArray(vertexArraysToDestroy[j]);
        }
        vertexArraysToDestroy.length = 0;
    }

    /**
     * Cancels any imagery re-projections in the queue.
     */
    cancelReprojections (): void {
        this._imageryLayers.cancelReprojections();
    }

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    computeDistanceToTile (tile:QuadtreeTile, frameState:FrameState): number {
        // The distance should be:
        // 1. the actual distance to the tight-fitting bounding volume, or
        // 2. a distance that is equal to or greater than the actual distance to the tight-fitting bounding volume.
        //
        // When we don't know the min/max heights for a tile, but we do know the min/max of an ancestor tile, we can
        // build a tight-fitting bounding volume horizontally, but not vertically. The min/max heights from the
        // ancestor will likely form a volume that is much bigger than it needs to be. This means that the volume may
        // be deemed to be much closer to the camera than it really is, causing us to select tiles that are too detailed.
        // Loading too-detailed tiles is super expensive, so we don't want to do that. We don't know where the child
        // tile really lies within the parent range of heights, but we _do_ know the child tile can't be any closer than
        // the ancestor height surface (min or max) that is _farthest away_ from the camera. So if we compute distance
        // based on that conservative metric, we may end up loading tiles that are not detailed enough, but that's much
        // better (faster) than loading tiles that are too detailed.

        updateTileBoundingRegion(tile, this, frameState);

        const surfaceTile = tile.data as GlobeSurfaceTile;
        const boundingVolumeSourceTile = surfaceTile.boundingVolumeSourceTile;
        if (boundingVolumeSourceTile === undefined) {
            // Can't find any min/max heights anywhere? Ok, let's just say the
            // tile is really far away so we'll load and render it rather than
            // refining.
            return 9999999999.0;
        }

        const tileBoundingRegion = surfaceTile.tileBoundingRegion as TileBoundingRegion;
        const min = tileBoundingRegion.minimumHeight;
        const max = tileBoundingRegion.maximumHeight;

        if (surfaceTile.boundingVolumeSourceTile !== tile) {
            const cameraHeight = frameState.camera.positionCartographic.height;
            const distanceToMin = Math.abs(cameraHeight - min);
            const distanceToMax = Math.abs(cameraHeight - max);
            if (distanceToMin > distanceToMax) {
                tileBoundingRegion.minimumHeight = min;
                tileBoundingRegion.maximumHeight = min;
            } else {
                tileBoundingRegion.minimumHeight = max;
                tileBoundingRegion.maximumHeight = max;
            }
        }

        const result = tileBoundingRegion.distanceToCamera(frameState);

        tileBoundingRegion.minimumHeight = min;
        tileBoundingRegion.maximumHeight = max;

        return result;
    }

    /**
     * Determines the visibility of a given tile.  The tile may be fully visible, partially visible, or not
     * visible at all.  Tiles that are renderable and are at least partially visible will be shown by a call
     * to {@link GlobeSurfaceTileProvider#showTileThisFrame}.
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information about the current frame.
     * @param {QuadtreeOccluders} occluders The objects that may occlude this tile.
     *
     * @returns {Visibility} Visibility.NONE if the tile is not visible,
     *                       Visibility.PARTIAL if the tile is partially visible, or
     *                       Visibility.FULL if the tile is fully visible.
     */
    computeTileVisibility (
        tile:QuadtreeTile,
        frameState:FrameState,
        occluders?: QuadtreeOccluders
    ):Visibility {
        const distance = this.computeDistanceToTile(tile, frameState);
        tile._distance = distance;

        const undergroundVisible = isUndergroundVisible(this, frameState);

        // if (frameState.fog.enabled && !undergroundVisible) {
        //     if (CesiumMath.fog(distance, frameState.fog.density) >= 1.0) {
        //         // Tile is completely in fog so return that it is not visible.
        //         return Visibility.NONE;
        //     }
        // }

        const surfaceTile = tile.data as GlobeSurfaceTile;
        const tileBoundingRegion = surfaceTile.tileBoundingRegion as TileBoundingRegion;

        if (surfaceTile.boundingVolumeSourceTile === undefined) {
            // We have no idea where this tile is, so let's just call it partially visible.
            return Visibility.PARTIAL;
        }

        const cullingVolume = frameState.cullingVolume;
        let boundingVolume: OrientedBoundingBox | BoundingSphere = tileBoundingRegion.boundingVolume;

        if (!defined(boundingVolume)) {
            boundingVolume = tileBoundingRegion.boundingSphere;
        }

        // Check if the tile is outside the limit area in cartographic space
        surfaceTile.clippedByBoundaries = false;
        const clippedCartographicLimitRectangle = clipRectangleAntimeridian(
            tile.rectangle,
            this.cartographicLimitRectangle
        );
        const areaLimitIntersection = Rectangle.simpleIntersection(
            clippedCartographicLimitRectangle,
            tile.rectangle,
            rectangleIntersectionScratch
        );
        if (!defined(areaLimitIntersection)) {
            return Visibility.NONE;
        }
        if (!Rectangle.equals(areaLimitIntersection, tile.rectangle)) {
            surfaceTile.clippedByBoundaries = true;
        }

        if (frameState.mode !== SceneMode.SCENE3D) {
            boundingVolume = boundingSphereScratch;
            BoundingSphere.fromRectangleWithHeights2D(
                tile.rectangle,
                frameState.mapProjection,
                tileBoundingRegion.minimumHeight,
                tileBoundingRegion.maximumHeight,
                boundingVolume
            );
            Cartesian3.fromElements(
                boundingVolume.center.z,
                boundingVolume.center.x,
                boundingVolume.center.y,
                boundingVolume.center
            );

            if (
                frameState.mode === SceneMode.MORPHING &&
                defined(surfaceTile.renderedMesh)
            ) {
                boundingVolume = BoundingSphere.union(
                    tileBoundingRegion.boundingSphere,
                    boundingVolume,
                    boundingVolume
                );
            }
        }

        if (!defined(boundingVolume)) {
            return Visibility.PARTIAL;
        }

        // const clippingPlanes = this._clippingPlanes;
        // if (defined(clippingPlanes) && clippingPlanes.enabled) {
        //     const planeIntersection = clippingPlanes.computeIntersectionWithBoundingVolume(
        //         boundingVolume
        //     );
        //     tile.isClipped = planeIntersection !== Intersect.INSIDE;
        //     if (planeIntersection === Intersect.OUTSIDE) {
        //         return Visibility.NONE;
        //     }
        // }

        let visibility;
        const intersection = cullingVolume.computeVisibility(boundingVolume);

        if (intersection === Intersect.OUTSIDE) {
            visibility = Visibility.NONE;
        } else if (intersection === Intersect.INTERSECTING) {
            visibility = Visibility.PARTIAL;
        } else if (intersection === Intersect.INSIDE) {
            visibility = Visibility.FULL;
        }

        if (visibility === Visibility.NONE) {
            return visibility;
        }

        //     const ortho3D =
        //   frameState.mode === SceneMode.SCENE3D &&
        //   frameState.camera.frustum instanceof OrthographicFrustum;
        const ortho3D = false;
        if (frameState.mode === SceneMode.SCENE3D &&
            !ortho3D &&
            defined(occluders) &&
            !undergroundVisible
        ) {
            const occludeePointInScaledSpace = surfaceTile.occludeePointInScaledSpace;
            if (!defined(occludeePointInScaledSpace)) {
                return visibility as Visibility;
            }

            if (
                (occluders as QuadtreeOccluders).ellipsoid.isScaledSpacePointVisiblePossiblyUnderEllipsoid(
                    occludeePointInScaledSpace,
                    tileBoundingRegion.minimumHeight
                )
            ) {
                return visibility as Visibility;
            }

            return Visibility.NONE;
        }

        return visibility as Visibility;
    }

    /**
     * Determines the priority for loading this tile. Lower priority values load sooner.
     * @param {QuadtreeTile} tile The tile.
     * @param {FrameState} frameState The frame state.
     * @returns {Number} The load priority value.
     */
    computeTileLoadPriority (
        tile: QuadtreeTile,
        frameState: FrameState
    ): number {
        const surfaceTile = tile.data as any;
        if (surfaceTile === undefined) {
            return 0.0;
        }

        const obb = (surfaceTile.tileBoundingRegion as TileBoundingRegion).boundingVolume;
        if (obb === undefined) {
            return 0.0;
        }

        const cameraPosition = frameState.camera.positionWC;
        const cameraDirection = frameState.camera.directionWC;
        const tileDirection = Cartesian3.subtract(
            obb.center,
            cameraPosition,
            tileDirectionScratch
        );
        const magnitude = Cartesian3.magnitude(tileDirection);
        if (magnitude < CesiumMath.EPSILON5) {
            return 0.0;
        }
        Cartesian3.divideByScalar(tileDirection, magnitude, tileDirection);
        return (
            (1.0 - Cartesian3.dot(tileDirection, cameraDirection)) * tile._distance
        );
    }

    /**
     * Determines if the given tile can be refined
     * @param {QuadtreeTile} tile The tile to check.
     * @returns {boolean} True if the tile can be refined, false if it cannot.
     */
    canRefine (tile: QuadtreeTile): boolean {
        // Only allow refinement it we know whether or not the children of this tile exist.
        // For a tileset with `availability`, we'll always be able to refine.
        // We can ask for availability of _any_ child tile because we only need to confirm
        // that we get a yes or no answer, it doesn't matter what the answer is.
        if (defined((tile.data as GlobeSurfaceTile).terrainData)) {
            return true;
        }
        const childAvailable = this.terrainProvider.getTileDataAvailable(
            tile.x * 2,
            tile.y * 2,
            tile.level + 1
        );
        return childAvailable !== undefined;
    }

    /**
 * Determines if the given not-fully-loaded tile can be rendered without losing detail that
 * was present last frame as a result of rendering descendant tiles. This method will only be
 * called if this tile's descendants were rendered last frame. If the tile is fully loaded,
 * it is assumed that this method will return true and it will not be called.
 * @param {QuadtreeTile} tile The tile to check.
 * @returns {boolean} True if the tile can be rendered without losing detail.
 */
    canRenderWithoutLosingDetail (
        tile: QuadtreeTile
    ): boolean {
        const surfaceTile = tile.data as GlobeSurfaceTile;

        const readyImagery = readyImageryScratch;
        readyImagery.length = this._imageryLayers.length;

        let terrainReady = false;
        let initialImageryState = false;
        let imagery: TileImagery[] | undefined;

        if (defined(surfaceTile)) {
            // We can render even with non-ready terrain as long as all our rendered descendants
            // are missing terrain geometry too. i.e. if we rendered fills for more detailed tiles
            // last frame, it's ok to render a fill for this tile this frame.
            terrainReady = surfaceTile.terrainState === TerrainState.READY;

            // Initially assume all imagery layers are ready, unless imagery hasn't been initialized at all.
            initialImageryState = true;

            imagery = surfaceTile.imagery;
        }

        let i;
        let len: number;

        for (i = 0, len = readyImagery.length; i < len; ++i) {
            readyImagery[i] = initialImageryState;
        }

        if (defined(imagery)) {
            for (i = 0, len = (imagery as TileImagery[]).length; i < len; ++i) {
                const tileImagery = (imagery as TileImagery[])[i] as any;
                const loadingImagery = tileImagery.loadingImagery;
                const isReady =
          !defined(loadingImagery) ||
          (loadingImagery as Imagery).state === ImageryState.FAILED ||
          (loadingImagery as Imagery).state === ImageryState.INVALID;
                const layerIndex = (tileImagery.loadingImagery || tileImagery.readyImagery)
                    .imageryLayer._layerIndex;

                // For a layer to be ready, all tiles belonging to that layer must be ready.
                readyImagery[layerIndex] = isReady && readyImagery[layerIndex];
            }
        }

        const lastFrame = this.quadtree._lastSelectionFrameNumber;

        // Traverse the descendants looking for one with terrain or imagery that is not loaded on this tile.
        const stack = canRenderTraversalStack;
        stack.length = 0;
        stack.push(
            tile.southwestChild,
            tile.southeastChild,
            tile.northwestChild,
            tile.northeastChild
        );

        while (stack.length > 0) {
            const descendant = stack.pop();
            const lastFrameSelectionResult =
        descendant._lastSelectionResultFrame === lastFrame
            ? descendant._lastSelectionResult
            : TileSelectionResult.NONE;

            if (lastFrameSelectionResult === TileSelectionResult.RENDERED) {
                const descendantSurface = descendant.data;

                if (!defined(descendantSurface)) {
                    // Descendant has no data, so it can't block rendering.
                    continue;
                }

                if (
                    !terrainReady &&
          descendant.data.terrainState === TerrainState.READY
                ) {
                    // Rendered descendant has real terrain, but we don't. Rendering is blocked.
                    return false;
                }

                const descendantImagery = descendant.data.imagery;
                for (i = 0, len = descendantImagery.length; i < len; ++i) {
                    const descendantTileImagery = descendantImagery[i];
                    const descendantLoadingImagery = descendantTileImagery.loadingImagery;
                    const descendantIsReady =
            !defined(descendantLoadingImagery) ||
            descendantLoadingImagery.state === ImageryState.FAILED ||
            descendantLoadingImagery.state === ImageryState.INVALID;
                    const descendantLayerIndex = (
                        descendantTileImagery.loadingImagery ||
            descendantTileImagery.readyImagery
                    ).imageryLayer._layerIndex;

                    // If this imagery tile of a descendant is ready but the layer isn't ready in this tile,
                    // then rendering is blocked.
                    if (descendantIsReady && !readyImagery[descendantLayerIndex]) {
                        return false;
                    }
                }
            } else if (lastFrameSelectionResult === TileSelectionResult.REFINED) {
                stack.push(
                    descendant.southwestChild,
                    descendant.southeastChild,
                    descendant.northwestChild,
                    descendant.northeastChild
                );
            }
        }

        return true;
    }

    /**
     * Shows a specified tile in this frame.  The provider can cause the tile to be shown by adding
     * render commands to the commandList, or use any other method as appropriate.  The tile is not
     * expected to be visible next frame as well, unless this method is called next frame, too.
     *
     * @param {QuadtreeTile} tile The tile instance.
     * @param {FrameState} frameState The state information of the current rendering frame.
     */
    showTileThisFrame (
        tile: QuadtreeTile,
        frameState?: FrameState
    ): void {
        let readyTextureCount = 0;
        const tileImageryCollection = (tile.data as GlobeSurfaceTile).imagery;
        for (let i = 0, len = tileImageryCollection.length; i < len; ++i) {
            const tileImagery = tileImageryCollection[i];
            if (
                defined(tileImagery.readyImagery) &&
                (tileImagery.readyImagery as any).imageryLayer.alpha !== 0.0
            ) {
                ++readyTextureCount;
            }
        }

        let tileSet = this._tilesToRenderByTextureCount[readyTextureCount];
        if (!defined(tileSet)) {
            tileSet = [];
            this._tilesToRenderByTextureCount[readyTextureCount] = tileSet;
        }

        tileSet.push(tile);

        const surfaceTile = tile.data as GlobeSurfaceTile;
        if (!defined(surfaceTile.vertexArray)) {
            this._hasFillTilesThisFrame = true;
        } else {
            this._hasLoadedTilesThisFrame = true;
        }

        const debug = this._debug;
        ++debug.tilesRendered;
        debug.texturesRendered += readyTextureCount;
    }

    /**
     * Loads, or continues loading, a given tile.  This function will continue to be called
     * until {@link QuadtreeTile#state} is no longer {@link QuadtreeTileLoadState#LOADING}.  This function should
     * not be called before {@link GlobeSurfaceTileProvider#ready} returns true.
     *
     * @param {FrameState} frameState The frame state.
     * @param {QuadtreeTile} tile The tile to load.
     *
     * @exception {DeveloperError} <code>loadTile</code> must not be called before the tile provider is ready.
     */
    loadTile (frameState: FrameState, tile: QuadtreeTile) {
        // We don't want to load imagery until we're certain that the terrain tiles are actually visible.
        // So if our bounding volume isn't accurate because it came from another tile, load terrain only
        // initially. If we load some terrain and suddenly have a more accurate bounding volume and the
        // tile is _still_ visible, give the tile a chance to load imagery immediately rather than
        // waiting for next frame.

        let surfaceTile = tile.data as any;
        let terrainOnly = true;
        let terrainStateBefore;
        if (defined(surfaceTile)) {
            terrainOnly =
      surfaceTile.boundingVolumeSourceTile !== tile ||
      tile._lastSelectionResult === TileSelectionResult.CULLED_BUT_NEEDED;
            terrainStateBefore = surfaceTile.terrainState;
        }

        GlobeSurfaceTile.processStateMachine(
            tile,
            frameState,
            this.terrainProvider as EllipsoidTerrainProvider,
            this._imageryLayers,
            this._vertexArraysToDestroy,
            terrainOnly
        );

        surfaceTile = tile.data;
        if (terrainOnly && terrainStateBefore !== surfaceTile.terrainState) {
            // Terrain state changed. If:
            // a) The tile is visible, and
            // b) The bounding volume is accurate (updated as a side effect of computing visibility)
            // Then we'll load imagery, too.
            if (
                this.computeTileVisibility(tile, frameState, this.quadtree.occluders) !==
                Visibility.NONE &&
                surfaceTile.boundingVolumeSourceTile === tile
            ) {
                terrainOnly = false;
                GlobeSurfaceTile.processStateMachine(
                    tile,
                    frameState,
                    this.terrainProvider as EllipsoidTerrainProvider,
                    this._imageryLayers,
                    this._vertexArraysToDestroy,
                    terrainOnly
                );
            }
        }
    }

    /**
 * Gets the maximum geometric error allowed in a tile at a given level, in meters.  This function should not be
 * called before {@link GlobeSurfaceTileProvider#ready} returns true.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error in meters.
 */
    getLevelMaximumGeometricError (level: number): number {
        return this._terrainProvider.getLevelMaximumGeometricError(level) as number;
    }
}
export { GlobeSurfaceTileProvider };
