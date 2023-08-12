// This file is automatically rebuilt by the Cesium build process.
import * as czm_degreesPerRadian from './Constants/degreesPerRadian.glsl';
import czm_depthRange from './Constants/depthRange.glsl';
import czm_epsilon1 from './Constants/epsilon1.glsl';
import czm_epsilon2 from './Constants/epsilon2.glsl';
import czm_epsilon3 from './Constants/epsilon3.glsl';
import czm_epsilon4 from './Constants/epsilon4.glsl';
import czm_epsilon5 from './Constants/epsilon5.glsl';
import czm_epsilon6 from './Constants/epsilon6.glsl';
import czm_epsilon7 from './Constants/epsilon7.glsl';
import czm_infinity from './Constants/infinity.glsl';
import czm_oneOverPi from './Constants/oneOverPi.glsl';
import czm_oneOverTwoPi from './Constants/oneOverTwoPi.glsl';
import czm_passCesium3DTile from './Constants/passCesium3DTile.glsl';
import czm_passCesium3DTileClassification from './Constants/passCesium3DTileClassification.glsl';
import czm_passCesium3DTileClassificationIgnoreShow from './Constants/passCesium3DTileClassificationIgnoreShow.glsl';
import czm_passClassification from './Constants/passClassification.glsl';
import czm_passCompute from './Constants/passCompute.glsl';
import czm_passEnvironment from './Constants/passEnvironment.glsl';
import czm_passGlobe from './Constants/passGlobe.glsl';
import czm_passOpaque from './Constants/passOpaque.glsl';
import czm_passOverlay from './Constants/passOverlay.glsl';
import czm_passTerrainClassification from './Constants/passTerrainClassification.glsl';
import czm_passTranslucent from './Constants/passTranslucent.glsl';
import czm_pi from './Constants/pi.glsl';
import czm_piOverFour from './Constants/piOverFour.glsl';
import czm_piOverSix from './Constants/piOverSix.glsl';
import czm_piOverThree from './Constants/piOverThree.glsl';
import czm_piOverTwo from './Constants/piOverTwo.glsl';
import czm_radiansPerDegree from './Constants/radiansPerDegree.glsl';
import czm_sceneMode2D from './Constants/sceneMode2D.glsl';
import czm_sceneMode3D from './Constants/sceneMode3D.glsl';
import czm_sceneModeColumbusView from './Constants/sceneModeColumbusView.glsl';
import czm_sceneModeMorphing from './Constants/sceneModeMorphing.glsl';
import czm_solarRadius from './Constants/solarRadius.glsl';
import czm_threePiOver2 from './Constants/threePiOver2.glsl';
import czm_twoPi from './Constants/twoPi.glsl';
import czm_webMercatorMaxLatitude from './Constants/webMercatorMaxLatitude.glsl';
import czm_depthRangeStruct from './Structs/depthRangeStruct.glsl';
import czm_material from './Structs/material.glsl';
import czm_materialInput from './Structs/materialInput.glsl';
import czm_pbrParameters from './Structs/pbrParameters.glsl';
import czm_ray from './Structs/ray.glsl';
import czm_raySegment from './Structs/raySegment.glsl';
import czm_shadowParameters from './Structs/shadowParameters.glsl';
import czm_HSBToRGB from './Functions/HSBToRGB.glsl';
import czm_HSLToRGB from './Functions/HSLToRGB.glsl';
import czm_RGBToHSB from './Functions/RGBToHSB.glsl';
import czm_RGBToHSL from './Functions/RGBToHSL.glsl';
import czm_RGBToXYZ from './Functions/RGBToXYZ.glsl';
import czm_XYZToRGB from './Functions/XYZToRGB.glsl';
import czm_acesTonemapping from './Functions/acesTonemapping.glsl';
import czm_alphaWeight from './Functions/alphaWeight.glsl';
import czm_antialias from './Functions/antialias.glsl';
import czm_approximateSphericalCoordinates from './Functions/approximateSphericalCoordinates.glsl';
import czm_backFacing from './Functions/backFacing.glsl';
import czm_branchFreeTernary from './Functions/branchFreeTernary.glsl';
import czm_cascadeColor from './Functions/cascadeColor.glsl';
import czm_cascadeDistance from './Functions/cascadeDistance.glsl';
import czm_cascadeMatrix from './Functions/cascadeMatrix.glsl';
import czm_cascadeWeights from './Functions/cascadeWeights.glsl';
import czm_columbusViewMorph from './Functions/columbusViewMorph.glsl';
import czm_computePosition from './Functions/computePosition.glsl';
import czm_cosineAndSine from './Functions/cosineAndSine.glsl';
import czm_decompressTextureCoordinates from './Functions/decompressTextureCoordinates.glsl';
import czm_defaultPbrMaterial from './Functions/defaultPbrMaterial.glsl';
import czm_depthClamp from './Functions/depthClamp.glsl';
import czm_eastNorthUpToEyeCoordinates from './Functions/eastNorthUpToEyeCoordinates.glsl';
import czm_ellipsoidContainsPoint from './Functions/ellipsoidContainsPoint.glsl';
import czm_ellipsoidWgs84TextureCoordinates from './Functions/ellipsoidWgs84TextureCoordinates.glsl';
import czm_equalsEpsilon from './Functions/equalsEpsilon.glsl';
import czm_eyeOffset from './Functions/eyeOffset.glsl';
import czm_eyeToWindowCoordinates from './Functions/eyeToWindowCoordinates.glsl';
import czm_fastApproximateAtan from './Functions/fastApproximateAtan.glsl';
import czm_fog from './Functions/fog.glsl';
import czm_gammaCorrect from './Functions/gammaCorrect.glsl';
import czm_geodeticSurfaceNormal from './Functions/geodeticSurfaceNormal.glsl';
import czm_getDefaultMaterial from './Functions/getDefaultMaterial.glsl';
import czm_getLambertDiffuse from './Functions/getLambertDiffuse.glsl';
import czm_getSpecular from './Functions/getSpecular.glsl';
import czm_getWaterNoise from './Functions/getWaterNoise.glsl';
import czm_hue from './Functions/hue.glsl';
import czm_inverseGamma from './Functions/inverseGamma.glsl';
import czm_isEmpty from './Functions/isEmpty.glsl';
import czm_isFull from './Functions/isFull.glsl';
import czm_latitudeToWebMercatorFraction from './Functions/latitudeToWebMercatorFraction.glsl';
import czm_lineDistance from './Functions/lineDistance.glsl';
import czm_luminance from './Functions/luminance.glsl';
import czm_metersPerPixel from './Functions/metersPerPixel.glsl';
import czm_modelToWindowCoordinates from './Functions/modelToWindowCoordinates.glsl';
import czm_multiplyWithColorBalance from './Functions/multiplyWithColorBalance.glsl';
import czm_nearFarScalar from './Functions/nearFarScalar.glsl';
import czm_octDecode from './Functions/octDecode.glsl';
import czm_packDepth from './Functions/packDepth.glsl';
import czm_pbrLighting from './Functions/pbrLighting.glsl';
import czm_pbrMetallicRoughnessMaterial from './Functions/pbrMetallicRoughnessMaterial.glsl';
import czm_pbrSpecularGlossinessMaterial from './Functions/pbrSpecularGlossinessMaterial.glsl';
import czm_phong from './Functions/phong.glsl';
import czm_planeDistance from './Functions/planeDistance.glsl';
import czm_pointAlongRay from './Functions/pointAlongRay.glsl';
import czm_rayEllipsoidIntersectionInterval from './Functions/rayEllipsoidIntersectionInterval.glsl';
import czm_readDepth from './Functions/readDepth.glsl';
import czm_readNonPerspective from './Functions/readNonPerspective.glsl';
import czm_reverseLogDepth from './Functions/reverseLogDepth.glsl';
import czm_sampleOctahedralProjection from './Functions/sampleOctahedralProjection.glsl';
import czm_saturation from './Functions/saturation.glsl';
import czm_shadowDepthCompare from './Functions/shadowDepthCompare.glsl';
import czm_shadowVisibility from './Functions/shadowVisibility.glsl';
import czm_signNotZero from './Functions/signNotZero.glsl';
import czm_sphericalHarmonics from './Functions/sphericalHarmonics.glsl';
import czm_tangentToEyeSpaceMatrix from './Functions/tangentToEyeSpaceMatrix.glsl';
import czm_transformPlane from './Functions/transformPlane.glsl';
import czm_translateRelativeToEye from './Functions/translateRelativeToEye.glsl';
import czm_translucentPhong from './Functions/translucentPhong.glsl';
import czm_transpose from './Functions/transpose.glsl';
import czm_unpackDepth from './Functions/unpackDepth.glsl';
import czm_unpackFloat from './Functions/unpackFloat.glsl';
import czm_vertexLogDepth from './Functions/vertexLogDepth.glsl';
import czm_windowToEyeCoordinates from './Functions/windowToEyeCoordinates.glsl';
import czm_writeDepthClamp from './Functions/writeDepthClamp.glsl';
import czm_writeLogDepth from './Functions/writeLogDepth.glsl';
import czm_writeNonPerspective from './Functions/writeNonPerspective.glsl';

export default {
    czm_degreesPerRadian: czm_degreesPerRadian,
    czm_depthRange: czm_depthRange,
    czm_epsilon1: czm_epsilon1,
    czm_epsilon2: czm_epsilon2,
    czm_epsilon3: czm_epsilon3,
    czm_epsilon4: czm_epsilon4,
    czm_epsilon5: czm_epsilon5,
    czm_epsilon6: czm_epsilon6,
    czm_epsilon7: czm_epsilon7,
    czm_infinity: czm_infinity,
    czm_oneOverPi: czm_oneOverPi,
    czm_oneOverTwoPi: czm_oneOverTwoPi,
    czm_passCesium3DTile: czm_passCesium3DTile,
    czm_passCesium3DTileClassification: czm_passCesium3DTileClassification,
    czm_passCesium3DTileClassificationIgnoreShow: czm_passCesium3DTileClassificationIgnoreShow,
    czm_passClassification: czm_passClassification,
    czm_passCompute: czm_passCompute,
    czm_passEnvironment: czm_passEnvironment,
    czm_passGlobe: czm_passGlobe,
    czm_passOpaque: czm_passOpaque,
    czm_passOverlay: czm_passOverlay,
    czm_passTerrainClassification: czm_passTerrainClassification,
    czm_passTranslucent: czm_passTranslucent,
    czm_pi: czm_pi,
    czm_piOverFour: czm_piOverFour,
    czm_piOverSix: czm_piOverSix,
    czm_piOverThree: czm_piOverThree,
    czm_piOverTwo: czm_piOverTwo,
    czm_radiansPerDegree: czm_radiansPerDegree,
    czm_sceneMode2D: czm_sceneMode2D,
    czm_sceneMode3D: czm_sceneMode3D,
    czm_sceneModeColumbusView: czm_sceneModeColumbusView,
    czm_sceneModeMorphing: czm_sceneModeMorphing,
    czm_solarRadius: czm_solarRadius,
    czm_threePiOver2: czm_threePiOver2,
    czm_twoPi: czm_twoPi,
    czm_webMercatorMaxLatitude: czm_webMercatorMaxLatitude,
    czm_depthRangeStruct: czm_depthRangeStruct,
    czm_material: czm_material,
    czm_materialInput: czm_materialInput,
    czm_pbrParameters: czm_pbrParameters,
    czm_ray: czm_ray,
    czm_raySegment: czm_raySegment,
    czm_shadowParameters: czm_shadowParameters,
    czm_HSBToRGB: czm_HSBToRGB,
    czm_HSLToRGB: czm_HSLToRGB,
    czm_RGBToHSB: czm_RGBToHSB,
    czm_RGBToHSL: czm_RGBToHSL,
    czm_RGBToXYZ: czm_RGBToXYZ,
    czm_XYZToRGB: czm_XYZToRGB,
    czm_acesTonemapping: czm_acesTonemapping,
    czm_alphaWeight: czm_alphaWeight,
    czm_antialias: czm_antialias,
    czm_approximateSphericalCoordinates: czm_approximateSphericalCoordinates,
    czm_backFacing: czm_backFacing,
    czm_branchFreeTernary: czm_branchFreeTernary,
    czm_cascadeColor: czm_cascadeColor,
    czm_cascadeDistance: czm_cascadeDistance,
    czm_cascadeMatrix: czm_cascadeMatrix,
    czm_cascadeWeights: czm_cascadeWeights,
    czm_columbusViewMorph: czm_columbusViewMorph,
    czm_computePosition: czm_computePosition,
    czm_cosineAndSine: czm_cosineAndSine,
    czm_decompressTextureCoordinates: czm_decompressTextureCoordinates,
    czm_defaultPbrMaterial: czm_defaultPbrMaterial,
    czm_depthClamp: czm_depthClamp,
    czm_eastNorthUpToEyeCoordinates: czm_eastNorthUpToEyeCoordinates,
    czm_ellipsoidContainsPoint: czm_ellipsoidContainsPoint,
    czm_ellipsoidWgs84TextureCoordinates: czm_ellipsoidWgs84TextureCoordinates,
    czm_equalsEpsilon: czm_equalsEpsilon,
    czm_eyeOffset: czm_eyeOffset,
    czm_eyeToWindowCoordinates: czm_eyeToWindowCoordinates,
    czm_fastApproximateAtan: czm_fastApproximateAtan,
    czm_fog: czm_fog,
    czm_gammaCorrect: czm_gammaCorrect,
    czm_geodeticSurfaceNormal: czm_geodeticSurfaceNormal,
    czm_getDefaultMaterial: czm_getDefaultMaterial,
    czm_getLambertDiffuse: czm_getLambertDiffuse,
    czm_getSpecular: czm_getSpecular,
    czm_getWaterNoise: czm_getWaterNoise,
    czm_hue: czm_hue,
    czm_inverseGamma: czm_inverseGamma,
    czm_isEmpty: czm_isEmpty,
    czm_isFull: czm_isFull,
    czm_latitudeToWebMercatorFraction: czm_latitudeToWebMercatorFraction,
    czm_lineDistance: czm_lineDistance,
    czm_luminance: czm_luminance,
    czm_metersPerPixel: czm_metersPerPixel,
    czm_modelToWindowCoordinates: czm_modelToWindowCoordinates,
    czm_multiplyWithColorBalance: czm_multiplyWithColorBalance,
    czm_nearFarScalar: czm_nearFarScalar,
    czm_octDecode: czm_octDecode,
    czm_packDepth: czm_packDepth,
    czm_pbrLighting: czm_pbrLighting,
    czm_pbrMetallicRoughnessMaterial: czm_pbrMetallicRoughnessMaterial,
    czm_pbrSpecularGlossinessMaterial: czm_pbrSpecularGlossinessMaterial,
    czm_phong: czm_phong,
    czm_planeDistance: czm_planeDistance,
    czm_pointAlongRay: czm_pointAlongRay,
    czm_rayEllipsoidIntersectionInterval: czm_rayEllipsoidIntersectionInterval,
    czm_readDepth: czm_readDepth,
    czm_readNonPerspective: czm_readNonPerspective,
    czm_reverseLogDepth: czm_reverseLogDepth,
    czm_sampleOctahedralProjection: czm_sampleOctahedralProjection,
    czm_saturation: czm_saturation,
    czm_shadowDepthCompare: czm_shadowDepthCompare,
    czm_shadowVisibility: czm_shadowVisibility,
    czm_signNotZero: czm_signNotZero,
    czm_sphericalHarmonics: czm_sphericalHarmonics,
    czm_tangentToEyeSpaceMatrix: czm_tangentToEyeSpaceMatrix,
    czm_transformPlane: czm_transformPlane,
    czm_translateRelativeToEye: czm_translateRelativeToEye,
    czm_translucentPhong: czm_translucentPhong,
    czm_transpose: czm_transpose,
    czm_unpackDepth: czm_unpackDepth,
    czm_unpackFloat: czm_unpackFloat,
    czm_vertexLogDepth: czm_vertexLogDepth,
    czm_windowToEyeCoordinates: czm_windowToEyeCoordinates,
    czm_writeDepthClamp: czm_writeDepthClamp,
    czm_writeLogDepth: czm_writeLogDepth,
    czm_writeNonPerspective: czm_writeNonPerspective
};
