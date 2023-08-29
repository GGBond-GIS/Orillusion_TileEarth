
import { Color, Engine3D, MaterialBase, Matrix4, MorphTarget_shader, RenderShader, ShaderLib, Texture, UUID, UnLit, UnLitMaterial, UniformGPUBuffer, Vector2, Vector3, Vector4 } from '@orillusion/core';
import { defined } from '../Core/defined';
import { TileMaterialShader } from './TileMaterialShader';




class TileMaterial2 extends MaterialBase {
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
        this.u_dayTextureT = new UniformGPUBuffer(128);
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
        let shaderName = 'daytexteure_' + shaderSetOptions.numberOfDayTextures;
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
        for (let index = 0; index < value.length; index++) {
            const element = value[index];
            this.shader.setTexture(`u_dayTextures${index}`, element)

        }
    }

    get minMaxHeight(){
        return this.uniforms.u_minMaxHeight;
    }

    set minMaxHeight( res){
        this.uniforms.u_minMaxHeight = res;
        this.modifiedModelView.setVector2('u_minMaxHeight',res);
        this.modifiedModelView.apply();
    }

    get scaleAndBias(){
        return this.uniforms.u_scaleAndBias;
    }

    set scaleAndBias(res){
        this.uniforms.u_scaleAndBias = res;
        // this.shader.set('u_minMaxHeight',res);
        this.modifiedModelView.setMatrix('u_scaleAndBias',res);

        this.modifiedModelView.apply();


    }


    get dayTextureTranslationAndScale() {

        return this.uniforms.u_dayTextureTranslationAndScale.value;
    }

    set dayTextureTranslationAndScale(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTranslationAndScale.value = value;
        for (let index = 0; index < value.length; index++) {
            const element = value[index];
            this.u_dayTextureT.setVector4(`u_dayTextureTranslationAndScale${index}`, element)
        }

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
        for (let index = 0; index < value.length; index++) {
            const element = value[index];
            this.u_dayTextureT.setVector4(`u_dayTextureTexCoordsRectangle${index}`, element)

        }

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

    get QUANTIZATION_BITS12(){
        return this.uniforms.QUANTIZATION_BITS12
    }

    set QUANTIZATION_BITS12(res:boolean){
        this.uniforms.QUANTIZATION_BITS12 = res;
        this.shader.setDefine('QUANTIZATION_BITS12',res)
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
            let number = []
            for (let j = 0; j < 2; j++) {
                let n = index * 2 + j + 1;
                number.push(n);
            }
            uniform += /*wgsl*/`
            @group(3) @binding(${number[0]})
            var u_dayTextures${index}Sampler: sampler;
            @group(3) @binding(${number[1]})
            var u_dayTextures${index}: texture_2d<f32>;
           `
        }



        let sdf = ``
        for (let i = 0; i < num; i++) {
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
              
                
                var value${i} = textureSample(u_dayTextures${i},u_dayTextures${i}Sampler,vec2<f32>(textureCoordinates${i}.x,textureCoordinates${i}.y)).rgba;
                var color${i} = value${i}.rgb;
                var alpha${i} = value${i}.a;
                var sourceAlpha${i} = alpha${i} * textureAlpha${i};
                var outAlpha${i} = mix(previousColor.a,alpha${i}, sourceAlpha${i});
                var outColor${i} = mix(previousColor.rgb * 1.0 , color${i}, sourceAlpha${i}) / outAlpha${i};
                if(textureCoordinates${i}.x < 0.0 || textureCoordinates${i}.x > 1.0 ||  textureCoordinates${i}.y > 1.0  || textureCoordinates${i}.y < 0.0 ){
                    previousColor = previousColor;
                }else{
                    previousColor = vec4<f32>(outColor${i}, outAlpha${i});

                }
            `
        }



        let wgsl = /*wgsl*/ `
        #include "GlobalUniform"
        #include "WorldMatrixUniform"
        
        struct MVPMatrix {
            matrixMVP_RTE: mat4x4<f32>,
            u_minMaxHeight:vec2<f32>,
            u_scaleAndBias:mat4x4<f32>,
        };
        @group(2) @binding(0)
        var<uniform> modifiedModelView: MVPMatrix;
        
        ${uniform}

        fn czm_decompressTextureCoordinates(encoded:f32) -> vec2<f32>
        {
           let temp = encoded / 4096.0;
           let xZeroTo4095 = floor(temp);
           let stx = xZeroTo4095 / 4095.0;
           let sty = (encoded - xZeroTo4095 * 4096.0) / 4095.0;
           return vec2<f32>(stx, sty);
        }
       
        #include "GlobalUniform"
        #include "WorldMatrixUniform"


        struct VertexInput {
            @builtin(instance_index) index : u32,
            @location(0) position: vec3<f32>,
            @location(1) normal: vec3<f32>,
            @location(2) uv: vec2<f32>,
        };

        struct VertexOutput {
            @location(0) uv: vec2<f32>,
            @location(1) color: vec4<f32>,
            @location(2) worldPos: vec4<f32>,
            @location(3) depthBuf: f32,
            @location(4) compressed0: vec4<f32>,
            @builtin(position) member: vec4<f32>
        };
       
        fn applyLogarithmicDepth(
            clipPosition: vec4<f32>,
            logarithmicDepthConstant: f32,
            perspectiveFarPlaneDistance: f32) -> f32
       {
        let z =  log((clipPosition.z - logarithmicDepthConstant) / (perspectiveFarPlaneDistance - logarithmicDepthConstant) + 1.0) / log(2.0);
        return z;
       }

        @vertex
        fn VertMain( in: VertexInput ) -> VertexOutput {
         



            var out: VertexOutput;
            out.color = vec4<f32>(1, 1, 1, 1);

            #if QUANTIZATION_BITS12
            let xy = czm_decompressTextureCoordinates(in.compressed0.x);
            let zh = czm_decompressTextureCoordinates(in.compressed0.y);
            let position = vec3<f32>(xy, zh.x);
            out.uv = czm_decompressTextureCoordinates(in.compressed0.z);

            let clipPosition = (modifiedModelView.u_scaleAndBias * vec4(position, 1.0)).xyz;
            #else
            let clipPosition = globalUniform.projMat * modifiedModelView.matrixMVP_RTE * vec4<f32>(in.position.xyz,1.0);
            out.uv = in.uv;

            #endif
            out.depthBuf = applyLogarithmicDepth(clipPosition,0.1,10000000000.0);
            out.member = vec4<f32>(clipPosition.x,clipPosition.y,out.depthBuf,clipPosition.w);

            return out;
        }

        struct FragmentInput {
            @location(0) uv: vec2<f32>,
            @location(1) color: vec4<f32>,
            @location(2) worldPos: vec4<f32>,
            @location(3) depthBuf: f32,
            @builtin(position) member: vec4<f32>
        };

        struct FragmentOutput {
            @location(0) color: vec4<f32>,
            #if USE_WORLDPOS
                @location(1) worldPos: vec4<f32>,
            #endif
            #if USEGBUFFER
                @location(2) worldNormal: vec4<f32>,
                @location(3) material: vec4<f32>,
            #endif
        };

        @group(1) @binding(0)
        var baseMapSampler: sampler;
        @group(1) @binding(1)
        var baseMap: texture_2d<f32>;

        @fragment
        fn FragMain( in: FragmentInput ) -> FragmentOutput {
            var out: FragmentOutput;
            out.worldPos = in.worldPos;
            var tileTextureCoordinates = vec2<f32>(in.uv.x, in.uv.y);

            var previousColor = vec4<f32>(0.0, 0.0, 0.5, 1.0);
         
            ${sdf}

            
            
            out.color = previousColor;
            return out;
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

export { TileMaterial2 };
