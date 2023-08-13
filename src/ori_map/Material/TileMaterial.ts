
import { Color, Engine3D, MaterialBase, Matrix4, ShaderLib, Texture, UnLit, UnLitMaterial, UniformGPUBuffer, Vector2, Vector3, Vector4 } from '@orillusion/core';
import { defined } from '../Core/defined';
import { TileMaterialShader } from './TileMaterialShader';




class TileMaterial extends MaterialBase {
    defines: any;
    uniforms: any;
    modifiedModelView: UniformGPUBuffer;
    shader: any;
    
    /**
     *@constructor
     */
    constructor(parameters = {}, shaderSetOptions?: any) {
        super();
        this.modifiedModelView = new UniformGPUBuffer(128);
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
        ShaderLib.register("UnLitShader", TileMaterialShader);

        let shader = this.shader = this.setShader(`UnLitShader`, `UnLitShader`);
        shader.setShaderEntry(`VertMain`, `FragMain`)

        shader.setUniformVector4(`transformUV1`, new Vector4(0, 0, 1, 1));
        shader.setUniformVector4(`transformUV2`, new Vector4(0, 0, 1, 1));
        shader.setUniformColor(`baseColor`, new Color());
        shader.setUniformFloat(`alphaCutoff`, 0.5);
        this.modifiedModelView.setMatrix('matrixMVP_RTE', Matrix4.help_matrix_0);
        // this.modifiedModelView.apply();
        shader.setUniformBuffer(`modifiedModelView`,this.modifiedModelView);
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
        this.baseMap = Engine3D.res.whiteTexture;
    
    }

    get dayTextures(): Texture[] {
        return this.uniforms.u_dayTextures.value;
    }

    set dayTextures(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextures.value = value;
    }

    get dayTextureTranslationAndScale() {

        return this.uniforms.u_dayTextureTranslationAndScale.value;
    }

    set dayTextureTranslationAndScale(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTranslationAndScale.value = value;
    }

    get dayTextureTexCoordsRectangle() {
        return this.uniforms.u_dayTextureTexCoordsRectangle.value;
    }

    set dayTextureTexCoordsRectangle(value) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTexCoordsRectangle.value = value;
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
