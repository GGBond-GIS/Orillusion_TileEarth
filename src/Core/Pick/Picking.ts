import { Cartesian2 } from '../../Math/Cartesian2';
import { Vector3 } from 'three';
import { PickDepth } from './PickDepth';
import { CesiumScene } from '../Scene/CesiumScene';

class Picking {
    scene: CesiumScene;
    pickDepth: PickDepth;
    constructor (scene: CesiumScene) {
        // 保存主场景
        this.scene = scene;

        // 用于计算深度
        this.pickDepth = new PickDepth(scene);
    }

    pickPositionWorldCoordinates (windowPosition: Cartesian2, result: Vector3): Vector3 | undefined {
        if (!this.scene.useDepthPicking) {
            return undefined;
        }
    }

    // 根据depthTexture获取深度
    // getDepth (x: number, y: number, frustum: Frustum) {
    //     const pixels = this.pickDepth.getDepth(x, y, frustum);

    //     if (this.pickDepth.depthMaterial.depthPacking === RGBADepthPacking) {
    //         const packedDepth = (Vector4 as any).unpack(pixels, 0, scratchPackedDepth);
    //         return packedDepth.dot(UnpackFactors) * 2 - 1;
    //     }

    //     return -pixels[0] * 2.0 + 1.0;
    // }
}

export { Picking };
