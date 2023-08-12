

import { WebGLCapabilities, WebGLRenderer, WebGLExtensions, WebGLClipping, Material, Scene } from "three";
import { WebGLBindingStates } from "three/src/renderers/webgl/WebGLBindingStates";
import { WebGLCubeMaps } from "three/src/renderers/webgl/WebGLCubeMaps";
import { WebGLProgram } from "./WebGLProgram";



export class WebGLPrograms {
    constructor(
        renderer: WebGLRenderer,
        cubemaps: WebGLCubeMaps,
        extensions: WebGLExtensions,
        capabilities: WebGLCapabilities,
        bindingStates: WebGLBindingStates,
        clipping: WebGLClipping,
    );

    programs: WebGLProgram[];

    getParameters(material: Material, lights: any, shadows: object[], scene: Scene, object: any): any;
    getProgramCacheKey(parameters: any): string;
    getUniforms(material: Material): object;
    acquireProgram(parameters: any, cacheKey: string): WebGLProgram;
    releaseProgram(program: WebGLProgram): void;
}
