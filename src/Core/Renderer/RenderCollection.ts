import { Object3DCollection } from './Object3DCollection.js';
import { Frustum } from 'three';

import { FrameState } from './FrameState.js';

class RenderCollection extends Object3DCollection {
    frustum?: Frustum = undefined
    // 用于做裁剪的视锥体
    // constructor () {
    //     super();
    // }

    addPickCommands (commandList: any): void {
        for (let i = 0, len = commandList.length; i < len; i++) {
            const command = commandList[i];
            // if (command.allowPicking && this.frustum.intersectsSphere(command.boundingSphere)) {
            // // this.addObject(command);
            // }
            if (command.allowPicking) {
                this.addChild(command);
            }
        }
    }

    /**
     * 在渲染之前更新将要渲染的command
     *
     * @memberof RenderCollection
     */
    updateCommands (frameState: FrameState) {
        const children = this.entityChildren;
    }
}

export { RenderCollection };
