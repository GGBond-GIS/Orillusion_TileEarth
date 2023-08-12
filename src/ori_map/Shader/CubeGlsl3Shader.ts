import { ShaderLib } from 'three';
import { envmap_fragment } from './envmap_fragment';
import { fragmentIn, varyingExp, vertexOut } from './ShaderReplace';

const cube = ShaderLib.cube;

const fragmentShader = `

#include <envmap_common_pars_fragment>
uniform float opacity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>

void main() {
    vec3 vReflect = vWorldDirection;
    ${envmap_fragment}
    gl_FragColor = envColor;
    gl_FragColor.a *= opacity;
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    
}`;
cube.vertexShader = cube.vertexShader.replace(varyingExp, vertexOut);
cube.fragmentShader = fragmentShader.replace(varyingExp, fragmentIn);

export { cube };
