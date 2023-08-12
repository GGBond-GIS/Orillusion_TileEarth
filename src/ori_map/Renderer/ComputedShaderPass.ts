/* eslint-disable max-statements-per-line */
import { MapRenderer } from '../Scene/MapRenderer';
import {
    Material,
    RawShaderMaterial,
    ShaderMaterial,
    UniformsUtils,
    WebGLRenderTarget
} from 'three';
import { ComputedPass, FullScreenQuad } from './ComputedPass';

class ComputedShaderPass extends ComputedPass {
    uniforms: any;
    textureID: string;
    material: Material | undefined;
    fsQuad: FullScreenQuad;
    constructor (shader: any, textureID?: string) {
        super();

        this.textureID = textureID !== undefined
            ? textureID
            : 'tDiffuse';

        if (shader instanceof ShaderMaterial) {
            this.uniforms = shader.uniforms;

            this.material = shader;
        } else if (shader) {
            this.uniforms = UniformsUtils.clone(shader.uniforms);

            this.material = new ShaderMaterial({

                // defines: {  ...shader.defines },
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader

            });
        }

        this.fsQuad = new FullScreenQuad((this.material as Material));
    }

    public render (renderer:MapRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget /*, deltaTime, maskActive */): void {
        if (this.uniforms[this.textureID]) {
            this.uniforms[this.textureID].value = readBuffer.texture;
        }

        this.fsQuad.material = (this.material as Material);

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);
        } else {
            renderer.setRenderTarget(writeBuffer);
            // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three/pull/15571#issuecomment-465669600
            if (this.clear) {
                renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
            }
            this.fsQuad.render(renderer);
        }
    }
}

export { ComputedShaderPass };
