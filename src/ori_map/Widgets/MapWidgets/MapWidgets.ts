import { combine } from '../Core/combine';
import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { Ellipsoid } from '../Core/Ellipsoid';
import { FeatureDetection } from '../Core/FeatureDetection';
import { ScreenSpaceEventHandler } from '../Core/ScreenSpaceEventHandler';
import { Camera } from '../Scene/Camera';
import { Globe } from '../Scene/Globe';
import { RenderStateParameters } from '../Scene/MapRenderer';
import { Scene } from '../Scene/Scene';
import { SkyAtmosphere } from '../Scene/SkyAtmosphere';
import { Clock } from 'three';
import getElement from '../getElement';

function startRenderLoop (widget: MapWidgets) {
    widget._renderLoopRunning = true;

    let lastFrameTime = 0;
    function render (frameTime: number) {
        if (widget.isDestroyed()) {
            return;
        }

        if (widget._useDefaultRenderLoop) {
            try {
                const targetFrameRate = widget._targetFrameRate;
                if (!defined(targetFrameRate)) {
                    widget.resize();
                    widget.render();
                    requestAnimationFrame(render);
                } else {
                    const interval = 1000.0 / (targetFrameRate as number);
                    const delta = frameTime - lastFrameTime;

                    if (delta > interval) {
                        widget.resize();
                        widget.render();
                        lastFrameTime = frameTime - (delta % interval);
                    }
                    requestAnimationFrame(render);
                }
            } catch (error) {
                console.log(error);
                widget._useDefaultRenderLoop = false;
                widget._renderLoopRunning = false;
            //     if (widget._showRenderLoopErrors) {
            //         const title =
            //   'An error occurred while rendering.  Rendering has stopped.';
            //         widget.showErrorPanel(title, undefined, error);
            //     }
            }
        } else {
            widget._renderLoopRunning = false;
        }
    }

    requestAnimationFrame(render);
}

class MapWidgets {
    protected _scene: Scene;
    protected _element: Element;
    protected _container: Element;
    protected _canvas: HTMLCanvasElement;
    protected _canvasClientWidth: number;
    protected _canvasClientHeight: number;
    protected _lastDevicePixelRatio: number;
    protected _resolutionScale: number;
    _targetFrameRate: number | undefined;
    protected _canRender: boolean;
    _renderLoopRunning: boolean;
    protected _clock: Clock
    protected _useBrowserRecommendedResolution: boolean
    _useDefaultRenderLoop: boolean;
    protected _forceResize: boolean;
    readonly _screenSpaceEventHandler: ScreenSpaceEventHandler;
    constructor (container: Element | string, options: {
        renderState?: RenderStateParameters,
        requestRenderMode?: false,
        enabledEffect?: false,
        useBrowserRecommendedResolution?: true,
        useDefaultRenderLoop?: true,
        targetFrameRate?: number,
        globe?: Globe,
        skyAtmosphere?: any
    }) {
        container = getElement(container);

        const element = document.createElement('div');
        element.className = 'cesium-widget';
        container.appendChild(element);

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const supportsImageRenderingPixelated = FeatureDetection.supportsImageRenderingPixelated();

        if (supportsImageRenderingPixelated) {
            canvas.style.imageRendering = FeatureDetection.imageRenderingValue() as string;
        }

        canvas.oncontextmenu = function () {
            return false;
        };
        canvas.onselectstart = function () {
            return false;
        };

        function blurActiveElement () {
            if (canvas !== canvas.ownerDocument.activeElement) {
                (canvas.ownerDocument.activeElement as HTMLBodyElement).blur();
            }
        }
        canvas.addEventListener('mousedown', blurActiveElement);
        canvas.addEventListener('pointerdown', blurActiveElement);

        element.appendChild(canvas);

        const useBrowserRecommendedResolution = defaultValue(
            options.useBrowserRecommendedResolution,
            true
        );

        this._element = element;
        this._container = container;
        this._canvas = canvas;
        this._canvasClientWidth = 0;
        this._canvasClientHeight = 0;
        this._lastDevicePixelRatio = 0;
        this._forceResize = true;
        this._canRender = false;
        this._renderLoopRunning = false;
        this._resolutionScale = 1.0;
        this._useBrowserRecommendedResolution = useBrowserRecommendedResolution as boolean;
        this._clock = new Clock();

        this.configureCanvasSize();

        const combineRenderState = combine({
            canvas: canvas,
            antialias: true,
            logarithmicDepthBuffer: false
        }, options.renderState);

        this._scene = new Scene({
            renderState: combineRenderState,
            enabledEffect: options?.enabledEffect,
            requestRenderMode: options?.requestRenderMode
        });

        const ellipsoid = defaultValue(
            this._scene.mapProjection.ellipsoid,
            Ellipsoid.WGS84
        );

        let globe = options.globe;
        if (!defined(globe)) {
            globe = new Globe(ellipsoid);
            // globe.visible = false;
        }

        this._scene.globe = (globe as Globe);

        this._useDefaultRenderLoop = false;
        this.useDefaultRenderLoop = defaultValue(
            options.useDefaultRenderLoop,
            true
        ) as boolean;

        this._targetFrameRate = 60;
        this.targetFrameRate = undefined;

        this._screenSpaceEventHandler = new ScreenSpaceEventHandler(canvas);

        this._scene.camera.lookAt(this._scene.camera.direction);

        let skyAtmosphere = options.skyAtmosphere;
        if (!defined(skyAtmosphere)) {
            skyAtmosphere = new SkyAtmosphere(ellipsoid);
        }
        if (skyAtmosphere !== false) {
            this.scene.skyAtmosphere = skyAtmosphere;
        }
    }

    get container (): Element {
        return this._container;
    }

    get canvas (): HTMLCanvasElement {
        return this._canvas;
    }

    get scene (): Scene {
        return this._scene;
    }

    get camera (): Camera {
        return this.scene.camera;
    }

    get useDefaultRenderLoop (): boolean {
        return this._useDefaultRenderLoop;
    }

    set useDefaultRenderLoop (value: boolean) {
        if (this._useDefaultRenderLoop !== value) {
            this._useDefaultRenderLoop = value;
            if (value && !this._renderLoopRunning) {
                startRenderLoop(this);
            }
        }
    }

    get targetFrameRate (): number | undefined {
        return this._targetFrameRate;
    }

    set targetFrameRate (value: number | undefined) {
        // >>includeStart('debug', pragmas.debug);
        // if (value <= 0) {
        //     throw new DeveloperError('targetFrameRate must be greater than 0, or undefined.');
        // }
        // >>includeEnd('debug');
        this._targetFrameRate = value;
    }

    get screenSpaceEventHandler (): ScreenSpaceEventHandler {
        return this._screenSpaceEventHandler;
    }

    configurePixelRatio ():number {
        let pixelRatio = this._useBrowserRecommendedResolution
            ? 1.0
            : window.devicePixelRatio;
        pixelRatio *= this._resolutionScale;
        if (defined(this._scene)) {
            this._scene.pixelRatio = pixelRatio;
        }

        return pixelRatio;
    }

    configureCanvasSize () : void{
        const canvas = this._element;
        let width = this._canvas.clientWidth;
        let height = canvas.clientHeight;
        const pixelRatio = this.configurePixelRatio();

        this._canvasClientWidth = width;
        this._canvasClientHeight = height;

        width *= pixelRatio;
        height *= pixelRatio;

        this._canvas.width = width;
        this._canvas.height = height;

        this._canRender = width !== 0 && height !== 0;
        this._lastDevicePixelRatio = window.devicePixelRatio;
    }

    resize (): void {
        const canvas = this._element;
        if (
            !this._forceResize &&
            this._canvasClientWidth === canvas.clientWidth &&
            this._canvasClientHeight === canvas.clientHeight &&
            this._lastDevicePixelRatio === window.devicePixelRatio
        ) {
            return;
        }
        this._forceResize = false;

        this.configureCanvasSize();
        this.scene.setSize(this.container);

        this._scene.requestRender();
    }

    render (): void {
        if (this._canRender) {
            // this._renderer.render(this._scene, this._camera);
            this.scene.initializeFrame();

            const currentTime = this._clock.getDelta();

            this.scene.render(currentTime);
        }
    }

    isDestroyed (): boolean {
        return false;
    }
}
export { MapWidgets };
