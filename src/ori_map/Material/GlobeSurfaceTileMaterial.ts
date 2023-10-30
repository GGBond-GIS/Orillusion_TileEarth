import { CesiumColor } from '../../Math/CesiumColor';
import { GLSL3, Matrix4, RawShaderMaterial, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';

class GlobeSurfaceTileMaterial extends RawShaderMaterial {
    lights = false;
    fog = false;
    constructor (parameters = {}) {
        super(parameters);
        this.uniforms = {
            u_backFaceAlphaByDistance: { value: new Vector4() },
            u_center3D: { value: new Vector3() },
            u_clippingPlanesEdgeColor: { value: new Vector4() },
            u_clippingPlanesEdgeWidth: { value: 0 },
            u_colorsToAlpha: { value: [] },
            u_dayIntensity: { value: 0 },
            u_dayTextureAlpha: { value: [] },
            u_dayTextureBrightness: { value: [] },
            u_dayTextureContrast: { value: [] },
            u_dayTextureCutoutRectangles: { value: [] },
            u_dayTextureDayAlpha: { value: [] },
            u_dayTextureHue: { value: [] },
            u_dayTextureNightAlpha: { value: [] },
            u_dayTextureOneOverGamma: { value: [] },
            u_dayTextureSaturation: { value: [] },
            u_dayTextureSplit: { value: [] },
            u_dayTextureTexCoordsRectangle: { value: [] },
            u_dayTextureTranslationAndScale: { value: [] },
            u_dayTextureUseWebMercatorT: { value: [] },
            u_dayTextures: { value: [] },
            u_fillHighlightColor: { value: new Vector4() },
            u_frontFaceAlphaByDistance: { value: new Vector4() },
            u_hsbShift: { value: new Vector3() },
            u_initialColor: { value: new Vector4() },
            u_lightingFadeDistance: { value: new Vector2() },
            u_localizedCartographicLimitRectangle: { value: new Vector4() },
            u_localizedTranslucencyRectangle: { value: new Vector4() },
            u_minMaxHeight: { value: new Vector4() },
            u_modifiedModelView: { value: new Matrix4() },
            u_modifiedModelViewProjection: { value: new Matrix4() },
            u_nightFadeDistance: { value: new Vector2() },
            u_oceanNormalMap: { value: undefined },
            // u_rtc: { value: new Vector3() },
            u_scaleAndBias: { value: new Matrix4() },
            u_southAndNorthLatitude: { value: new Vector2() },
            u_southMercatorYAndOneOverHeight: { value: new Vector2() },
            u_terrainExaggerationAndRelativeHeight: { value: new Vector2() },
            u_tileRectangle: { value: new Vector4() },
            u_undergroundColor: { value: new CesiumColor() },
            u_undergroundColorAlphaByDistance: { value: new Vector4() },
            u_waterMask: { value: undefined },
            u_waterMaskTranslationAndScale: { value: new Vector4() },
            u_zoomedOutOceanSpecularIntensity: { value: 0.4 }
        };

        // this.wireframe = true;
        // this.glslVersion = GLSL3;
    }
}

export { GlobeSurfaceTileMaterial };
