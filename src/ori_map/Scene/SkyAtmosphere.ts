import { Cartesian3 } from '../../Math/Cartesian3';
import { CesiumMatrix4 } from '../../Math/CesiumMatrix4';
import { defined } from '../../Util/defined';
import { Ellipsoid } from '../../Math/Ellipsoid/Ellipsoid';
import { SceneMode } from '../../Core/Scene/SceneMode';
import { DrawMeshCommand } from '../Renderer/DrawMeshCommand';
import { ShaderSource } from '../Renderer/ShaderSource';
import { FrameState } from '../../Core/Renderer/FrameState';
import { Globe } from '../../Core/Globe/Globe';
import SkyAtmosphereCommon from './../Shader/SkyAtmosphereCommon.glsl';
import SkyAtmosphereFS from './../Shader/SkyAtmosphereFS.glsl';
import SkyAtmosphereVS from './../Shader/SkyAtmosphereVS.glsl';
import { CesiumMath } from '../../Math/CesiumMath';
import { Axis } from '../../Math/Axis';
import { ShaderProgram } from '../Renderer/ShaderProgram';
import { destroyObject } from '../../Util/destroyObject';
import { EllipsoidGeometry } from '../../Math/Ellipsoid/EllipsoidGeometry';
import { Object3DCollection } from '../../Core/Renderer/Object3DCollection';
import { SkyAtmosphereMaterial } from '../Material/SkyAtmosphereMaterial';
import { BackSide, DoubleSide, Float16BufferAttribute, Float32BufferAttribute, Float64BufferAttribute, Vector3 } from 'three';
const scratchModelMatrix = new CesiumMatrix4();

function hasColorCorrection (skyAtmosphere: SkyAtmosphere) {
    return !(
        CesiumMath.equalsEpsilon(
            skyAtmosphere.hueShift,
            0.0,
            CesiumMath.EPSILON7
        ) &&
      CesiumMath.equalsEpsilon(
          skyAtmosphere.saturationShift,
          0.0,
          CesiumMath.EPSILON7
      ) &&
      CesiumMath.equalsEpsilon(
          skyAtmosphere.brightnessShift,
          0.0,
          CesiumMath.EPSILON7
      )
    );
}

class SkyAtmosphere extends Object3DCollection {
    perFragmentAtmosphere = false;
    _ellipsoid: Ellipsoid;
    _scaleMatrix: CesiumMatrix4;
    _modelMatrix = new CesiumMatrix4();
    _command: DrawMeshCommand;
    _spSkyFromSpace?: any;
    _spSkyFromSpaceMaterial = new SkyAtmosphereMaterial({ transparent: true });
    _spSkyFromAtmosphere?: any;
    _spSkyFromAtmosphereMaterial = new SkyAtmosphereMaterial({ transparent: true });

    _flags?: number;

    /**
     * The hue shift to apply to the atmosphere. Defaults to 0.0 (no shift).
     * A hue shift of 1.0 indicates a complete rotation of the hues available.
     * @type {Number}
     * @default 0.0
     */
    hueShift = 0.0;

    /**
     * The saturation shift to apply to the atmosphere. Defaults to 0.0 (no shift).
     * A saturation shift of -1.0 is monochrome.
     * @type {Number}
     * @default 0.0
     */
    saturationShift = 0.0;

    /**
     * The brightness shift to apply to the atmosphere. Defaults to 0.0 (no shift).
     * A brightness shift of -1.0 is complete darkness, which will let space show through.
     * @type {Number}
     * @default 0.0
     */
    brightnessShift = 0.0;

    _hueSaturationBrightness = new Vector3();

    _radiiAndDynamicAtmosphereColor: Vector3;
    uniformMap: any;
    constructor (ellipsoid = Ellipsoid.WGS84) {
        super();
        this._ellipsoid = ellipsoid;

        const outerEllipsoidScale = 1.025;
        const scaleVector = Cartesian3.multiplyByScalar(
            ellipsoid.radii,
            outerEllipsoidScale,
            new Cartesian3()
        );

        this._scaleMatrix = CesiumMatrix4.fromScale(scaleVector);

        this._command = new DrawMeshCommand();
        this._command.owner = this;

        this._hueSaturationBrightness = new Vector3();

        // outer radius, inner radius, dynamic atmosphere color flag
        const radiiAndDynamicAtmosphereColor = new Vector3();

        radiiAndDynamicAtmosphereColor.x = ellipsoid.maximumRadius * outerEllipsoidScale;
        radiiAndDynamicAtmosphereColor.y = ellipsoid.maximumRadius;

        // Toggles whether the sun position is used. 0 treats the sun as always directly overhead.
        radiiAndDynamicAtmosphereColor.z = 0;

        this._radiiAndDynamicAtmosphereColor = radiiAndDynamicAtmosphereColor;

        const that = this;

        this.uniformMap = {
            u_radiiAndDynamicAtmosphereColor: function () {
                return that._radiiAndDynamicAtmosphereColor;
            },
            u_hsbShift: function () {
                that._hueSaturationBrightness.x = that.hueShift;
                that._hueSaturationBrightness.y = that.saturationShift;
                that._hueSaturationBrightness.z = that.brightnessShift;
                return that._hueSaturationBrightness;
            }
        };
    }

    /**
     * Gets the ellipsoid the atmosphere is drawn around.
     * @memberof SkyAtmosphere.prototype
     *
     * @type {Ellipsoid}
     * @readonly
   */
    get ellipsoid (): Ellipsoid {
        return this._ellipsoid;
    }

    /**
     * @private
     */
    setDynamicAtmosphereColor (
        enableLighting: boolean,
        useSunDirection: boolean
    ): void {
        const lightEnum = enableLighting ? (useSunDirection ? 2.0 : 1.0) : 0.0;
        this._radiiAndDynamicAtmosphereColor.z = lightEnum;
    }

    /**
   * @private
   */
    update (frameState: FrameState, globe: Globe): any {
        if (!this.visible) {
            return undefined;
        }

        const mode = frameState.mode;
        if (mode !== SceneMode.SCENE3D && mode !== SceneMode.MORPHING) {
            return undefined;
        }

        // The atmosphere is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.render) {
            return undefined;
        }

        // Align the ellipsoid geometry so it always faces the same direction as the
        // camera to reduce artifacts when rendering atmosphere per-vertex
        const rotationMatrix = CesiumMatrix4.fromRotationTranslation(
            frameState.context.uniformState.inverseViewRotation,
            Cartesian3.ZERO,
            scratchModelMatrix
        );
        const rotationOffsetMatrix = CesiumMatrix4.multiplyTransformation(
            rotationMatrix,
            Axis.Y_UP_TO_Z_UP,
            scratchModelMatrix
        );
        const modelMatrix = CesiumMatrix4.multiply(
            this._scaleMatrix,
            rotationOffsetMatrix,
            scratchModelMatrix
        );
        CesiumMatrix4.clone(modelMatrix, this._modelMatrix);

        const context = frameState.context;

        const colorCorrect = hasColorCorrection(this);
        // const translucent = frameState.globeTranslucencyState.translucent;
        const translucent = false;
        const perFragmentAtmosphere =
        this.perFragmentAtmosphere || translucent || !defined(globe) || !globe.visible;

        const command = this._command;

        if (Object.keys(command.geometry.attributes).length === 0) {
            const attributes = EllipsoidGeometry.createGeometry(
                new EllipsoidGeometry({
                    radii: new Cartesian3(1.0, 1.0, 1.0),
                    slicePartitions: 256,
                    stackPartitions: 256
                    // vertexFormat: VertexFormat.POSITION_ONLY
                })
            );
            const geometry = this._command.geometry;
            geometry.setAttribute('position', new Float32BufferAttribute(Array.from(attributes.attributes.position.values), 3));
            geometry.setIndex(attributes.indices);
            // const vertexArray = VertexArray.fromGeometry({
            //     context: context,
            //     geometry: geometry,
            //     attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
            //     bufferUsage: BufferUsage.STATIC_DRAW
            // });
            // command.renderState = RenderState.fromCache({
            //     cull: {
            //         enabled: true,
            //         face: CullFace.FRONT
            //     },
            //     blending: BlendingState.ALPHA_BLEND,
            //     depthMask: false
            // });
        }

        const flags = (Number(colorCorrect)) | (Number(perFragmentAtmosphere) << 2) | ((Number(translucent)) << 3);

        if (flags !== this._flags) {
            this._flags = flags;

            const defines = [];

            if (colorCorrect) {
                defines.push('COLOR_CORRECT');
            }

            if (perFragmentAtmosphere) {
                defines.push('PER_FRAGMENT_ATMOSPHERE');
            }

            if (translucent) {
                defines.push('GLOBE_TRANSLUCENT');
            }

            let vs = new ShaderSource({
                defines: defines.concat('SKY_FROM_SPACE'),
                sources: [SkyAtmosphereCommon, SkyAtmosphereVS]
            });

            let fs = new ShaderSource({
                defines: defines.concat('SKY_FROM_SPACE'),
                sources: [SkyAtmosphereCommon, SkyAtmosphereFS]
            });

            this._spSkyFromSpace = ShaderProgram.fromCache({
                context: context,
                vertexShaderSource: vs,
                fragmentShaderSource: fs
                // attributeLocations: {}
            });

            this._spSkyFromSpaceMaterial.vertexShader = this._spSkyFromSpace._vertexShaderText;
            this._spSkyFromSpaceMaterial.fragmentShader = this._spSkyFromSpace._fragmentShaderText;
            this._spSkyFromSpaceMaterial.uniforms.u_radiiAndDynamicAtmosphereColor.value = this._radiiAndDynamicAtmosphereColor;
            this._spSkyFromSpaceMaterial.uniforms.u_hsbShift.value = this._hueSaturationBrightness;

            vs = new ShaderSource({
                defines: defines.concat('SKY_FROM_ATMOSPHERE'),
                sources: [SkyAtmosphereCommon, SkyAtmosphereVS]
            });

            fs = new ShaderSource({
                defines: defines.concat('SKY_FROM_ATMOSPHERE'),
                sources: [SkyAtmosphereCommon, SkyAtmosphereFS]
            });

            this._spSkyFromAtmosphere = ShaderProgram.fromCache({
                context: context,
                vertexShaderSource: vs,
                fragmentShaderSource: fs
                // attributeLocations: {}
            });

            this._spSkyFromAtmosphereMaterial.vertexShader = this._spSkyFromAtmosphere._vertexShaderText;
            this._spSkyFromAtmosphereMaterial.fragmentShader = this._spSkyFromAtmosphere._fragmentShaderText;
            this._spSkyFromAtmosphereMaterial.uniforms.u_radiiAndDynamicAtmosphereColor.value = this._radiiAndDynamicAtmosphereColor;
            this._spSkyFromAtmosphereMaterial.uniforms.u_hsbShift.value = this._hueSaturationBrightness;
        }

        const cameraPosition = frameState.camera.positionWC;
        const cameraHeight = Cartesian3.magnitude(cameraPosition);

        if (cameraHeight > this._radiiAndDynamicAtmosphereColor.x) {
            // Camera in space
            command.material = this._spSkyFromSpaceMaterial;
        } else {
            // Camera in atmosphere
            command.material = this._spSkyFromAtmosphereMaterial;
        }
        command.material.transparent = true;
        command.material.side = DoubleSide;

        frameState.commandList.push(command);
        return command;
    }

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see SkyAtmosphere#destroy
     */
    isDestroyed () {
        return false;
    }

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * skyAtmosphere = skyAtmosphere && skyAtmosphere.destroy();
     *
     * @see SkyAtmosphere#isDestroyed
     */
    destroy () {
        // const command = this._command;
        // command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        // this._spSkyFromSpace = this._spSkyFromSpace && this._spSkyFromSpace.destroy();
        // this._spSkyFromAtmosphere = this._spSkyFromAtmosphere && this._spSkyFromAtmosphere.destroy();
        return destroyObject(this);
    }
}

export { SkyAtmosphere };
