import { Cartesian3 } from '../Core/Cartesian3';
import { Frustum, Vector3 } from 'three';
import { OrthographicFrustumCameraParameters } from './OrthographicFrustumCamera';
import { PerspectiveFrustumCamera, PerspectiveFrustumCameraParameters } from './PerspectiveFrustumCamera';
import { Scene } from './Scene';

class Camera {
    readonly activeCamera: PerspectiveFrustumCamera;
    constructor (scene: Scene, options: PerspectiveFrustumCameraParameters | OrthographicFrustumCameraParameters) {
        // 默认使用透视相机
        this.activeCamera = new PerspectiveFrustumCamera(scene, options);

        // this.cullingVolume = new CullingVolume();
    }

    get frustum (): Frustum {
        return this.activeCamera.frustum;
    }

    get position (): Vector3 {
        return this.activeCamera.position;
    }

    get direction (): Cartesian3 {
        return this.activeCamera.directionWC;
    }

    get positionWC ():Cartesian3 {
        return this.activeCamera.positionWC;
    }

    // computeCullingVolume () {

    // }

    _adjustOrthographicFrustum (zooming: number): void {
        // if (!(this.frustum instanceof OrthographicFrustum)) {

        // }

    }

    resize (container: Element): void {
        this.activeCamera.resize(container);
    }

    update (mode: number): void {
        return undefined;
    }
}
export { Camera };
