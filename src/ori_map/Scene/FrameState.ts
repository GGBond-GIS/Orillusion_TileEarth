import { CullingVolume } from '../Core/CullingVolume';
import { SceneMode } from '../Core/SceneMode';
import { ComputeCommand } from '../Renderer/ComputeCommand';
import { Camera } from './Camera';
import { GlobeTranslucencyState } from './GlobeTranslucencyState';
import { CesiumScene } from './CesiumScene';
import { Engine3D, Scene3D, webGPUContext, Object3D } from '@orillusion/core';

export interface PassesInterface {
    render: boolean,
    pick: boolean,
    depth: boolean,
    postProcess: boolean,
    offscreen: boolean
}


class FrameState {
    scene: CesiumScene;
    context: any;
    pixelRatio: number;
    frameNumber: number;
    mode: number
    newFrame: boolean;
    passes: PassesInterface;
    readonly commandList: any[];
    readonly shadowMaps: any[];
    cullingVolume: CullingVolume;
    maximumScreenSpaceError: number;
    afterRender: Array<() => void>;
    mapProjection: any;
    terrainExaggerationRelativeHeight: number
    terrainExaggeration: number;
    minimumTerrainHeight: number;
    computeCommandList: ComputeCommand[];
    cameraUnderground: boolean;
    shadowState = {
        shadowsEnabled: true,
        shadowMaps: [],
        lightShadowMaps: [],
        nearPlane: 1.0,
        farPlane: 5000.0,
        closestObjectSize: 1000.0,
        lastDirtyTime: 0,
        outOfView: true
    };

    fog = {
        enabled: false,
        density: 1.8367740081812416e-11,
        sse: undefined,
        minimumBrightness: undefined
    };

    globeTranslucencyState?: GlobeTranslucencyState

    constructor(scene: CesiumScene) {
        this.scene = scene;

        this.context = scene.context;

        this.newFrame = false;

        /**
         * The current frame number.
         *
         * @type {Number}
         * @default 0
         */
        this.frameNumber = 0.0;

        this.pixelRatio = 1.0;
        this.mode = SceneMode.SCENE3D;
        this.passes = {
            render: false,
            pick: false,
            depth: false,
            postProcess: false,
            offscreen: false
        };

        this.commandList = [];

        this.computeCommandList = [];

        this.shadowMaps = [];
        // this.camera = scene.camera;

        this.cullingVolume = new CullingVolume();

        this.maximumScreenSpaceError = 2.0;

        this.mapProjection = undefined;

        this.cameraUnderground = false;

        this.afterRender = [];

        this.terrainExaggeration = 1.0;

        this.terrainExaggerationRelativeHeight = 0.0;

        this.minimumTerrainHeight = 0.0;

        this.globeTranslucencyState = undefined;
    }

    get camera(): Camera {
        return this.scene.camera;
    }
}

export { FrameState };
