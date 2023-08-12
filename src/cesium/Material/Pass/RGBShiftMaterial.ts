import { RGBShiftShader } from '../Shader/RGBShiftShader';
import { ShaderMaterial, UniformsUtils } from 'three';

class RGBShiftMaterial extends ShaderMaterial {
    constructor () {
        super();
        this.uniforms = UniformsUtils.clone(RGBShiftShader.uniforms);
        this.vertexShader = RGBShiftShader.vertexShader;
        this.fragmentShader = RGBShiftShader.fragmentShader;
    }
}

export { RGBShiftMaterial };
