/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { MapRenderer } from '../Scene/MapRenderer';
import {
    BufferGeometry,
    Float32BufferAttribute,
    OrthographicCamera,
    Mesh,
    Material
} from 'three';

class ComputedPass {
    enabled: boolean;
    needsSwap: boolean;
    clear: boolean;
    renderToScreen: boolean;
    constructor () {
        // if set to true, the pass is processed by the composer
        this.enabled = true;

        // if set to true, the pass indicates to swap read and write buffer after rendering
        this.needsSwap = true;

        // if set to true, the pass clears its buffer before rendering
        this.clear = false;

        // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
        this.renderToScreen = false;
    }

    setSize (/* width, height */) {

    }

    public render (renderer: any, writeBuffer: any, readBuffer: any, deltaTime: any, maskActive: any):void {
        console.error('THREE.Pass: .render() must be implemented in derived pass.');
    }
}

// Helper for passes that need to fill the viewport with a single quad.

const _camera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 0.5);

// https://github.com/mrdoob/three/pull/21358

const _geometry = new BufferGeometry();
_geometry.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
_geometry.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

class FullScreenQuad {
    _mesh: Mesh
    constructor (material:Material) {
        this._mesh = new Mesh(_geometry, material);
    }

    get material (): Material {
        return (this._mesh.material as Material);
    }

    set material (value) {
        this._mesh.material = value;
    }

    dispose (): void {
        this._mesh.geometry.dispose();
    }

    render (renderer: MapRenderer): void {
        renderer.render(this._mesh, _camera);
    }
}

export { ComputedPass, FullScreenQuad };
