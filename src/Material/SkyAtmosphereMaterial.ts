import { MaterialParameters, Matrix4, RawShaderMaterial, ShaderMaterial, Vector3 } from 'three';

class SkyAtmosphereMaterial extends RawShaderMaterial {
    constructor (parameters: MaterialParameters) {
        super(parameters);

        this.lights = false;
        this.fog = false;

        this.uniforms = {
            u_radiiAndDynamicAtmosphereColor: { value: new Vector3() },
            u_hsbShift: { value: new Vector3() }
        };
    }
}

export { SkyAtmosphereMaterial };
