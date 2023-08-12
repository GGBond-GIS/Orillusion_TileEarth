import { OrthographicCamera } from 'three';
import { Scene } from './Scene';

export interface OrthographicFrustumCameraParameters {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    near?: number;
    far?: number;
}

class OrthographicFrustumCamera extends OrthographicCamera {
    constructor (scene: Scene, options: OrthographicFrustumCameraParameters) {
        super(options.left, options.right, options.top, options.bottom, options.near, options.far);
    }
}

export { OrthographicFrustumCamera };
