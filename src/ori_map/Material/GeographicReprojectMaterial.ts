import { defined } from '../Core/defined';
import { DoubleSide, RawShaderMaterial, Texture, Vector2 } from 'three';

const vs = `


attribute vec4 position;
attribute float webMercatorT;

uniform vec2 u_textureDimensions;

uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional

varying vec2 v_textureCoordinates;

void main()
{
    v_textureCoordinates = vec2(position.x, webMercatorT);
    // gl_Position = projectionMatrix * modelViewMatrix * (vec4(position.xyz, 1.0) * vec4(u_textureDimensions, 1.0, 1.0) + vec4(0.0, 0.0, 0.0, 0.0));

    gl_Position = projectionMatrix * modelViewMatrix * (vec4(position.xyz + vec3(-0.5, -0.5, 0.0), 1.0));
}
`;

const fs = `
precision mediump float;
precision mediump int;

uniform sampler2D u_texture;
uniform vec4 u_randomColor;
varying vec2 v_textureCoordinates;

void main()
{
    gl_FragColor = texture2D(u_texture, v_textureCoordinates);
}
`;
class GeographicReprojectMaterial extends RawShaderMaterial {
    constructor (parameters = {}) {
        super(parameters);

        this.lights = false;
        this.fog = false;

        this.uniforms = {
            u_texture: { value: new Texture() },
            u_textureDimensions: { value: new Vector2() }
        };

        this.vertexShader = vs;
        this.fragmentShader = fs;
        this.side = DoubleSide;
    }

    get texture ():Texture {
        return this.uniforms.u_texture.value;
    }

    set texture (value: Texture) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_texture.value = value;
    }

    get textureDimensions (): Vector2 {
        return this.uniforms.u_textureDimensions.value;
    }

    set textureDimensions (value: Vector2) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_textureDimensions.value.copy(value);
    }
}
export { GeographicReprojectMaterial };
