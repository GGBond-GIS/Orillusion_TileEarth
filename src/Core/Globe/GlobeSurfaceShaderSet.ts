/* eslint-disable no-multi-str */
import { defined } from '../../Util/defined';
import { SceneMode } from '../Scene/SceneMode';
import { TerrainQuantization } from '../Terrain/TerrainQuantization';
import { GlobeSurfaceTileMaterial } from '../../Material/GlobeSurfaceTileMaterial';
import { FrameState } from '../Renderer/FrameState';
import { GlobeSurfaceTile } from './GlobeSurfaceTile';
import { ShaderSource } from '../Renderer/ShaderSource';
import { ShaderProgram } from '../Renderer/ShaderProgram';

class GlobeSurfaceShader {
    numberOfDayTextures: number;
    flags: number;
    shaderProgram: ShaderProgram;
    clippingShaderState: number;
    constructor (numberOfDayTextures: number,
        flags: number,
        shaderProgram: ShaderProgram,
        clippingShaderState: number) {
        this.numberOfDayTextures = numberOfDayTextures;
        this.flags = flags;
        this.shaderProgram = shaderProgram;
        this.clippingShaderState = clippingShaderState;
    }
}

interface GlobeSurfaceShaderSetOptions {
    frameState: FrameState,
    applyAlpha: boolean,
    applyBrightness: boolean,
    applyContrast: boolean,
    applyDayNightAlpha: boolean,
    applyGamma: boolean,
    applyHue: boolean,
    applySaturation: boolean,
    applySplit: boolean,
    clippedByBoundaries: boolean,
    clippingPlanes?: any[],
    colorCorrect: boolean,
    colorToAlpha: boolean,
    dynamicAtmosphereLighting: boolean,
    dynamicAtmosphereLightingFromSun: boolean,
    enableClippingPlanes: boolean,
    enableFog: boolean,
    enableLighting: boolean,
    hasExaggeration: boolean,
    hasGeodeticSurfaceNormals: boolean,
    hasImageryLayerCutout: boolean,
    hasVertexNormals: boolean,
    highlightFillTile: boolean,
    numberOfDayTextures: number,
    perFragmentGroundAtmosphere: boolean,
    showGroundAtmosphere: boolean,
    showOceanWaves: boolean,
    showReflectiveOcean: boolean,
    showUndergroundColor: boolean,
    surfaceTile: GlobeSurfaceTile,
    translucent: boolean,
    useWebMercatorProjection: boolean
}

const getPositionMode = (sceneMode: SceneMode) => {
    const getPosition3DMode =
      'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPosition3DMode(position, height, textureCoordinates); }';
    const getPositionColumbusViewAnd2DMode =
      'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionColumbusViewMode(position, height, textureCoordinates); }';
    const getPositionMorphingMode =
      'vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionMorphingMode(position, height, textureCoordinates); }';

    let positionMode;

    switch (sceneMode) {
    case SceneMode.SCENE3D:
        positionMode = getPosition3DMode;
        break;
    case SceneMode.SCENE2D:
    case SceneMode.COLUMBUS_VIEW:
        positionMode = getPositionColumbusViewAnd2DMode;
        break;
    case SceneMode.MORPHING:
        positionMode = getPositionMorphingMode;
        break;
    }

    return positionMode;
};

const get2DYPositionFraction = (useWebMercatorProjection: boolean) => {
    const get2DYPositionFractionGeographicProjection =
      'float get2DYPositionFraction(vec2 textureCoordinates) { return get2DGeographicYPositionFraction(textureCoordinates); }';
    const get2DYPositionFractionMercatorProjection =
      'float get2DYPositionFraction(vec2 textureCoordinates) { return get2DMercatorYPositionFraction(textureCoordinates); }';
    return useWebMercatorProjection
        ? get2DYPositionFractionMercatorProjection
        : get2DYPositionFractionGeographicProjection;
};

class GlobeSurfaceShaderSet {
    vertexShaderText = '';
    fragmentShaderText = '';
    _shadersByTexturesFlags: any[] = [];

    baseVertexShaderSource?: ShaderSource;
    baseFragmentShaderSource?: ShaderSource;

    getShaderProgram (options: GlobeSurfaceShaderSetOptions): ShaderProgram {
        const frameState = options.frameState;
        const surfaceTile = options.surfaceTile;
        const numberOfDayTextures = options.numberOfDayTextures;
        const applyBrightness = options.applyBrightness;
        const applyContrast = options.applyContrast;
        const applyHue = options.applyHue;
        const applySaturation = options.applySaturation;
        const applyGamma = options.applyGamma;
        const applyAlpha = options.applyAlpha;
        const applyDayNightAlpha = options.applyDayNightAlpha;
        const applySplit = options.applySplit;
        const showReflectiveOcean = options.showReflectiveOcean;
        const showOceanWaves = options.showOceanWaves;
        const enableLighting = options.enableLighting;
        const dynamicAtmosphereLighting = options.dynamicAtmosphereLighting;
        const dynamicAtmosphereLightingFromSun =
            options.dynamicAtmosphereLightingFromSun;
        const showGroundAtmosphere = options.showGroundAtmosphere;
        const perFragmentGroundAtmosphere = options.perFragmentGroundAtmosphere;
        const hasVertexNormals = options.hasVertexNormals;
        const useWebMercatorProjection = options.useWebMercatorProjection;
        const enableFog = options.enableFog;
        const enableClippingPlanes = options.enableClippingPlanes;
        const clippingPlanes = options.clippingPlanes;
        const clippedByBoundaries = options.clippedByBoundaries;
        const hasImageryLayerCutout = options.hasImageryLayerCutout;
        const colorCorrect = options.colorCorrect;
        const highlightFillTile = options.highlightFillTile;
        const colorToAlpha = options.colorToAlpha;
        const hasGeodeticSurfaceNormals = options.hasGeodeticSurfaceNormals;
        const hasExaggeration = options.hasExaggeration;
        const showUndergroundColor = options.showUndergroundColor;
        const translucent = options.translucent;

        let quantization = 0;
        let quantizationDefine = '';

        const mesh = surfaceTile.renderedMesh;
        const terrainEncoding = mesh.encoding;
        const quantizationMode = terrainEncoding.quantization;
        if (quantizationMode === TerrainQuantization.BITS12) {
            quantization = 1;
            quantizationDefine = 'QUANTIZATION_BITS12';
        }

        let cartographicLimitRectangleFlag = 0;
        let cartographicLimitRectangleDefine = '';
        if (clippedByBoundaries) {
            cartographicLimitRectangleFlag = 1;
            cartographicLimitRectangleDefine = 'TILE_LIMIT_RECTANGLE';
        }

        let imageryCutoutFlag = 0;
        let imageryCutoutDefine = '';
        if (hasImageryLayerCutout) {
            imageryCutoutFlag = 1;
            imageryCutoutDefine = 'APPLY_IMAGERY_CUTOUT';
        }

        const sceneMode = frameState.mode;
        const flags =
            sceneMode |
            (Number(applyBrightness) << 2) |
            (Number(applyContrast) << 3) |
            (Number(applyHue) << 4) |
            (Number(applySaturation) << 5) |
            (Number(applyGamma) << 6) |
            (Number(applyAlpha) << 7) |
            (Number(showReflectiveOcean) << 8) |
            (Number(showOceanWaves) << 9) |
            (Number(enableLighting) << 10) |
            (Number(dynamicAtmosphereLighting) << 11) |
            (Number(dynamicAtmosphereLightingFromSun) << 12) |
            (Number(showGroundAtmosphere) << 13) |
            (Number(perFragmentGroundAtmosphere) << 14) |
            (Number(hasVertexNormals) << 15) |
            (Number(useWebMercatorProjection) << 16) |
            (Number(enableFog) << 17) |
            (quantization << 18) |
            (Number(applySplit) << 19) |
            (Number(enableClippingPlanes) << 20) |
            (cartographicLimitRectangleFlag << 21) |
            (imageryCutoutFlag << 22) |
            (Number(colorCorrect) << 23) |
            (Number(highlightFillTile) << 24) |
            (Number(colorToAlpha) << 25) |
            (Number(hasGeodeticSurfaceNormals) << 26) |
            (Number(hasExaggeration) << 27) |
            (Number(showUndergroundColor) << 28) |
            (Number(translucent) << 29) |
            (Number(applyDayNightAlpha) << 30);

        let currentClippingShaderState = 0;
        if (defined(clippingPlanes) && (clippingPlanes as any[]).length > 0) {
            // currentClippingShaderState = enableClippingPlanes
            //   ? clippingPlanes.clippingPlanesState
            //   : 0;
            currentClippingShaderState = 0;
        }
        let surfaceShader = surfaceTile.surfaceShader;
        if (
            defined(surfaceShader) &&
            surfaceShader.numberOfDayTextures === numberOfDayTextures &&
            surfaceShader.flags === flags &&
            // surfaceShader.material === this.material &&
            surfaceShader.clippingShaderState === currentClippingShaderState
        ) {
            return surfaceShader.shaderProgram;
        }

        // New tile, or tile changed number of textures, flags, or clipping planes
        let shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures];
        if (!defined(shadersByFlags)) {
            shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures] = [];
        }

        surfaceShader = shadersByFlags[flags];
        if (
            !defined(surfaceShader) ||
            // surfaceShader.material !== this.material ||
            surfaceShader.clippingShaderState !== currentClippingShaderState
        ) {
            // Cache miss - we've never seen this combination of numberOfDayTextures and flags before.
            const vs = (this.baseVertexShaderSource as ShaderSource).clone();
            const fs = (this.baseFragmentShaderSource as ShaderSource).clone();

            if (currentClippingShaderState !== 0) {
                //   fs.sources.unshift(
                //     getClippingFunction(clippingPlanes, frameState.context)
                //   ); // Need to go before GlobeFS
            }

            vs.defines.push(quantizationDefine);
            fs.defines.push(
                'TEXTURE_UNITS ' + numberOfDayTextures,
                cartographicLimitRectangleDefine,
                imageryCutoutDefine
            );

            if (applyBrightness) {
                fs.defines.push('APPLY_BRIGHTNESS');
            }
            if (applyContrast) {
                fs.defines.push('APPLY_CONTRAST');
            }
            if (applyHue) {
                fs.defines.push('APPLY_HUE');
            }
            if (applySaturation) {
                fs.defines.push('APPLY_SATURATION');
            }
            if (applyGamma) {
                fs.defines.push('APPLY_GAMMA');
            }
            if (applyAlpha) {
                fs.defines.push('APPLY_ALPHA');
            }
            if (applyDayNightAlpha) {
                fs.defines.push('APPLY_DAY_NIGHT_ALPHA');
            }
            if (showReflectiveOcean) {
                fs.defines.push('SHOW_REFLECTIVE_OCEAN');
                vs.defines.push('SHOW_REFLECTIVE_OCEAN');
            }
            if (showOceanWaves) {
                fs.defines.push('SHOW_OCEAN_WAVES');
            }
            if (colorToAlpha) {
                fs.defines.push('APPLY_COLOR_TO_ALPHA');
            }
            if (showUndergroundColor) {
                vs.defines.push('UNDERGROUND_COLOR');
                fs.defines.push('UNDERGROUND_COLOR');
            }
            if (translucent) {
                vs.defines.push('TRANSLUCENT');
                fs.defines.push('TRANSLUCENT');
            }
            if (enableLighting) {
                if (hasVertexNormals) {
                    vs.defines.push('ENABLE_VERTEX_LIGHTING');
                    fs.defines.push('ENABLE_VERTEX_LIGHTING');
                } else {
                    vs.defines.push('ENABLE_DAYNIGHT_SHADING');
                    fs.defines.push('ENABLE_DAYNIGHT_SHADING');
                }
            }

            if (dynamicAtmosphereLighting) {
                fs.defines.push('DYNAMIC_ATMOSPHERE_LIGHTING');
                if (dynamicAtmosphereLightingFromSun) {
                    fs.defines.push('DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN');
                }
            }

            if (showGroundAtmosphere) {
                vs.defines.push('GROUND_ATMOSPHERE');
                fs.defines.push('GROUND_ATMOSPHERE');
                if (perFragmentGroundAtmosphere) {
                    fs.defines.push('PER_FRAGMENT_GROUND_ATMOSPHERE');
                }
            }

            vs.defines.push('INCLUDE_WEB_MERCATOR_Y');
            fs.defines.push('INCLUDE_WEB_MERCATOR_Y');

            if (enableFog) {
                vs.defines.push('FOG');
                fs.defines.push('FOG');
            }

            if (applySplit) {
                fs.defines.push('APPLY_SPLIT');
            }

            if (enableClippingPlanes) {
                fs.defines.push('ENABLE_CLIPPING_PLANES');
            }

            if (colorCorrect) {
                fs.defines.push('COLOR_CORRECT');
            }

            if (highlightFillTile) {
                fs.defines.push('HIGHLIGHT_FILL_TILE');
            }

            if (hasGeodeticSurfaceNormals) {
                vs.defines.push('GEODETIC_SURFACE_NORMALS');
            }

            if (hasExaggeration) {
                vs.defines.push('EXAGGERATION');
            }

            let computeDayColor =
            `
            vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates, float nightBlend)
            {
                vec4 color = initialColor;`;

            if (hasImageryLayerCutout) {
                computeDayColor +=
                    `
                    vec4 cutoutAndColorResult;
                    bool texelUnclipped;`;
            }

            for (let i = 0; i < numberOfDayTextures; ++i) {
                if (hasImageryLayerCutout) {
                    computeDayColor +=
                '\
              cutoutAndColorResult = u_dayTextureCutoutRectangles[' +
                i +
                '];\n\
              texelUnclipped = v_textureCoordinates.x < cutoutAndColorResult.x || cutoutAndColorResult.z < v_textureCoordinates.x || v_textureCoordinates.y < cutoutAndColorResult.y || cutoutAndColorResult.w < v_textureCoordinates.y;\n\
              cutoutAndColorResult = sampleAndBlend(\n';
                } else {
                    computeDayColor += '\
              color = sampleAndBlend(\n';
                }
                computeDayColor +=
              '\
                  color,\n\
                  u_dayTextures[' +
              i +
              '],\n\
                  u_dayTextureUseWebMercatorT[' +
              i +
              '] ? textureCoordinates.xz : textureCoordinates.xy,\n\
                  u_dayTextureTexCoordsRectangle[' +
              i +
              '],\n\
                  u_dayTextureTranslationAndScale[' +
              i +
              '],\n\
                  ' +
              (applyAlpha ? 'u_dayTextureAlpha[' + i + ']' : '1.0') +
              ',\n\
                  ' +
              (applyDayNightAlpha ? 'u_dayTextureNightAlpha[' + i + ']' : '1.0') +
              ',\n' +
              (applyDayNightAlpha ? 'u_dayTextureDayAlpha[' + i + ']' : '1.0') +
              ',\n' +
              (applyBrightness ? 'u_dayTextureBrightness[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (applyContrast ? 'u_dayTextureContrast[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (applyHue ? 'u_dayTextureHue[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (applySaturation ? 'u_dayTextureSaturation[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (applyGamma ? 'u_dayTextureOneOverGamma[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (applySplit ? 'u_dayTextureSplit[' + i + ']' : '0.0') +
              ',\n\
                  ' +
              (colorToAlpha ? 'u_colorsToAlpha[' + i + ']' : 'vec4(0.0)') +
              ',\n\
              nightBlend\
              );\n';
                if (hasImageryLayerCutout) {
                    computeDayColor +=
                '\
              color = czm_branchFreeTernary(texelUnclipped, cutoutAndColorResult, color);\n';
                }
            }

            computeDayColor += '\
              return color;\n\
            }';

            fs.sources.push(computeDayColor);

            vs.sources.push(getPositionMode(sceneMode));
            vs.sources.push(get2DYPositionFraction(useWebMercatorProjection));

            const shader = ShaderProgram.fromCache({
                context: frameState.context,
                vertexShaderSource: vs,
                fragmentShaderSource: fs,
                attributeLocations: terrainEncoding.getAttributeLocations(),
                material: new GlobeSurfaceTileMaterial()
            });

            surfaceShader = shadersByFlags[flags] = new GlobeSurfaceShader(
                numberOfDayTextures,
                flags,
                shader,
                currentClippingShaderState
            );
        }
        surfaceTile.surfaceShader = surfaceShader;
        return surfaceShader.shaderProgram;
    }
}

export { GlobeSurfaceShaderSet };
