import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { Context } from '../Scene/Context';
import { ContextLimits } from '../Scene/ContextLimits';
import { ShaderMaterial } from 'three';
import { ShaderCache } from './ShaderCache';
import { ShaderSource } from './ShaderSource';

function handleUniformPrecisionMismatches (
    vertexShaderText: string,
    fragmentShaderText: string
) {
    // If a uniform exists in both the vertex and fragment shader but with different precision qualifiers,
    // give the fragment shader uniform a different name. This fixes shader compilation errors on devices
    // that only support mediump in the fragment shader.
    const duplicateUniformNames = {};

    // if (!ContextLimits.highpFloatSupported || !ContextLimits.highpIntSupported) {
    //     let i, j;
    //     let uniformName;
    //     let duplicateName;
    //     const vertexShaderUniforms = extractUniforms(vertexShaderText);
    //     const fragmentShaderUniforms = extractUniforms(fragmentShaderText);
    //     const vertexUniformsCount = vertexShaderUniforms.length;
    //     const fragmentUniformsCount = fragmentShaderUniforms.length;

    //     for (i = 0; i < vertexUniformsCount; i++) {
    //         for (j = 0; j < fragmentUniformsCount; j++) {
    //             if (vertexShaderUniforms[i] === fragmentShaderUniforms[j]) {
    //                 uniformName = vertexShaderUniforms[i];
    //                 duplicateName = 'czm_mediump_' + uniformName;
    //                 // Update fragmentShaderText with renamed uniforms
    //                 const re = new RegExp(uniformName + '\\b', 'g');
    //                 fragmentShaderText = fragmentShaderText.replace(re, duplicateName);
    //                 duplicateUniformNames[duplicateName] = uniformName;
    //             }
    //         }
    //     }
    // }

    return {
        fragmentShaderText: fragmentShaderText,
        duplicateUniformNames: duplicateUniformNames
    };
}

export interface CachedShaderOptions {
    cache: ShaderCache,
    // eslint-disable-next-line no-use-before-define
    shaderProgram: ShaderProgram,
    keyword: string,
    derivedKeywords: any[],
    count: number
}
let nextShaderProgramId = 0;
class ShaderProgram {
    _cachedShader?: CachedShaderOptions

    _vertexShaderSource: ShaderSource;
    _vertexShaderText: string;
    _fragmentShaderSource: ShaderSource;
    _fragmentShaderText: string;

    _attributeLocations?: { [name: string]: any };
    id: number;
    material: ShaderMaterial;
    constructor (options: {
        vertexShaderSource: ShaderSource,
        vertexShaderText: string,
        fragmentShaderSource: ShaderSource,
        fragmentShaderText: string,
        attributeLocations?: { [name: string]: number },
        [propName: string]: any
    }) {
        const vertexShaderText = options.vertexShaderText;
        const fragmentShaderText = options.fragmentShaderText;

        // if (typeof spector !== 'undefined') {
        //     // The #line statements common in Cesium shaders interfere with the ability of the
        //     // SpectorJS to show errors on the correct line. So remove them when SpectorJS
        //     // is active.
        //     vertexShaderText = vertexShaderText.replace(/^#line/gm, '//#line');
        //     fragmentShaderText = fragmentShaderText.replace(/^#line/gm, '//#line');
        // }

        const modifiedFS = handleUniformPrecisionMismatches(
            vertexShaderText,
            fragmentShaderText
        );

        this._attributeLocations = options.attributeLocations;

        // this._numberOfVertexAttributes = undefined;
        // this._vertexAttributes = undefined;
        // this._uniformsByName = undefined;
        // this._uniforms = undefined;
        // this._automaticUniforms = undefined;
        // this._manualUniforms = undefined;
        // this._duplicateUniformNames = modifiedFS.duplicateUniformNames;
        this._cachedShader = undefined; // Used by ShaderCache

        /**
         * @private
         */
        // this.maximumTextureUnitIndex = undefined;

        this._vertexShaderSource = options.vertexShaderSource;
        this._vertexShaderText = options.vertexShaderText;
        this._fragmentShaderSource = options.fragmentShaderSource;
        this._fragmentShaderText = modifiedFS.fragmentShaderText;

        this.material = options.material;

        if (defined(this.material)) {
            this.material.vertexShader = this._vertexShaderText;
            this.material.fragmentShader = this._fragmentShaderText;
        }
        /**
         * @private
         */
        this.id = nextShaderProgramId++;
    }

    get vertexShaderSource (): ShaderSource {
        return this._vertexShaderSource;
    }

    get fragmentShaderSource (): ShaderSource {
        return this._fragmentShaderSource;
    }

    static fromCache (options: {
        fragmentShaderSource: ShaderSource | string,
        vertexShaderSource: ShaderSource | string,
        context: Context,
        attributeLocations?: {
            [name: string]: number
        },
        material?: any
    } = {} as any): ShaderProgram {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as any;

        return options.context.shaderCache.getShaderProgram(options);
    }

    _bind (): void {
        initialize(this);
    }
}

function initialize (shader: ShaderProgram) {
    // if (defined(shader._program)) {
    //     return;
    // }

    // reinitialize(shader);
}

export { ShaderProgram };
