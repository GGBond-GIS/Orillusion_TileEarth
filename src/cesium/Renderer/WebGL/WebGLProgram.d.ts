import { WebGLRenderer, WebGLUniforms, WebGLShader } from "three";
import { WebGLBindingStates } from "three/src/renderers/webgl/WebGLBindingStates";


export class WebGLProgram {
    constructor(renderer: WebGLRenderer, cacheKey: string, parameters: object, bindingStates: WebGLBindingStates);

    name: string;
    id: number;
    cacheKey: string; // unique identifier for this program, used for looking up compiled programs from cache.

    /**
     * @default 1
     */
    usedTimes: number;
    program: any;
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    /**
     * @deprecated Use {@link WebGLProgram#getUniforms getUniforms()} instead.
     */
    uniforms: any;
    /**
     * @deprecated Use {@link WebGLProgram#getAttributes getAttributes()} instead.
     */
    attributes: any;

    getUniforms(): WebGLUniforms;
    getAttributes(): any;
    destroy(): void;
}
