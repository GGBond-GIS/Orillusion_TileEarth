
import { Color, Engine3D, MaterialBase, Matrix4, MorphTarget_shader, RenderShader, ShaderLib, Texture, UUID, UnLit, UnLitMaterial, UniformGPUBuffer, Vector2, Vector3, Vector4 } from '@orillusion/core';
import { defined } from '../Core/defined';
import { TileMaterialShader } from './TileMaterialShader';




class TileMaterial extends MaterialBase {
    defines: any;
    uniforms: any;
    modifiedModelView: UniformGPUBuffer;
    u_dayTextureT: UniformGPUBuffer;
    shader: RenderShader;

    /**
     *@constructor
     */
    constructor(parameters = {}, shaderSetOptions?: any) {
        super();
        // console.log();
        this.modifiedModelView = new UniformGPUBuffer(128);
        this.u_dayTextureT = new UniformGPUBuffer(1024);
        this.defines = {};
        this.uniforms = {
            u_dayTextures: { value: [] },
            u_dayTextureTranslationAndScale: { value: [] },
            u_dayTextureTexCoordsRectangle: { value: [] },
            u_initialColor: { value: new Vector4(0, 0, 0.5, 1) },
            u_tileRectangle: { value: new Vector4() },
            rtc: { value: new Vector3() },
            u_minMaxHeight: { value: new Vector2() },
            u_scaleAndBias: { value: new Matrix4() },
            u_center3D: { value: new Vector3() },
            u_modifiedModelView: { value: new Matrix4() },
            u_modifiedModelViewProjection: { value: new Matrix4() }
        };
        this.defines.TEXTURE_UNITS = shaderSetOptions.numberOfDayTextures;
        // this.glslVersion = GLSL3;
        this.defines.APPLY_GAMMA = '';

        this.defines.GROUND_ATMOSPHERE = '';
        let shaderName = 'daytexteure_'+shaderSetOptions.numberOfDayTextures;
        console.log(this.getwgsl(shaderSetOptions.numberOfDayTextures));
        ShaderLib.register(shaderName, this.getwgsl(shaderSetOptions.numberOfDayTextures));

        let shader = this.shader = this.setShader(shaderName, shaderName);
        shader.setShaderEntry(`VertMain`, `FragMain`)

        shader.setUniformVector4(`transformUV1`, new Vector4(0, 0, 1, 1));
        shader.setUniformVector4(`transformUV2`, new Vector4(0, 0, 1, 1));
        shader.setUniformColor(`baseColor`, new Color());
        shader.setUniformFloat(`alphaCutoff`, 0.5);
        this.modifiedModelView.setMatrix('matrixMVP_RTE', Matrix4.help_matrix_0);

        // this.modifiedModelView.apply();
        shader.setUniformBuffer(`modifiedModelView`, this.modifiedModelView);
        shader.setUniformBuffer(`u_dayTextureT`, this.u_dayTextureT);
        let shaderState = shader.shaderState;
        shaderState.acceptShadow = false;
        shaderState.receiveEnv = false;
        shaderState.acceptGI = false;
        shaderState.useLight = false;

        shader.setUniformColor("ccc", new Color(1.0, 0.0, 0.0, 1.0));
        // create a image material
        // let mat = new ImageMaterial()
        // mat.baseMap = texture
        // default value
        // this.baseMap = Engine3D.res.whiteTexture;

    }

    get dayTextures(): Texture[] {
        return this.uniforms.u_dayTextures.value;
    }

    set dayTextures(value) {
        if (!defined(value)) {
            return;
        }

        this.uniforms.u_dayTextures.value = value;
        value.forEach((res: Texture, index: number) => {
            this.shader.setTexture(`u_dayTextures${index}`, res)
        })

    }

    get dayTextureTranslationAndScale() {

        return this.uniforms.u_dayTextureTranslationAndScale.value;
    }

    set dayTextureTranslationAndScale(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTranslationAndScale.value = value;
        value.forEach((res: Vector4, index: number) => {
            this.u_dayTextureT.setVector4(`u_dayTextureTranslationAndScale${index}`, res)
        })
        this.u_dayTextureT.apply();
    }

    get dayTextureTexCoordsRectangle() {
        return this.uniforms.u_dayTextureTexCoordsRectangle.value;
    }

    set dayTextureTexCoordsRectangle(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTexCoordsRectangle.value = value;
        value.forEach((res: Vector4, index: number) => {
            this.u_dayTextureT.setVector4(`u_dayTextureTexCoordsRectangle${index}`, res)
        })
        this.u_dayTextureT.apply();
    }

    get initialColor() {
        return this.uniforms.u_initialColor.value;
    }

    set initialColor(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_initialColor.value.copy(value);
    }

    /**
     * Set material environment map
     */
    public set envMap(texture: Texture) {
        //not need env texture
    }

    /**
     * Set material shadow map
     */
    public set shadowMap(texture: Texture) {
        //not need shadowMap texture
    }

    getwgsl(num: number) {
        let ddf = ``;

        for (let index = 0; index < num; index++) {
            ddf += /*wgsl*/ `
            u_dayTextureTranslationAndScale${index}:vec4<f32>,
            u_dayTextureTexCoordsRectangle${index}:vec4<f32>,
            `
        }
        // var u_dayTextures${index}: texture_2d<f32>;
        // var u_dayTextureTexCoordsRectangle${index}: vec4<f32>;
        let uniform = /*wgsl*/`
        struct DayTextureT {
            ${ddf}
        };
        @group(3) @binding(0)
        var<uniform> u_dayTextureT:  DayTextureT;

        
        `

        for (let index = 0; index < num; index++) {
            uniform+= /*wgsl*/`
           @group(3) @binding(${1+index})
           var u_dayTextures${index}: texture_2d<f32>;
           `
        }



        let sdf = ``
        for (let i = 0; i < 1; i++) {
            let str = ''
            // if(dayTextureUseWebMercatorT[i]){
            //     str = `tileTextureCoordinates = v_textureCoordinates.xz;`
            // }else{
            //     str = `tileTextureCoordinates = v_textureCoordinates.xy;`
            // }
            sdf += `

                var textureAlpha${i} = 1.0;

                var textureCoordinateRectangle${i} = u_dayTextureT.u_dayTextureTexCoordsRectangle${i};
                var textureCoordinateTranslationAndScale${i} = u_dayTextureT.u_dayTextureTranslationAndScale${i};
                var alphaMultiplier${i} = step(textureCoordinateRectangle${i}.xy, tileTextureCoordinates);
                textureAlpha${i} = textureAlpha${i} * alphaMultiplier${i}.x * alphaMultiplier${i}.y;
                alphaMultiplier${i} = step(vec2<f32>(.0,.0), textureCoordinateRectangle${i}.zw - tileTextureCoordinates);
                textureAlpha${i} = textureAlpha${i} * alphaMultiplier${i}.x * alphaMultiplier${i}.y;

                var translation${i} = textureCoordinateTranslationAndScale${i}.xy;
                var scale${i} = textureCoordinateTranslationAndScale${i}.zw;
                var textureCoordinates${i} = tileTextureCoordinates * scale${i} + translation${i};
                
                
                var value${i} = textureSample(u_dayTextures${i},baseMapSampler,textureCoordinates${i}.yx) ;
                //  texture2D(u_dayTextures${i}, textureCoordinates${i});
                var color${i} = value${i}.rgb;
                var alpha${i} = value${i}.a;
                var sourceAlpha${i} = alpha${i} * textureAlpha${i};
                var outAlpha${i} = mix(previousColor.a, 1.0, sourceAlpha${i});
                var outColor${i} = mix(previousColor.rgb * 1.0 , color${i}, sourceAlpha${i}) / outAlpha${i};
                previousColor = vec4(outColor${i}, outAlpha${i});
            
            `
        }



        let wgsl = /*wgsl*/ `
        #include "Common_vert"
        #include "Common_frag"
        #include "UnLit_frag"
        #include "UnLitMaterialUniform_frag"
    
        @group(1) @binding(0)
        var baseMapSampler: sampler;
        @group(1) @binding(1)
        var baseMap: texture_2d<f32>;
    
    
    
        struct MVPMatrix {
            matrixMVP_RTE: mat4x4<f32>,
        };
        
        @group(2) @binding(0)
        var<uniform> modifiedModelView: MVPMatrix;
    

        
        ${uniform}
    
        
        fn Tile_ORI_Vert(vertex:VertexAttributes){
            var vertexPosition = vertex.position;
            var vertexNormal = vertex.normal;
        
            #if USE_MORPHTARGETS
            ${MorphTarget_shader.getMorphTargetCalcVertex()}    
            #endif
        
            // #if USE_SKELETON
            //     #if USE_JOINT_VEC8
            //         let skeletonNormal = getSkeletonWorldMatrix_8(vertex.joints0, vertex.weights0, vertex.joints1, vertex.weights1);
            //         ORI_MATRIX_M *= skeletonNormal ;
            //     #else
            //         let skeletonNormal = getSkeletonWorldMatrix_4(vertex.joints0, vertex.weights0);
            //         ORI_MATRIX_M *= skeletonNormal ;
            //     #endif
            // #endif
        
            // #if USE_TANGENT
            //     ORI_VertexOut.varying_Tangent = vertex.TANGENT ;
            // #endif
        
            ORI_NORMALMATRIX = transpose(inverse( mat3x3<f32>(ORI_MATRIX_M[0].xyz,ORI_MATRIX_M[1].xyz,ORI_MATRIX_M[2].xyz) ));
        
            var worldPos = (ORI_MATRIX_M * vec4<f32>(vertexPosition.xyz, 1.0));
            var viewPosition = ORI_MATRIX_V  * worldPos;
            var clipPosition = ORI_MATRIX_P *  modifiedModelView.matrixMVP_RTE * vec4<f32>(vertexPosition.xyz, 1.0) ;
            clipPosition = applyLogarithmicDepth(clipPosition,0.1,10000000000.0);
            ORI_CameraWorldDir = normalize(ORI_CAMERAMATRIX[3].xyz - worldPos.xyz) ;
        
            ORI_VertexOut.varying_UV0 = vertex.uv.xy ;
            ORI_VertexOut.varying_UV1 = vertex.TEXCOORD_1.xy;
            ORI_VertexOut.varying_ViewPos = viewPosition / viewPosition.w;
            ORI_VertexOut.varying_Clip = clipPosition ;
            ORI_VertexOut.varying_WPos = worldPos ;
            ORI_VertexOut.varying_WPos.w = f32(vertex.index);
            ORI_VertexOut.varying_WNormal = normalize(ORI_NORMALMATRIX * vertexNormal.xyz) ;
            ORI_VertexOut.member = clipPosition;
            }
    
            fn applyLogarithmicDepth(
                clipPosition: vec4<f32>,
                logarithmicDepthConstant: f32,
                perspectiveFarPlaneDistance: f32) -> vec4<f32>
           {
               let z = ((2.0 * log((logarithmicDepthConstant * clipPosition.z) + 1.0) / 
                              log((logarithmicDepthConstant * perspectiveFarPlaneDistance) + 1.0)) - 1.0) * clipPosition.w;
           
               return vec4<f32>(clipPosition.x,clipPosition.y,z,clipPosition.w);
           }
    
    
        fn vert(inputData:VertexAttributes) -> VertexOutput {
            Tile_ORI_Vert(inputData) ;
            return ORI_VertexOut ;
        }
        fn frag(){
            var transformUV1 = materialUniform.transformUV1;
            var transformUV2 = materialUniform.transformUV2;
            var tileTextureCoordinates = ORI_VertexVarying.fragUV0;
            let color = textureSample(u_dayTextures0,baseMapSampler,ORI_VertexVarying.fragUV0) ;
            if(color.w < 0.5){
                discard ;
            }
            var previousColor = vec4<f32>(0.0, 0.0, 0.5, 1.0);
         
            ${sdf}

            ORI_ShadingInput.BaseColor = color;
            UnLit();
        }
        `
        return wgsl
    }


    public clone(): this {
        // console.log(`clone LitMaterial ${this.name}`);

        let ret = new UnLitMaterial();
        ret.baseMap = this.baseMap;
        ret.normalMap = this.normalMap;
        ret.emissiveMap = this.emissiveMap;
        this.uvTransform_1 && (ret.uvTransform_1 = new Vector4().copyFrom(this.uvTransform_1));
        this.uvTransform_2 && (ret.uvTransform_2 = new Vector4().copyFrom(this.uvTransform_2));
        ret.baseColor = this.baseColor.clone();
        ret.emissiveColor = this.emissiveColor.clone();
        ret.envIntensity = this.envIntensity;
        ret.normalScale = this.normalScale;
        ret.emissiveIntensity = this.emissiveIntensity;
        ret.alphaCutoff = this.alphaCutoff;

        ret.transparent = this.transparent;
        ret.cullMode = this.cullMode;
        ret.blendMode = this.blendMode;

        this.cloneObject(this.shaderState, ret.shaderState);
        this.cloneObject(this.renderShader.defineValue, ret.renderShader.shaderState);
        this.cloneObject(this.renderShader.constValues, ret.renderShader.constValues);

        return ret as this;
    }

    debug() {
    }
}

export { TileMaterial };
