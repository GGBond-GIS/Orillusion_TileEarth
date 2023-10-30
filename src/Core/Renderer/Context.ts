import { Cartesian2 } from '../../Math/Cartesian2';
import { DrawMeshCommand } from '../../ori_map/Renderer/DrawMeshCommand';
import { ShaderCache } from '../../ori_map/Renderer/ShaderCache';
import { ShaderProgram } from '../../ori_map/Renderer/ShaderProgram';
import { UniformState } from '../../ori_map/Renderer/UniformState';
import { ContextLimits } from './ContextLimits';
import { CesiumScene } from '../Scene/CesiumScene';

class Context {
    scene: CesiumScene;
    logShaderCompilation = false
    public cache: {
        [name: string]: any
    } = {};

    drawingBufferHeight = new Cartesian2();

    _shaderCache = new ShaderCache(this)
    _us = new UniformState();
    constructor (scene: CesiumScene) {
        this.scene = scene;

        // const bufferSize = scene.drawingBufferSize;

        // const sceneFrameBuffer = new WebGLMultisampleRenderTarget(bufferSize.width, bufferSize.height, {
        //     format: RGBFormat
        // });

        // this._gl = scene.renderer.getContext();

        // this.sceneFrameBuffer = sceneFrameBuffer;

        // ContextLimits._maxAnisotropy = scene.renderer.capabilities.getMaxAnisotropy();
        // ContextLimits._maximumTextureImageUnits = scene.renderer.capabilities.maxTextures;
    }

    get uniformState (): UniformState {
        return this._us;
    }

    get id (): string {
        return this._id;
    }

    get colorTexture (): Texture {
        return this.sceneFrameBuffer.texture[0];
    }

    get depthTexture (): Texture {
        return this.sceneFrameBuffer.texture[1];
    }

    get normalTexture (): Texture {
        return this.sceneFrameBuffer.texture[2];
    }

    get shaderCache (): ShaderCache {
        return this._shaderCache;
    }

    get webgl2 (): boolean {
        // return this.scene.renderer.capabilities.isWebGL2;
        return false;
    }

    get textureFloatLinear (): boolean {
        return true;
    }

    get floatingPointTexture (): boolean {
        return true;
    }

    get debugShaders (): any {
        return {};
    }

    draw (drawCommand: DrawMeshCommand): void {
        // beginDraw(this, drawCommand.shaderProgram as ShaderProgram);
        (drawCommand.shaderProgram as ShaderProgram)._bind();
    }
}

function beginDraw (
    context: Context,

    shaderProgram: ShaderProgram

) {
    // shaderProgram._bind();
    // context._maxFrameTextureUnitIndex = Math.max(
    //     context._maxFrameTextureUnitIndex,
    //     shaderProgram.maximumTextureUnitIndex
    // );
}
export { Context };
