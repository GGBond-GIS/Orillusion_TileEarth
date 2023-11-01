
import { Cartesian2 } from '../../Math/Cartesian2';
import { Cartesian3 } from '../../Math/Cartesian3';
import { defined } from '../../Util/defined';
import { RequestScheduler } from '../Request/RequestScheduler';
import { TweenCollection } from '../../Util/TweenCollection';
import { DrawMeshCommand } from '../../ori_map/Renderer/DrawMeshCommand';
import { MapRenderer } from '../../ori_map/Renderer/MapRenderer';
import { LinearToneMapping, sRGBEncoding, Vector2 } from 'three';
import { CesiumColor } from '../../Math/CesiumColor';
import { incrementWrap } from '../../Math/CesiumMath';
import { defaultValue } from '../../Util/defaultValue';
import { Event } from '../../Util/Event';
import { GeographicProjection } from '../Projection/GeographicProjection';
import { SceneMode } from './SceneMode';
import { ComputeEngine } from '../../ori_map/Renderer/ComputeEngine';
import { Camera } from '../Camera/Camera';
import { Context } from '../Renderer/Context';
import { EffectComposerCollection } from '../../ori_map/Scene/EffectComposerCollection';
import { FrameState, PassesInterface } from '../Renderer/FrameState';
import { Globe } from '../Globe/Globe';
import { GlobeTranslucencyState } from '../Globe/GlobeTranslucencyState';
import { ImageryLayerCollection } from '../../Layer/ImageryLayer/ImageryLayerCollection';
import { OrthographicFrustumCamera } from '../Camera/OrthographicFrustumCamera';
// MapRenderer
import { PerspectiveFrustumCamera } from '../Camera/PerspectiveFrustumCamera';
import { Picking } from '../Pick/Picking';
import { PrimitiveCollection } from '../Renderer/PrimitiveCollection';
import { RenderCollection } from '../Renderer/RenderCollection';
import { ScreenSpaceCameraController } from '../Controller/ScreenSpaceCameraController';
import { SkyAtmosphere } from './SkyAtmosphere';
import { SkyBox } from './SkyBox';
import { Engine3D, Scene3D, webGPUContext,Object3D } from '@orillusion/core';
import { Ellipsoid } from '../../Math/Ellipsoid/Ellipsoid';

interface SceneOptions {
    enabledEffect?: false;
    requestRenderMode?: false;
    [name: string]: any
}

interface EnvironmentStateOptions {
    skyBoxCommand?: DrawMeshCommand,
    skyAtmosphereCommand?: SkyAtmosphere,
    sunDrawCommand?: DrawMeshCommand,
    sunComputeCommand?: DrawMeshCommand,
    moonCommand?: DrawMeshCommand,

    isSunVisible: boolean,
    isMoonVisible: boolean,
    isReadyForAtmosphere: boolean,
    isSkyAtmosphereVisible: boolean,

    clearGlobeDepth: boolean,
    useDepthPlane: boolean,
    renderTranslucentDepthForPick: boolean,

    originalFramebuffer: undefined,
    useGlobeDepthFramebuffer: boolean,
    separatePrimitiveFramebuffer: boolean,
    useOIT: boolean,
    useInvertClassification: boolean,
    usePostProcess: boolean,
    usePostProcessSelected: boolean,
    useWebVR: boolean
}

const requestRenderAfterFrame = function (scene: CesiumScene) {
    return function () {
        // scene.frameState.afterRender.push(function () {
        //     scene.requestRender();
        // });
    };
};

function updateGlobeListeners (scene: CesiumScene, globe: Globe) {
    for (let i = 0; i < scene._removeGlobeCallbacks.length; ++i) {
        scene._removeGlobeCallbacks[i]();
    }
    scene._removeGlobeCallbacks.length = 0;

    const removeGlobeCallbacks = [];
    if (defined(globe)) {
        removeGlobeCallbacks.push(
            globe.imageryLayersUpdatedEvent.addEventListener(
                requestRenderAfterFrame(scene)
            )
        );
        removeGlobeCallbacks.push(
            globe.terrainProviderChanged.addEventListener(
                requestRenderAfterFrame(scene)
            )
        );
    }
    scene._removeGlobeCallbacks = removeGlobeCallbacks;
}

function updateFrameNumber (scene: CesiumScene, frameNumber: number) {
    const frameState = scene._frameState;
    frameState.frameNumber = frameNumber;
}

function tryAndCatchError (scene:CesiumScene, functionToExecute: any) {
    try {
        functionToExecute(scene);
    } catch (error) {
        console.log(error);
        scene.renderError.raiseEvent(scene, error);

        if (scene.rethrowRenderErrors) {
            throw error;
        }
    }
}

function prePassesUpdate (scene:CesiumScene) {

    const frameState = scene._frameState;

    if (defined(scene.globe)) {
        scene.globe.update2(frameState);
    }

}

function postPassesUpdate (scene: CesiumScene) {
    const frameState = scene._frameState;

    RequestScheduler.update();
}

function render (scene:CesiumScene) {
    const frameState = scene._frameState;
    // const context = scene.context;
    // const us = context.uniformState;

    scene.updateFrameState();

    frameState.passes.render = true;
    // us.update(frameState);
    // console.log(defined(scene.globe))
    if (defined(scene.globe)) {
        scene.globe.beginFrame(frameState);
    }
    scene.updateEnvironment();
    scene.updateAndExecuteCommands();

    if (defined(scene.globe)) {
        scene.globe.endFrame(frameState);

        if (!scene.globe.tilesLoaded) {
            scene._renderRequested = true;
        }
    }
}

// function getGlobeHeight (scene: CesiumScene) {
//     const globe = scene._globe;
//     const camera = scene.activeCamera;
//     const cartographic = camera.positionCartographic;
//     if (defined(globe) && globe?.visible && defined(cartographic)) {
//         return globe.getHeight(cartographic);
//     }
//     return undefined;
// }

// function isCameraUnderground (scene: CesiumScene) {
//     const camera = scene.activeCamera;
//     const mode = scene.mode;
//     const globe = scene.globe;
//     const cameraController = scene.screenSpaceCameraController;
//     const cartographic = camera.positionCartographic;

//     if (!defined(cartographic)) {
//         return false;
//     }

//     if (!cameraController.onMap() && cartographic.height < 0.0) {
//         // The camera can go off the map while in Columbus View.
//         // Make a best guess as to whether it's underground by checking if its height is less than zero.
//         return true;
//     }

//     if (
//         !defined(globe) ||
//         !globe.visible ||
//         mode === SceneMode.SCENE2D ||
//         mode === SceneMode.MORPHING
//     ) {
//         return false;
//     }

//     const globeHeight = scene._globeHeight as number;
//     return defined(globeHeight) && cartographic.height < globeHeight;
// }

function updateAndRenderPrimitives (scene: CesiumScene) {
    const frameState = scene._frameState;

    // scene._groundPrimitives.update(frameState);
    scene._primitives.update(frameState);

    // updateDebugFrustumPlanes(scene);
    // updateShadowMaps(scene);

    if (scene._globe) {
        scene._globe.render(frameState);
    }
    for (let index = 0; index < frameState.commandList.length; index++) {
        const command = frameState.commandList[index];
        scene._renderCollection.addChild(command);
        
    }
    // for (const command of frameState.commandList) {
    // }
}

const executeComputeCommands = (scene: CesiumScene) => {
    const commandList = scene.frameState.computeCommandList;
    const length = commandList.length;
    for (let i = 0; i < length; ++i) {
        // commandList[i].execute(scene._computeEngine);
    }
};

/**
 * 执行渲染
 * @param firstViewport
 * @param scene
 * @param backgroundColor
 */
function executeCommandsInViewport (firstViewport: boolean, scene:CesiumScene) {
 

    if (firstViewport) {
        executeComputeCommands(scene);
    }

    if (!firstViewport) {
        scene.frameState.commandList.length = 0;
    }

    updateAndRenderPrimitives(scene);


    // scene.skyBox.render();
    // scene.effectComposerCollection.render();
}

class CesiumScene extends Scene3D {
    _primitives = new PrimitiveCollection();
    _frameState: FrameState;
    _renderRequested = true;
    protected _shaderFrameCount: number;
    // protected _context: Context;
    protected _mode = SceneMode.SCENE3D;
    readonly _camera: Camera;
    requestRenderMode: boolean;
    readonly renderError = new Event();
    readonly postUpdate = new Event();
    readonly preRender = new Event();
    readonly rethrowRenderErrors: boolean;
    backgroundColor = new CesiumColor(1.0, 0.0, 0.0, 1.0);
    readonly _screenSpaceCameraController: any;
    _mapProjection: GeographicProjection;
    // _canvas: HTMLCanvasElement;
    _globe: Globe | undefined;
    // _computeEngine: ComputeEngine;
    _removeGlobeCallbacks: any[];
    _renderCollection: RenderCollection;
    maximumRenderTimeChange: number;
    _lastRenderTime: any;
    _frameRateMonitor: any;
    _removeRequestListenerCallback: any;
    _globeHeight?: number;
    _cameraUnderground: boolean;
    _tweens = new TweenCollection();
    // effectComposerCollection: EffectComposerCollection;
    _picking: Picking;
    useDepthPicking: boolean;
    _globeTranslucencyState = new GlobeTranslucencyState();
    skyAtmosphere?: SkyAtmosphere;
    _environmentState: EnvironmentStateOptions;
    constructor (options: SceneOptions) {
        super();

        // 地图的投影方式
        this._mapProjection = defaultValue(options.mapProjection, new GeographicProjection()) as GeographicProjection;


        this._camera = new Camera(this, {
            aspect: Engine3D.aspect,
            near: 0.1,
            far: 10000000000
        });
        const ellipsoid = defaultValue(
            this.mapProjection.ellipsoid,
            Ellipsoid.WGS84
        );
        if (!defined(this._globe )) {
            this._globe = new Globe(ellipsoid);
            // globe.visible = false;
        }
        this._camera.constrainedAxis = Cartesian3.UNIT_Z;

        this.addChild(this._camera.frustum);
        /**
         * When <code>true</code>, rendering a frame will only occur when needed as determined by changes within the scene.
         * Enabling improves performance of the application, but requires using {@link Scene#requestRender}
         * to render a new frame explicitly in this mode. This will be necessary in many cases after making changes
         * to the scene in other parts of the API.
         *
         * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
         * @see Scene#maximumRenderTimeChange
         * @see Scene#requestRender
         *
         * @type {Boolean}
         * @default false
         */
        this.requestRenderMode = defaultValue(options.requestRenderMode, false) as boolean;
        this._shaderFrameCount = 0;

        /**
         * If {@link Scene#requestRenderMode} is <code>true</code>, this value defines the maximum change in
         * simulation time allowed before a render is requested. Lower values increase the number of frames rendered
         * and higher values decrease the number of frames rendered. If <code>undefined</code>, changes to
         * the simulation time will never request a render.
         * This value impacts the rate of rendering for changes in the scene like lighting, entity property updates,
         * and animations.
         *
         * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
         * @see Scene#requestRenderMode
         *
         * @type {Number}
         * @default 0.0
         */
        this.maximumRenderTimeChange = defaultValue(
            options.maximumRenderTimeChange,
            0.0
        );
        this._lastRenderTime = undefined;
        this._frameRateMonitor = undefined;

        this._globeHeight = undefined;
        this._cameraUnderground = false;

        this._frameState = new FrameState(this);
        this._removeGlobeCallbacks = [];

        /**
         * Exceptions occurring in <code>render</code> are always caught in order to raise the
         * <code>renderError</code> event.  If this property is true, the error is rethrown
         * after the event is raised.  If this property is false, the <code>render</code> function
         * returns normally after raising the event.
         *
         * @type {Boolean}
         * @default false
         */
        this.rethrowRenderErrors = false;

        // this._computeCommandList = [];

        this._renderCollection = new RenderCollection();

        this.addChild(this._renderCollection);

        this._screenSpaceCameraController = new ScreenSpaceCameraController(this);

        // this.effectComposerCollection = new EffectComposerCollection(this);

        this._picking = new Picking(this);

        // 是否启用深度坐标拾取
        this.useDepthPicking = true;

        // this.skyBox = new SkyBox(this);

        this._environmentState = {
            skyBoxCommand: undefined,
            skyAtmosphereCommand: undefined,
            sunDrawCommand: undefined,
            sunComputeCommand: undefined,
            moonCommand: undefined,

            isSunVisible: false,
            isMoonVisible: false,
            isReadyForAtmosphere: false,
            isSkyAtmosphereVisible: false,

            clearGlobeDepth: false,
            useDepthPlane: false,
            renderTranslucentDepthForPick: false,

            originalFramebuffer: undefined,
            useGlobeDepthFramebuffer: false,
            separatePrimitiveFramebuffer: false,
            useOIT: false,
            useInvertClassification: false,
            usePostProcess: false,
            usePostProcessSelected: false,
            useWebVR: false
        };
    }
    get canvas():HTMLCanvasElement{
        return webGPUContext.canvas;
    }
    get context(){
        return webGPUContext;
    }
    get cameraObj (): PerspectiveFrustumCamera {
        return this._camera.frustum;
    }

    get pixelRatio (): number {
        return this._frameState.pixelRatio;
    }

    set pixelRatio (value: number) {
        this._frameState.pixelRatio = value;
    }

    get mode (): number {
        return this._mode;
    }

    // get context (): Context {
    //     return this.context
    //     // return this._context;
    // }



    get camera (): Camera {
        return this._camera;
    }
    get activeCamera (): PerspectiveFrustumCamera {
        return this._camera.frustum;
    }

    get frameState ():FrameState {
        return this._frameState;
    }

    get mapProjection (): GeographicProjection {
        return this._mapProjection;
    }

    // get canvas (): HTMLCanvasElement {
    //     return this._canvas;
    // }

    get globe (): Globe {
        return this._globe as Globe;
    }

    set globe (globe: Globe) {
        this._globe = globe;

        updateGlobeListeners(this, globe);
    }

    get drawingBufferSize (): Vector2 {
        return new Vector2(webGPUContext.windowWidth,webGPUContext.windowHeight);
    }

    get drawingBufferWidth (): number {
        return webGPUContext.windowWidth;
    }

    get drawingBufferHeight (): number {
        return webGPUContext.windowHeight;
    }

    get imageryLayers ():ImageryLayerCollection {
        return this.globe.imageryLayers;
    }

    get cameraUnderground () : boolean {
        return this._cameraUnderground;
    }

    get screenSpaceCameraController (): ScreenSpaceCameraController {
        return this._screenSpaceCameraController;
    }

    get tweens (): TweenCollection {
        return this._tweens;
    }

    get pickPositionSupported (): boolean {
        return true;
    }

    get globeHeight (): number {
        return (this._globeHeight as number);
    }

    get environmentState (): EnvironmentStateOptions {
        return this._environmentState;
    }

    requestRender () :void{
        this._renderRequested = true;
    }

    clearPasses (passes: PassesInterface): void {
        passes.render = false;
        passes.pick = false;
        passes.depth = false;
        passes.postProcess = false;
        passes.offscreen = false;
    }

    initializeFrame ():void {
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
        }
        this._tweens.update();
        this._screenSpaceCameraController.update();
        this.camera.update(this._mode);
        this.camera._updateCameraChanged();
    }

    render (): void{
        const frameState = this._frameState;
        frameState.newFrame = false;

        const cameraChanged = true;

        const shouldRender =
        !this.requestRenderMode ||
        this._renderRequested ||
        cameraChanged ||
        // this._logDepthBufferDirty ||
        // this._hdrDirty ||
            this.mode === SceneMode.MORPHING;

        if (shouldRender) {
            this._renderRequested = false;
            const frameNumber = incrementWrap(
                frameState.frameNumber,
                15000000.0,
                1.0
            );
            updateFrameNumber(this, frameNumber);
            frameState.newFrame = true;
        }

        tryAndCatchError(this, prePassesUpdate);

        /**
         *
         * Passes update. Add any passes here
         *
         */
        // if (this.primitives.show) {
        //     tryAndCatchError(this, updateMostDetailedRayPicks);
        //     tryAndCatchError(this, updatePreloadPass);
        //     tryAndCatchError(this, updatePreloadFlightPass);
        //     if (!shouldRender) {
        //         tryAndCatchError(this, updateRequestRenderModeDeferCheckPass);
        //     }
        // }

        // this.postUpdate.raiseEvent(this, time);

        if (shouldRender) {
            // this.preRender.raiseEvent(this, time);
            // frameState.creditDisplay.beginFrame();
            tryAndCatchError(this, render);
        }

        // tryAndCatchError(this, postPassesUpdate);
    }

    // render (time: number): void{
    //     const frameState = this._frameState;
    //     frameState.newFrame = false;

    //     const cameraChanged = true;

    //     const shouldRender =
    //     !this.requestRenderMode ||
    //     this._renderRequested ||
    //     cameraChanged ||
    //     // this._logDepthBufferDirty ||
    //     // this._hdrDirty ||
    //         this.mode === SceneMode.MORPHING;

    //     if (shouldRender) {
    //         this._renderRequested = false;

    //         const frameNumber = incrementWrap(
    //             frameState.frameNumber,
    //             15000000.0,
    //             1.0
    //         );
    //         updateFrameNumber(this, frameNumber);
    //         frameState.newFrame = true;
    //     }

    //     tryAndCatchError(this, prePassesUpdate);

    //     /**
    //      *
    //      * Passes update. Add any passes here
    //      *
    //      */
    //     // if (this.primitives.show) {
    //     //     tryAndCatchError(this, updateMostDetailedRayPicks);
    //     //     tryAndCatchError(this, updatePreloadPass);
    //     //     tryAndCatchError(this, updatePreloadFlightPass);
    //     //     if (!shouldRender) {
    //     //         tryAndCatchError(this, updateRequestRenderModeDeferCheckPass);
    //     //     }
    //     // }

    //     this.postUpdate.raiseEvent(this, time);

    //     if (shouldRender) {
    //         this.preRender.raiseEvent(this, time);
    //         // frameState.creditDisplay.beginFrame();
    //         tryAndCatchError(this, render);
    //     }

    //     tryAndCatchError(this, postPassesUpdate);
    // }

    updateFrameState (): void {
        const camera = this.camera;

        const frameState = this._frameState;
        frameState.commandList.length = 0;
        frameState.computeCommandList.length = 0;
        frameState.shadowMaps.length = 0;
        frameState.mapProjection = this.mapProjection;
        frameState.mode = this._mode;
        frameState.cameraUnderground = this._cameraUnderground;
        this._renderCollection.removeAllChild();
        this._renderCollection.entityChildren = [];
        frameState.cullingVolume = camera.frustum.computeCullingVolume(
            camera.positionWC,
            camera.directionWC,
            camera.upWC
        );

        //@ts-ignore
        // frameState.camera.frustum._camera.frustum.planes = frameState.cullingVolume.planes
     frameState.camera.frustum._camera.frustum.planes[0].x =  frameState.cullingVolume.planes[0].x
     frameState.camera.frustum._camera.frustum.planes[1].x =  frameState.cullingVolume.planes[1].x
     frameState.camera.frustum._camera.frustum.planes[2].x =  frameState.cullingVolume.planes[2].x
     frameState.camera.frustum._camera.frustum.planes[3].x =  frameState.cullingVolume.planes[3].x
     frameState.camera.frustum._camera.frustum.planes[4].x =  frameState.cullingVolume.planes[4].x
     frameState.camera.frustum._camera.frustum.planes[5].x =  frameState.cullingVolume.planes[5].x
     frameState.camera.frustum._camera.frustum.planes[0].y =  frameState.cullingVolume.planes[0].y
     frameState.camera.frustum._camera.frustum.planes[1].y =  frameState.cullingVolume.planes[1].y
     frameState.camera.frustum._camera.frustum.planes[2].y =  frameState.cullingVolume.planes[2].y
     frameState.camera.frustum._camera.frustum.planes[3].y =  frameState.cullingVolume.planes[3].y
     frameState.camera.frustum._camera.frustum.planes[4].y =  frameState.cullingVolume.planes[4].y
     frameState.camera.frustum._camera.frustum.planes[5].y =  frameState.cullingVolume.planes[5].y
     frameState.camera.frustum._camera.frustum.planes[0].z =  frameState.cullingVolume.planes[0].z
     frameState.camera.frustum._camera.frustum.planes[1].z =  frameState.cullingVolume.planes[1].z
     frameState.camera.frustum._camera.frustum.planes[2].z =  frameState.cullingVolume.planes[2].z
     frameState.camera.frustum._camera.frustum.planes[3].z =  frameState.cullingVolume.planes[3].z
     frameState.camera.frustum._camera.frustum.planes[4].z =  frameState.cullingVolume.planes[4].z
     frameState.camera.frustum._camera.frustum.planes[5].z =  frameState.cullingVolume.planes[5].z
     frameState.camera.frustum._camera.frustum.planes[0].w =  frameState.cullingVolume.planes[0].w
     frameState.camera.frustum._camera.frustum.planes[1].w =  frameState.cullingVolume.planes[1].w
     frameState.camera.frustum._camera.frustum.planes[2].w =  frameState.cullingVolume.planes[2].w
     frameState.camera.frustum._camera.frustum.planes[3].w =  frameState.cullingVolume.planes[3].w
     frameState.camera.frustum._camera.frustum.planes[4].w =  frameState.cullingVolume.planes[4].w
     frameState.camera.frustum._camera.frustum.planes[5].w =  frameState.cullingVolume.planes[5].w
        frameState.globeTranslucencyState = this._globeTranslucencyState;

        this.clearPasses(frameState.passes);
    }

    updateAndExecuteCommands (): void {
        const frameState = this._frameState;
        const mode = frameState.mode;

        executeCommandsInViewport(true, this,);
    }

    updateEnvironment () {
        const frameState = this._frameState;
        const environmentState = this._environmentState;
        const renderPass = frameState.passes.render;
        const skyAtmosphere = this.skyAtmosphere;
        const globe = this.globe;
        if (
            !renderPass ||
            (this._mode !== SceneMode.SCENE2D &&
            this.camera.frustum instanceof OrthographicFrustumCamera)
        ) {
            environmentState.skyAtmosphereCommand = undefined;
            environmentState.skyBoxCommand = undefined;
            environmentState.sunDrawCommand = undefined;
            environmentState.sunComputeCommand = undefined;
            environmentState.moonCommand = undefined;
        } else {
            // if (defined(skyAtmosphere)) {
            //     if (defined(globe)) {
            //         (skyAtmosphere as SkyAtmosphere).setDynamicAtmosphereColor(
            //             globe.enableLighting && globe.dynamicAtmosphereLighting,
            //             globe.dynamicAtmosphereLightingFromSun
            //         );
            //         environmentState.isReadyForAtmosphere =
            //             environmentState.isReadyForAtmosphere ||
            //             globe._surface._tilesToRender.length > 0;
            //     }
            //     environmentState.skyAtmosphereCommand = (skyAtmosphere as SkyAtmosphere).update(
            //         frameState,
            //         globe
            //     );
            // }
        }
    }

    /**
     * Returns the cartesian position reconstructed from the depth buffer and window position.
     * The returned position is in world coordinates. Used internally by camera functions to
     * prevent conversion to projected 2D coordinates and then back.
     * <p>
     * Set {@link Scene#pickTranslucentDepth} to <code>true</code> to include the depth of
     * translucent primitives; otherwise, this essentially picks through translucent primitives.
     * </p>
     *
     * @private
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     * @param {Cartesian3} [result] The object on which to restore the result.
     * @returns {Cartesian3} The cartesian position in world coordinates.
     *
     * @exception {DeveloperError} Picking from the depth buffer is not supported. Check pickPositionSupported.
     */
    pickPositionWorldCoordinates (windowPosition: Cartesian2, result?: Cartesian3): Cartesian3 | undefined {
        // return this._picking.pickPositionWorldCoordinates(
        //     windowPosition,
        //     result
        // );

        return this.camera.pickEllipsoid(windowPosition, undefined, result);
    }
}

export { CesiumScene };
