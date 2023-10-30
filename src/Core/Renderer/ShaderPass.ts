import {
    ShaderMaterial,
    UniformsUtils,
    WebGLRenderer
} from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';

class ShaderPass extends Pass {
    textureID: string;
    fsQuad: FullScreenQuad;
    uniforms: { [name: string]: any };
    material: ShaderMaterial
    constructor (shader: ShaderMaterial, textureID?: string) {
        super();

        this.textureID = (textureID !== undefined) ? textureID : 'colorTexture';

        this.uniforms = shader.uniforms;

        this.material = shader;

        this.fsQuad = new FullScreenQuad(this.material);
    }

    render (renderer: WebGLRenderer, writeBuffer: any, readBuffer: any /*, deltaTime, maskActive */): void {
        if (this.uniforms[this.textureID]) {
            this.uniforms[this.textureID].value = readBuffer.texture[0];
        }

        this.fsQuad.material = this.material;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
            if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
            this.fsQuad.render(renderer);
        }
    }
}

export { ShaderPass };
