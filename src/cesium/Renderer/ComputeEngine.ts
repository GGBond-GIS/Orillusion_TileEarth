import { defined } from '../Core/defined';
import { GeographicReprojectMaterial } from '../Material/GeographicReprojectMaterial';
import { ComputeCommand } from '../Renderer/ComputeCommand';
import { ComputedShaderPass } from '../Renderer/ComputedShaderPass';
import { Context } from '../Scene/Context';
import { Texture, Vector4, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { MapRenderer } from '../Scene/MapRenderer';
import { Scene } from '../Scene/Scene';

// const bufferSize = new Vector2();

class ComputeEngine {
    renderTarget: WebGLRenderTarget;
    _scene: Scene;
    readonly _context: Context;
    _renderer: MapRenderer;
    effectComposer: EffectComposer | undefined;
    computedShaderPass: ComputedShaderPass | undefined;
    constructor (scene: Scene, context: Context) {
        this._scene = scene;
        this._renderer = scene.renderer;

        this._context = context;

        // 绘制结果保存对象
        this.renderTarget = new WebGLRenderTarget(256, 256);

        // this._renderer = new WebGLRenderer();

        this.effectComposer = undefined;

        this.computedShaderPass = undefined;
    }

    // 更新要绘制结果的纹理
    updateRenderTarget (texture: Texture): void {
        // texture.needsUpdate = true;
        const { width, height } = texture.image;

        this.renderTarget.setSize(width, height);
        this.renderTarget.setTexture(texture);

        // bufferSize.copy(this._scene.drawingBufferSize);

        // this._renderer.setSize(width, height);
        (this.effectComposer as EffectComposer).setSize(width, height);

        this._renderer.clear();
        (this.effectComposer as EffectComposer).reset(this.renderTarget);
    }

    execute (computeCommand: ComputeCommand): void {
        const renderTarget = this.renderTarget;
        // 预执行
        if (defined(computeCommand.preExecute)) {
            computeCommand.preExecute(computeCommand);
        }

        if (!defined(this.effectComposer)) {
            this.effectComposer = new EffectComposer(this._renderer, this.renderTarget);
            this.effectComposer.renderToScreen = false;
            this.computedShaderPass = new ComputedShaderPass(new GeographicReprojectMaterial());
            // this.computedShaderPass.clear = true;
            this.effectComposer.addPass(this.computedShaderPass);
        }

        const computedShaderPass = this.computedShaderPass as ComputedShaderPass;

        const outputTexture = computeCommand.outputTexture;

        // 根据texture更新target尺寸
        this.updateRenderTarget(outputTexture);

        computedShaderPass.fsQuad._mesh.geometry = computeCommand.geometry;
        computedShaderPass.fsQuad._mesh.frustumCulled = false;
        (computedShaderPass.material as GeographicReprojectMaterial).uniforms.u_texture.value = (computeCommand.material as any).texture;
        (computedShaderPass.material as GeographicReprojectMaterial).textureDimensions = (computeCommand.material as any).textureDimensions;

        (this.effectComposer as EffectComposer).render();

        (computedShaderPass.material as GeographicReprojectMaterial).uniforms.u_texture.value.dispose();

        if (defined(computeCommand.postExecute)) {
            computeCommand.postExecute(renderTarget.texture);
        }
    }
}
export { ComputeEngine };
