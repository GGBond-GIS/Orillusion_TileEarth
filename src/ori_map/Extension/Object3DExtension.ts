import { defined } from '../Core/defined';
import { Matrix4, Mesh, Object3D, RGBAFormat, Vector4 } from 'three';

import { Object3DCollection } from '../Core/Object3DCollection';
import { destroyObject } from '../Core/destroyObject';

import { FrameState } from '../Scene/FrameState';

declare module 'three/src/core/Object3D' {
    export interface Object3D {
        _collection: any;
        destroyChildren: true;

        updateFixedFrame(frameState: FrameState): void;
        postRenderUpdate(frameState: FrameState): void;
        get(index: number): any;
        addObject(object: Object3D): Object3D | undefined;
        removeObject(object: Object3D, isDestroy?: boolean): any;
        isDestroyed(): boolean;
        destroy(): void;
        destroySelf(): void;
        allowPicking: boolean;
        unpackMesh(): Array<Mesh>;
        updateFeatureCounts(): void;

        length: number;
        // 几何数据的长度
        _geometryByteLength: number;
        // 纹理数据字节长度
        _texturesByteLength: number;
        // 三角面数量
        _trianglesLength: number;

        // 所有的字节长度
        byteLength: number;
        _index: number;
    }
}

Object.defineProperties(Object3D.prototype, {
    length: {
        get: function () {
            return this.children.length;
        }
    },

    byteLength: {
        get: function () {
            return this._geometryByteLength + this._texturesByteLength;
        }
    }
});

Object3D.prototype.allowPicking = true;
Object3D.prototype._geometryByteLength = 0;
Object3D.prototype._texturesByteLength = 0;
Object3D.prototype._trianglesLength = 0;
Object3D.prototype._index = -1;

// 每帧更新函数
Object3D.prototype.updateFixedFrame = function (frameState: FrameState) {
    const children = this.children;

    for (let i = 0, len = children.length; i < len; i++) {
        const object = children[i];

        if (defined(object.updateFixedFrame)) {
            object.updateFixedFrame(frameState);
        }
    }
};

Object3D.prototype.postRenderUpdate = function (frameState: FrameState) {
    const children = this.children;

    for (let i = 0, len = children.length; i < len; i++) {
        const object = children[i];
        if (defined(object.postRenderUpdate)) {
            object.postRenderUpdate(frameState);
        }
    }
};

Object3D.prototype.get = function (index) {
    return this.children[index];
};

Object3D.prototype.addObject = function (object: Object3D) {
    if (object.isDestroyed()) {
        // throw new DeveloperError('This object was destroyed');
        return undefined;
    }

    this.add(object);
    object._collection = this;
    return object;
};

Object3D.prototype.removeObject = function (object: Object3DCollection | Object3D, isDestroy = false) {
    this.remove(object);

    if (this.destroyChildren || isDestroy) {
        object.destroy();
    }

    return object;
};

/**
 * 移除自身的geometry以及Material，并将其从内存中卸载
 */
(Object3D as any).prototype.destroySelf = function () {
    if (defined(this.geometry)) {
        const attributes = this.geometry.attributes;

        for (const key in attributes) {
            attributes[key].array = null;
        }

        this.geometry.index.array = null;
        this.geometry.dispose();
        this.geometry = null;
    }

    let material = this.material;

    if (defined(material)) {
        if (defined(material.map)) {
            material.map.dispose();
            material.map = null;
        }

        if (defined(material.aoMap)) {
            material.aoMap.dispose();
            material.aoMap = null;
        }

        if (defined(material.lightMap)) {
            material.lightMap.dispose();
            material.lightMap = null;
        }

        material.dispose();
        material = null;
    }
};

// 卸载该对象
Object3D.prototype.destroy = function (): void {
    this.destroySelf();

    this.traverse((node: any) => {
        if (node.isMesh || node.isSprite) {
            node.destroySelf();
        }
    });

    return destroyObject(this);
};

Object3D.prototype.isDestroyed = function (): boolean {
    return false;
};

export { Object3D };
