import { Cartesian2 } from '../Core/Cartesian2';
import { Cartesian3 } from '../Core/Cartesian3';
import { Cartesian4 } from '../Core/Cartesian4';
import { Cartographic } from '../Core/Cartographic';
import { CesiumMath } from '../Core/CesiumMath';
import { CesiumMatrix3 } from '../Core/CesiumMatrix3';
import { CesiumMatrix4 } from '../Core/CesiumMatrix4';
import { CesiumQuaternion } from '../Core/CesiumQuaternion';
import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { DeveloperError } from '../Core/DeveloperError';
import { Ellipsoid } from '../Core/Ellipsoid';
import { EllipsoidGeodesic } from '../Core/EllipsoidGeodesic';
import { Event } from '../Core/Event';
import { GeographicProjection } from '../Core/GeographicProjection';
import { getTimestamp } from '../Core/getTimestamp';
import { HeadingPitchRange } from '../Core/HeadingPitchRange';
import { HeadingPitchRoll } from '../Core/HeadingPitchRoll';
import { IntersectionTests } from '../Core/IntersectionTests';
import { Ray } from '../Core/Ray';
import { Rectangle } from '../Core/Rectangle';
import { SceneMode } from '../Core/SceneMode';
import { Transforms } from '../Core/Transforms';
import { MathUtils, Raycaster, Vector2 } from 'three';
import * as THREE from 'three';
import { OrthographicFrustumCamera } from './OrthographicFrustumCamera';
import { PerspectiveFrustumCamera, PerspectiveFrustumCameraParameters } from './PerspectiveFrustumCamera';
import { CesiumScene } from './CesiumScene';
import { Matrix4, Orientation3D, Vector3,Quaternion } from '@orillusion/core';

const lookScratchQuaternion = new CesiumQuaternion();
const lookScratchMatrix = new CesiumMatrix3();
const moveScratch = new Cartesian3();

const setTransformPosition = new Cartesian3();
const setTransformUp = new Cartesian3();
const setTransformDirection = new Cartesian3();

const rotateScratchQuaternion = new CesiumQuaternion();
const rotateScratchMatrix = new CesiumMatrix3();

const scratchHPRMatrix1 = new CesiumMatrix4();
const scratchHPRMatrix2 = new CesiumMatrix4();

const scratchSetViewOptions = {
    destination: undefined,
    orientation: {
        direction: undefined,
        up: undefined,
        heading: undefined,
        pitch: undefined,
        roll: undefined
    },
    convert: undefined,
    endTransform: undefined
};

const scratchHpr = new HeadingPitchRoll();

// const scratchThreeMatrix = new Matrix4();

interface hprOptions {
    heading?: number,
    pitch?: number,
    roll?: number,
}

interface orientationOptions {
    direction?: Cartesian3,
    up?: Cartesian3,
    heading?: number,
    pitch?: number,
    roll?: number,
}
    
function updateViewMatrix (camera: Camera) {
    CesiumMatrix4.computeView(
        camera._position,
        camera._direction,
        camera._up,
        camera._right,
        camera._viewMatrix
    );
    CesiumMatrix4.multiply(
        camera._viewMatrix,
        camera._actualInvTransform,
        camera._viewMatrix
    );
    CesiumMatrix4.inverseTransformation(camera._viewMatrix, camera._invViewMatrix);
    
    mat.set(0, 0,  camera._invViewMatrix[0]); mat.set(1, 0,  camera._invViewMatrix[1]); mat.set(2, 0,  camera._invViewMatrix[2]); mat.set(3, 0,  camera._invViewMatrix[3]);
    mat.set(0, 1,  camera._invViewMatrix[4]); mat.set(1, 1,  camera._invViewMatrix[5]); mat.set(2, 1,  camera._invViewMatrix[6]); mat.set(3, 1,  camera._invViewMatrix[7]);
    mat.set(0, 2,  camera._invViewMatrix[8]); mat.set(1, 2,  camera._invViewMatrix[9]); mat.set(2, 2, camera._invViewMatrix[10]); mat.set(3, 2, camera._invViewMatrix[11]);
    mat.set(0, 3, camera._invViewMatrix[12]); mat.set(1, 3, camera._invViewMatrix[13]); mat.set(2, 3, camera._invViewMatrix[14]); mat.set(3, 3, camera._invViewMatrix[15]);

    let v3 = new Vector3();
    let qu4 = new Vector3();
    let sc3 = new Vector3();
    mat.decompose(Orientation3D.QUATERNION, [v3, qu4, sc3]);
    camera.frustum.localQuaternion = new Quaternion(qu4.x,qu4.y,qu4.z,qu4.w);
    camera.frustum.localPosition = v3;
    camera.frustum.localScale = sc3;

}

class Camera {
    _scene: CesiumScene;

    _transform: CesiumMatrix4;
    _invTransform: CesiumMatrix4;
    _actualTransform: CesiumMatrix4;
    _actualInvTransform: CesiumMatrix4;
    _transformChanged: boolean;

    position: Cartesian3;
    _position: Cartesian3;
    _positionWC: Cartesian3;
    _positionCartographic: Cartographic;
    _oldPositionWC?: Cartesian3;

    positionWCDeltaMagnitude: number;
    positionWCDeltaMagnitudeLastFrame: number;
    timeSinceMoved: number;
    _lastMovedTimestamp: number;

    direction: Cartesian3;
    _direction: Cartesian3;
    _directionWC: Cartesian3;

    up: Cartesian3;
    _up: Cartesian3;
    _upWC: Cartesian3;

    right: Cartesian3;
    _right: Cartesian3;
    _rightWC: Cartesian3;

    frustum: PerspectiveFrustumCamera;

    defaultMoveAmount: number;
    defaultLookAmount: number;
    defaultRotateAmount: number;
    defaultZoomAmount: number;
    constrainedAxis?: Cartesian3;

    maximumZoomFactor: number;

    _moveStart: Event;
    _moveEnd: Event;
    _changed: Event;

    _changedPosition: any;
    _changedDirection: any;
    _changedFrustum: any;

    percentageChanged: number;
    _viewMatrix: CesiumMatrix4;
    _invViewMatrix: CesiumMatrix4;

    _mode: SceneMode;
    _modeChanged: boolean;
    _projection: GeographicProjection;
    _maxCoord: Cartesian3;

    _max2Dfrustum: any;
    constructor (scene: CesiumScene, options: PerspectiveFrustumCameraParameters) {
        this._scene = scene;

        this._transform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
        this._invTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
        this._actualTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
        this._actualInvTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
        this._transformChanged = false;

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = new Cartesian3();
        this._position = new Cartesian3();
        this._positionWC = new Cartesian3();
        this._positionCartographic = new Cartographic();
        this._oldPositionWC = undefined;

        /**
         * The position delta magnitude.
         *
         * @private
         */
        this.positionWCDeltaMagnitude = 0.0;

        /**
         * The position delta magnitude last frame.
         *
         * @private
         */
        this.positionWCDeltaMagnitudeLastFrame = 0.0;

        /**
         * How long in seconds since the camera has stopped moving
         *
         * @private
         */
        this.timeSinceMoved = 0.0;
        this._lastMovedTimestamp = 0.0;

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = new Cartesian3();
        this._direction = new Cartesian3();
        this._directionWC = new Cartesian3();

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = new Cartesian3();
        this._up = new Cartesian3();
        this._upWC = new Cartesian3();

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = new Cartesian3();
        this._right = new Cartesian3();
        this._rightWC = new Cartesian3();

        /**
         * The region of space in view.
         *
         * @type {PerspectiveFrustum|PerspectiveOffCenterFrustum|OrthographicFrustum}
         * @default PerspectiveFrustum()
         *
         * @see PerspectiveFrustum
         * @see PerspectiveOffCenterFrustum
         * @see OrthographicFrustum
         */
        this.frustum = new PerspectiveFrustumCamera(scene, options);

        /**
         * The default amount to move the camera when an argument is not
         * provided to the move methods.
         * @type {Number}
         * @default 100000.0;
         */
        this.defaultMoveAmount = 100000.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the look methods.
         * @type {Number}
         * @default Math.PI / 60.0
         */
        this.defaultLookAmount = Math.PI / 60.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the rotate methods.
         * @type {Number}
         * @default Math.PI / 3600.0
         */
        this.defaultRotateAmount = Math.PI / 3600.0;
        /**
         * The default amount to move the camera when an argument is not
         * provided to the zoom methods.
         * @type {Number}
         * @default 100000.0;
         */
        this.defaultZoomAmount = 100000.0;
        /**
         * If set, the camera will not be able to rotate past this axis in either direction.
         * @type {Cartesian3}
         * @default undefined
         */
        this.constrainedAxis = undefined;
        /**
         * The factor multiplied by the the map size used to determine where to clamp the camera position
         * when zooming out from the surface. The default is 1.5. Only valid for 2D and the map is rotatable.
         * @type {Number}
         * @default 1.5
         */
        this.maximumZoomFactor = 1.5;

        this._moveStart = new Event();
        this._moveEnd = new Event();

        this._changed = new Event();
        this._changedPosition = undefined;
        this._changedDirection = undefined;
        this._changedFrustum = undefined;

        /**
         * The amount the camera has to change before the <code>changed</code> event is raised. The value is a percentage in the [0, 1] range.
         * @type {number}
         * @default 0.5
         */
        this.percentageChanged = 0.5;

        this._viewMatrix = new CesiumMatrix4();
        this._invViewMatrix = new CesiumMatrix4();
        updateViewMatrix(this);

        this._mode = SceneMode.SCENE3D;
        this._modeChanged = true;
        const projection = scene.mapProjection;
        this._projection = projection;
        this._maxCoord = projection.project(
            new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO)
        );
        this._max2Dfrustum = undefined;

        // set default view
        rectangleCameraPosition3D(
            this,
            Camera.DEFAULT_VIEW_RECTANGLE,
            this.position,
            true
        );

        let mag = Cartesian3.magnitude(this.position);
        mag += mag * Camera.DEFAULT_VIEW_FACTOR;
        Cartesian3.normalize(this.position, this.position);
        Cartesian3.multiplyByScalar(this.position, mag, this.position);
    }

    /**
     * @private
     */
    static TRANSFORM_2D = new CesiumMatrix4(
        0.0,
        0.0,
        1.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
    );

    /**
     * @private
     */
    static TRANSFORM_2D_INVERSE = CesiumMatrix4.inverseTransformation(
        Camera.TRANSFORM_2D,
        new CesiumMatrix4()
    );

    /**
     * The default rectangle the camera will view on creation.
     * @type Rectangle
     */
    static DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
        -95.0,
        -20.0,
        -70.0,
        90.0
    );

    /**
     * A scalar to multiply to the camera position and add it back after setting the camera to view the rectangle.
     * A value of zero means the camera will view the entire {@link Camera#DEFAULT_VIEW_RECTANGLE}, a value greater than zero
     * will move it further away from the extent, and a value less than zero will move it close to the extent.
     * @type Number
     */
    static DEFAULT_VIEW_FACTOR = 0.5;

    /**
     * The default heading/pitch/range that is used when the camera flies to a location that contains a bounding sphere.
     * @type HeadingPitchRange
     */
    static DEFAULT_OFFSET = new HeadingPitchRange(
        0.0,
        -CesiumMath.PI_OVER_FOUR,
        0.0
    );

    // get position (): any {
    //     return this.frustum.position;
    // }

    // set position (value: any) {
    //     this.position.x = value.x;
    //     this.position.y = value.y;
    //     this.position.z = value.z;
    // }

    // get up (): any {
    //     return this.frustum.up;
    // }

    // set up (value: any) {
    //     this.frustum.up.x = value.x;
    //     this.frustum.up.y = value.y;
    //     this.frustum.up.z = value.z;
    //     // this.frustum.updateMatrixWorld();
    //     this.frustum.updateProjectionMatrix();
    // }

    get transform (): CesiumMatrix4 {
        return this._transform;
    }

    get inverseTransform (): CesiumMatrix4 {
        updateMembers(this);
        return this._invTransform;
    }

    get viewMatrix (): CesiumMatrix4 {
        updateMembers(this);
        return this._viewMatrix;
    }

    get inverseViewMatrix (): CesiumMatrix4 {
        updateMembers(this);
        return this._invViewMatrix;
    }

    get positionCartographic (): Cartographic {
        updateMembers(this);
        return this._positionCartographic;
    }

    get positionWC (): Cartesian3 {
        updateMembers(this);
        return this._positionWC;
    }

    get directionWC (): Cartesian3 {
        updateMembers(this);
        return this._directionWC;
    }

    get upWC (): Cartesian3 {
        updateMembers(this);
        return this._upWC;
    }

    get rightWC (): Cartesian3 {
        updateMembers(this);
        return this._rightWC;
    }

    get heading (): number {
        // if (this._mode !== SceneMode.MORPHING) {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = Transforms.eastNorthUpToFixedFrame(
            this.positionWC,
            ellipsoid,
            scratchHPRMatrix2
        );
        this._setTransform(transform);

        const heading = getHeading(this.direction, this.up);

        this._setTransform(oldTransform);

        return heading;
        // }

        // return undefined;
    }

    get pitch (): number {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = Transforms.eastNorthUpToFixedFrame(
            this.positionWC,
            ellipsoid,
            scratchHPRMatrix2
        );
        this._setTransform(transform);

        const pitch = getPitch(this.direction);

        this._setTransform(oldTransform);

        return pitch;
    }

    get roll (): number {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = Transforms.eastNorthUpToFixedFrame(
            this.positionWC,
            ellipsoid,
            scratchHPRMatrix2
        );
        this._setTransform(transform);

        const roll = getRoll(this.direction, this.up, this.right);

        this._setTransform(oldTransform);

        return roll;
    }


    /**
     * Get the camera position needed to view a rectangle on an ellipsoid or map
     *
     * @param {Rectangle} rectangle The rectangle to view.
     * @param {Cartesian3} [result] The camera position needed to view the rectangle
     * @returns {Cartesian3} The camera position needed to view the rectangle
     */
    getRectangleCameraCoordinates (rectangle: Rectangle, result?: Cartesian3): Cartesian3 | undefined {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        // >>includeEnd('debug');
        const mode = this._mode;

        if (!defined(result)) {
            result = new Cartesian3();
        }

        if (mode === SceneMode.SCENE3D) {
            return rectangleCameraPosition3D(this, rectangle, result);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            // return rectangleCameraPositionColumbusView(this, rectangle, result);
        } else if (mode === SceneMode.SCENE2D) {
            // return rectangleCameraPosition2D(this, rectangle, result);
        }

        return undefined;
    }

    /**
     * Sets the camera position, orientation and transform.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3|Rectangle} [options.destination] The final position of the camera in WGS84 (world) coordinates or a rectangle that would be visible from a top-down view.
     * @param {Object} [options.orientation] An object that contains either direction and up properties or heading, pitch and roll properties. By default, the direction will point
     * towards the center of the frame in 3D and in the negative z direction in Columbus view. The up direction will point towards local north in 3D and in the positive
     * y direction in Columbus view. Orientation is not used in 2D when in infinite scrolling mode.
     * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame of the camera.
     * @param {Boolean} [options.convert] Whether to convert the destination from world coordinates to scene coordinates (only relevant when not using 3D). Defaults to <code>true</code>.
     *
     * @example
     * // 1. Set position with a top-down view
     * viewer.camera.setView({
     *     destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
     * });
     *
     * // 2 Set view with heading, pitch and roll
     * viewer.camera.setView({
     *     destination : cartesianPosition,
     *     orientation: {
     *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
     *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
     *         roll : 0.0                             // default value
     *     }
     * });
     *
     * // 3. Change heading, pitch and roll with the camera position remaining the same.
     * viewer.camera.setView({
     *     orientation: {
     *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
     *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
     *         roll : 0.0                             // default value
     *     }
     * });
     *
     *
     * // 4. View rectangle with a top-down view
     * viewer.camera.setView({
     *     destination : Cesium.Rectangle.fromDegrees(west, south, east, north)
     * });
     *
     * // 5. Set position with an orientation using unit vectors.
     * viewer.camera.setView({
     *     destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
     *     orientation : {
     *         direction : new Cesium.Cartesian3(-0.04231243104240401, -0.20123236049443421, -0.97862924300734),
     *         up : new Cesium.Cartesian3(-0.47934589305293746, -0.8553216253114552, 0.1966022179118339)
     *     }
     * });
     */
    setView (options: {
        destination?: Cartesian3,
        orientation?: orientationOptions,
        endTransform?: CesiumMatrix4,
        convert?: boolean
    }): any {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        let orientation = defaultValue(
            options.orientation,
            defaultValue.EMPTY_OBJECT
        );

        const mode = this._mode;
        if (mode === SceneMode.MORPHING) {
            return;
        }

        if (defined(options.endTransform)) {
            this._setTransform((options.endTransform as CesiumMatrix4));
        }

        let convert = defaultValue(options.convert, true);
        let destination = defaultValue(
            options.destination,
            Cartesian3.clone(this.positionWC, scratchSetViewCartesian)
        );
        if (defined(destination) && defined(destination.west)) {
            destination = this.getRectangleCameraCoordinates(
                destination,
                scratchSetViewCartesian
            );
            convert = false;
        }

        if (defined((orientation as orientationOptions).direction)) {
            orientation = directionUpToHeadingPitchRoll(
                this,
                destination,
                orientation,
                scratchSetViewOptions.orientation
            );
        }

        scratchHpr.heading = defaultValue((orientation as orientationOptions).heading, 0.0) as number;
        scratchHpr.pitch = defaultValue((orientation as orientationOptions).pitch, -CesiumMath.PI_OVER_TWO) as number;
        scratchHpr.roll = defaultValue((orientation as orientationOptions).roll, 0.0) as number;

        if (mode === SceneMode.SCENE3D) {
            setView3D(this, destination, scratchHpr);
        } else if (mode === SceneMode.SCENE2D) {
            // setView2D(this, destination, scratchHpr, convert);
        } else {
            // setViewCV(this, destination, scratchHpr, convert);
        }
    }

    lookAt (target: Cartesian3): void {
        // this.frustum._camera.lookAt(target.x, target.y, target.z);
    }

    /**
     * Translates the camera's position by <code>amount</code> along <code>direction</code>.
     *
     * @param {Cartesian3} direction The direction to move.
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveBackward
     * @see Camera#moveForward
     * @see Camera#moveLeft
     * @see Camera#moveRight
     * @see Camera#moveUp
     * @see Camera#moveDown
     */
    move (direction: Cartesian3, amount: number): void {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(direction)) {
            throw new DeveloperError('direction is required.');
        }
        // >>includeEnd('debug');

        const cameraPosition = this.position;
        Cartesian3.multiplyByScalar(direction, amount, moveScratch);
        Cartesian3.add(cameraPosition, moveScratch, cameraPosition);

        if (this._mode === SceneMode.SCENE2D) {
            // clampMove2D(this, cameraPosition);
        }

        // this.lookAt(this.direction);
        this._adjustOrthographicFrustum(true);
    }

    /**
   * Translates the camera's position by <code>amount</code> along the camera's view vector.
   * When in 2D mode, this will zoom in the camera instead of translating the camera's position.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveBackward
   */
    moveForward (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);

        if (this._mode === SceneMode.SCENE2D) {
            // 2D mode
            // zoom2D(this, amount);
        } else {
            // 3D or Columbus view mode
            this.move(this.direction, (amount as number));
        }
    }

    /**
   * Translates the camera's position by <code>amount</code> along the opposite direction
   * of the camera's view vector.
   * When in 2D mode, this will zoom out the camera instead of translating the camera's position.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveForward
   */
    moveBackward (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);

        if (this._mode === SceneMode.SCENE2D) {
            // 2D mode
            // zoom2D(this, -(amount as number));
        } else {
            // 3D or Columbus view mode
            this.move(this.direction, -(amount as number));
        }
    }

    /**
   * Translates the camera's position by <code>amount</code> along the camera's up vector.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveDown
   */
    moveUp (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.up, (amount as number));
    }

    /**
   * Translates the camera's position by <code>amount</code> along the opposite direction
   * of the camera's up vector.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveUp
   */
    moveDown (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.up, -(amount as number));
    }

    /**
   * Translates the camera's position by <code>amount</code> along the camera's right vector.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveLeft
   */
    moveRight (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.right, (amount as number));
    }

    /**
   * Translates the camera's position by <code>amount</code> along the opposite direction
   * of the camera's right vector.
   *
   * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
   *
   * @see Camera#moveRight
   */
    moveLeft (amount?: number): void {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.right, -(amount as number));
    }

    /**
     * Rotates the camera around its up vector by amount, in radians, in the opposite direction
     * of its right vector if not in 2D mode.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookRight
     */
    lookLeft (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);

        // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
        if (this._mode !== SceneMode.SCENE2D) {
            this.look(this.up, -(amount as number));
        }
    }

    /**
   * Rotates the camera around its up vector by amount, in radians, in the direction
   * of its right vector if not in 2D mode.
   *
   * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
   *
   * @see Camera#lookLeft
   */
    lookRight (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);

        // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
        if (this._mode !== SceneMode.SCENE2D) {
            this.look(this.up, amount);
        }
    }

    /**
   * Rotates the camera around its right vector by amount, in radians, in the direction
   * of its up vector if not in 2D mode.
   *
   * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
   *
   * @see Camera#lookDown
   */
    lookUp (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);

        // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
        if (this._mode !== SceneMode.SCENE2D) {
            this.look(this.right, -(amount as number));
        }
    }

    /**
   * Rotates the camera around its right vector by amount, in radians, in the opposite direction
   * of its up vector if not in 2D mode.
   *
   * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
   *
   * @see Camera#lookUp
   */
    lookDown (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);

        // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
        if (this._mode !== SceneMode.SCENE2D) {
            this.look(this.right, amount);
        }
    }

    /**
     * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookUp
     * @see Camera#lookDown
     * @see Camera#lookLeft
     * @see Camera#lookRight
     */
    look (axis: Cartesian3, angle?: number): void {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(axis)) {
            throw new DeveloperError('axis is required.');
        }
        // >>includeEnd('debug');

        const turnAngle = defaultValue(angle, this.defaultLookAmount) as number;
        const quaternion = CesiumQuaternion.fromAxisAngle(
            axis,
            -turnAngle,
            lookScratchQuaternion
        );
        const rotation = CesiumMatrix3.fromQuaternion(quaternion, lookScratchMatrix);
        const direction = this.direction;
        const up = this.up;
        const right = this.right;

        CesiumMatrix3.multiplyByVector(rotation, direction, direction);
        CesiumMatrix3.multiplyByVector(rotation, up, up);
        CesiumMatrix3.multiplyByVector(rotation, right, right);

        this.frustum.applyCesiumQuaternion(quaternion);
    }

    /**
     * Rotate the camera counter-clockwise around its direction vector by amount, in radians.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#twistRight
     */
    twistLeft (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.direction, (amount as number));
    }

    /**
     * Rotate the camera clockwise around its direction vector by amount, in radians.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#twistLeft
     */
    twistRight (amount?: number): void {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.direction, -(amount as number));
    }

    _adjustOrthographicFrustum (zooming?: any): void{
        // if (!(this.frustum instanceof OrthographicFrustum)) {

        // }
        return undefined;
    }

    /**
     * Create a ray from the camera position through the pixel at <code>windowPosition</code>
     * in world coordinates.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ray} [result] The object onto which to store the result.
     * @returns {Ray} Returns the {@link Cartesian3} position and direction of the ray.
     */
    getPickRay (windowPosition: Cartesian2, result?: Ray): Ray {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is required.');
        }
        // >>includeEnd('debug');

        if (!defined(result)) {
            result = new Ray();
        }

        // const frustum = this.frustum;
        // if (
        //     defined(frustum.aspectRatio) &&
        //     defined(frustum.fov) &&
        //     defined(frustum.near)
        // ) {
        //     return getPickRayPerspective(this, windowPosition, result);
        // }

        // return getPickRayOrthographic(this, windowPosition, result);

        return getPickRayPerspective(this, windowPosition, (result as Ray));
    }

    _setTransform (transform: CesiumMatrix4): void {
        const position = Cartesian3.clone(this.positionWC, setTransformPosition);
        const up = Cartesian3.clone(this.upWC, setTransformUp);
        const direction = Cartesian3.clone(this.directionWC, setTransformDirection);

        CesiumMatrix4.clone(transform, this._transform);
        this._transformChanged = true;
        updateMembers(this);
        const inverse = this._actualInvTransform;

        CesiumMatrix4.multiplyByPoint(inverse, position, this.position);
        CesiumMatrix4.multiplyByPointAsVector(inverse, direction, this.direction);
        CesiumMatrix4.multiplyByPointAsVector(inverse, up, this.up);
        Cartesian3.cross(this.direction, this.up, this.right);

        updateMembers(this);
    }

    // applyCesiumMatrix(matrix: CesiumMatrix4)

    /**
     * Rotates the camera around <code>axis</code> by <code>angle</code>. The distance
     * of the camera's position to the center of the camera's reference frame remains the same.
     *
     * @param {Cartesian3} axis The axis to rotate around given in world coordinates.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateUp
     * @see Camera#rotateDown
     * @see Camera#rotateLeft
     * @see Camera#rotateRight
     */
    rotate (axis: Cartesian3, angle?: number): void {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(axis)) {
            throw new DeveloperError('axis is required.');
        }
        // >>includeEnd('debug');

        const turnAngle = defaultValue(angle, this.defaultRotateAmount) as number;
        const quaternion = CesiumQuaternion.fromAxisAngle(
            axis,
            -turnAngle,
            rotateScratchQuaternion
        );
        const rotation = CesiumMatrix3.fromQuaternion(quaternion, rotateScratchMatrix);
        CesiumMatrix3.multiplyByVector(rotation, this.position, this.position);
        CesiumMatrix3.multiplyByVector(rotation, this.direction, this.direction);
        CesiumMatrix3.multiplyByVector(rotation, this.up, this.up);
        Cartesian3.cross(this.direction, this.up, this.right);
        Cartesian3.cross(this.right, this.direction, this.up);

        this._adjustOrthographicFrustum(false);
        this.frustum.applyCesiumQuaternion(quaternion);
    }

    /**
   * Rotates the camera around the center of the camera's reference frame by angle downwards.
   *
   * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
   *
   * @see Camera#rotateUp
   * @see Camera#rotate
   */
    rotateDown (angle?: number): void {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, angle as number);
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle upwards.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateDown
     * @see Camera#rotate
     */
    rotateUp (angle?: number): void {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, -(angle as number));
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the right.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateLeft
     * @see Camera#rotate
     */
    rotateRight (angle?: number): void {
        angle = defaultValue(angle, this.defaultRotateAmount) as number;
        rotateHorizontal(this, -angle);
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the left.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateRight
     * @see Camera#rotate
     */
    rotateLeft (angle?: number): void {
        angle = defaultValue(angle, this.defaultRotateAmount) as number;
        rotateHorizontal(this, angle);
    }

    /**
     * Zooms <code>amount</code> along the camera's view vector.
     *
     * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
     *
     * @see Camera#zoomOut
     */
    zoomIn (amount: number): void {
        amount = defaultValue(amount, this.defaultZoomAmount);
        if (this._mode === SceneMode.SCENE2D) {
            //   zoom2D(this, amount);
        } else {
            zoom3D(this, amount);
        }
    }

    /**
     * Pick an ellipsoid or map.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3 | undefined} If the ellipsoid or map was picked,
     * returns the point on the surface of the ellipsoid or map in world
     * coordinates. If the ellipsoid or map was not picked, returns undefined.
     *
     * @example
     * var canvas = viewer.scene.canvas;
     * var center = new Cesium.Cartesian2(canvas.clientWidth / 2.0, canvas.clientHeight / 2.0);
     * var ellipsoid = viewer.scene.globe.ellipsoid;
     * var result = viewer.camera.pickEllipsoid(center, ellipsoid);
     */
    pickEllipsoid (windowPosition: Cartesian2, ellipsoid = Ellipsoid.WGS84, result?: Cartesian3): Cartesian3 | undefined {
        const canvas = this._scene.canvas;
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
            return undefined;
        }

        if (!defined(result)) {
            result = new Cartesian3();
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        if (this._mode === SceneMode.SCENE3D) {
            result = pickEllipsoid3D(this, windowPosition, ellipsoid, result);
        } else if (this._mode === SceneMode.SCENE2D) {
            // result = pickMap2D(this, windowPosition, this._projection, result);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            // result = pickMapColumbusView(
            //     this,
            //     windowPosition,
            //     this._projection,
            //     result
            // );
        } else {
            return undefined;
        }

        return result;
    }

    /**
     * Transform a vector or point from world coordinates to the camera's reference frame.
     *
     * @param {Cartesian4} cartesian The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The transformed vector or point.
     */
    worldToCameraCoordinates (cartesian: Cartesian4, result?: Cartesian4): Cartesian4 {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        // >>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian4();
        }
        updateMembers(this);
        return CesiumMatrix4.multiplyByVector(this._actualInvTransform, cartesian, (result as Cartesian4));
    }

    /**
     * Gets the magnitude of the camera position. In 3D, this is the vector magnitude. In 2D and
     * Columbus view, this is the distance to the map.
     *
     * @returns {Number} The magnitude of the position.
     */
    getMagnitude (): number {
        // if (this._mode === SceneMode.SCENE3D) {
        //     return Cartesian3.magnitude(this.position);
        // } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
        //     return Math.abs(this.position.z);
        // } else if (this._mode === SceneMode.SCENE2D) {
        //     return Math.max(
        //         this.frustum.right - this.frustum.left,
        //         this.frustum.top - this.frustum.bottom
        //     );
        // }
        return Cartesian3.magnitude(this.position);
    }

    update (mode: SceneMode): void {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(mode)) {
            throw new DeveloperError('mode is required.');
        }
        if (
            mode === SceneMode.SCENE2D &&
            !(this.frustum instanceof OrthographicFrustumCamera)
        ) {
            throw new DeveloperError(
                'An OrthographicOffCenterFrustum is required in 2D.'
            );
        }
        // if (
        //     (mode === SceneMode.SCENE3D || mode === SceneMode.COLUMBUS_VIEW) &&
        //     !(this.frustum instanceof PerspectiveFrustum) &&
        //     !(this.frustum instanceof OrthographicFrustum)
        // ) {
        //     throw new DeveloperError(
        //         'A PerspectiveFrustum or OrthographicFrustum is required in 3D and Columbus view'
        //     );
        // }
        // >>includeEnd('debug');

        let updateFrustum = false;
        if (mode !== this._mode) {
            this._mode = mode;
            this._modeChanged = mode !== SceneMode.MORPHING;
            updateFrustum = this._mode === SceneMode.SCENE2D;
        }

        // if (updateFrustum) {
        //     const frustum = (this._max2Dfrustum = this.frustum.clone());
        // }
    }

    _updateCameraChanged (): void {
        const camera = this;

        updateCameraDeltas(camera);

        if (camera._changed.numberOfListeners === 0) {
            return;
        }

        const percentageChanged = camera.percentageChanged;

        if (camera._mode === SceneMode.SCENE2D) {

        }

        if (!defined(camera._changedDirection)) {
            camera._changedPosition = Cartesian3.clone(
                camera.positionWC,
                camera._changedPosition
            );
            camera._changedDirection = Cartesian3.clone(
                camera.directionWC,
                camera._changedDirection
            );
            return;
        }

        const dirAngle = CesiumMath.acosClamped(
            Cartesian3.dot(camera.directionWC, camera._changedDirection)
        );

        let dirPercentage;
        if (defined(camera.frustum.fovy)) {
            dirPercentage = dirAngle / (camera.frustum.fovy * 0.5);
        } else {
            dirPercentage = dirAngle;
        }

        const distance = Cartesian3.distance(
            camera.positionWC,
            camera._changedPosition
        );
        const heightPercentage = distance / camera.positionCartographic.height;

        if (
            dirPercentage > percentageChanged ||
            heightPercentage > percentageChanged
        ) {
            camera._changed.raiseEvent(Math.max(dirPercentage, heightPercentage));
            camera._changedPosition = Cartesian3.clone(
                camera.positionWC,
                camera._changedPosition
            );
            camera._changedDirection = Cartesian3.clone(
                camera.directionWC,
                camera._changedDirection
            );
        }
    }
}

const viewRectangle3DCartographic1 = new Cartographic();
const viewRectangle3DCartographic2 = new Cartographic();
const viewRectangle3DNorthEast = new Cartesian3();
const viewRectangle3DSouthWest = new Cartesian3();
const viewRectangle3DNorthWest = new Cartesian3();
const viewRectangle3DSouthEast = new Cartesian3();
const viewRectangle3DNorthCenter = new Cartesian3();
const viewRectangle3DSouthCenter = new Cartesian3();
const viewRectangle3DCenter = new Cartesian3();
const viewRectangle3DEquator = new Cartesian3();
const defaultRF = {
    direction: new Cartesian3(),
    right: new Cartesian3(),
    up: new Cartesian3()
};
let viewRectangle3DEllipsoidGeodesic: any;

function computeD (direction: Cartesian3, upOrRight: Cartesian3, corner: Cartesian3, tanThetaOrPhi: number) {
    const opposite = Math.abs(Cartesian3.dot(upOrRight, corner));
    return opposite / tanThetaOrPhi - Cartesian3.dot(direction, corner);
}

function rectangleCameraPosition3D (camera: Camera, rectangle: Rectangle, result: any, updateCamera?: boolean) {
    const ellipsoid = camera._projection.ellipsoid;
    const cameraRF = updateCamera ? camera : defaultRF;

    const north = rectangle.north;
    const south = rectangle.south;
    let east = rectangle.east;
    const west = rectangle.west;

    // If we go across the International Date Line
    if (west > east) {
        east += CesiumMath.TWO_PI;
    }

    // Find the midpoint latitude.
    //
    // EllipsoidGeodesic will fail if the north and south edges are very close to being on opposite sides of the ellipsoid.
    // Ideally we'd just call EllipsoidGeodesic.setEndPoints and let it throw when it detects this case, but sadly it doesn't
    // even look for this case in optimized builds, so we have to test for it here instead.
    //
    // Fortunately, this case can only happen (here) when north is very close to the north pole and south is very close to the south pole,
    // so handle it just by using 0 latitude as the center.  It's certainliy possible to use a smaller tolerance
    // than one degree here, but one degree is safe and putting the center at 0 latitude should be good enough for any
    // rectangle that spans 178+ of the 180 degrees of latitude.
    const longitude = (west + east) * 0.5;
    let latitude;
    if (
        south < -CesiumMath.PI_OVER_TWO + CesiumMath.RADIANS_PER_DEGREE &&
    north > CesiumMath.PI_OVER_TWO - CesiumMath.RADIANS_PER_DEGREE
    ) {
        latitude = 0.0;
    } else {
        const northCartographic = viewRectangle3DCartographic1;
        northCartographic.longitude = longitude;
        northCartographic.latitude = north;
        northCartographic.height = 0.0;

        const southCartographic = viewRectangle3DCartographic2;
        southCartographic.longitude = longitude;
        southCartographic.latitude = south;
        southCartographic.height = 0.0;

        let ellipsoidGeodesic = viewRectangle3DEllipsoidGeodesic;
        if (
            !defined(ellipsoidGeodesic) ||
      ellipsoidGeodesic.ellipsoid !== ellipsoid
        ) {
            viewRectangle3DEllipsoidGeodesic = ellipsoidGeodesic = new EllipsoidGeodesic(
                undefined,
                undefined,
                ellipsoid
            );
        }

        ellipsoidGeodesic.setEndPoints(northCartographic, southCartographic);
        latitude = ellipsoidGeodesic.interpolateUsingFraction(
            0.5,
            viewRectangle3DCartographic1
        ).latitude;
    }

    const centerCartographic = viewRectangle3DCartographic1;
    centerCartographic.longitude = longitude;
    centerCartographic.latitude = latitude;
    centerCartographic.height = 0.0;

    const center = ellipsoid.cartographicToCartesian(
        centerCartographic,
        viewRectangle3DCenter
    );

    const cart = viewRectangle3DCartographic1;
    cart.longitude = east;
    cart.latitude = north;
    const northEast = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DNorthEast
    );
    cart.longitude = west;
    const northWest = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DNorthWest
    );
    cart.longitude = longitude;
    const northCenter = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DNorthCenter
    );
    cart.latitude = south;
    const southCenter = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DSouthCenter
    );
    cart.longitude = east;
    const southEast = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DSouthEast
    );
    cart.longitude = west;
    const southWest = ellipsoid.cartographicToCartesian(
        cart,
        viewRectangle3DSouthWest
    );

    Cartesian3.subtract(northWest, center, northWest);
    Cartesian3.subtract(southEast, center, southEast);
    Cartesian3.subtract(northEast, center, northEast);
    Cartesian3.subtract(southWest, center, southWest);
    Cartesian3.subtract(northCenter, center, northCenter);
    Cartesian3.subtract(southCenter, center, southCenter);

    // 可视矩形中心点在地球上的法线
    const direction = ellipsoid.geodeticSurfaceNormal(center, cameraRF.direction) as Cartesian3;

    // 去反，计算相机方向
    Cartesian3.negate(direction, direction);

    const right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, cameraRF.right);
    Cartesian3.normalize(right, right);
    const up = Cartesian3.cross(right, direction, cameraRF.up);

    let d;
    if (camera.frustum instanceof OrthographicFrustumCamera) {
        const width = Math.max(
            Cartesian3.distance(northEast, northWest),
            Cartesian3.distance(southEast, southWest)
        );
        const height = Math.max(
            Cartesian3.distance(northEast, southEast),
            Cartesian3.distance(northWest, southWest)
        );

        let rightScalar;
        let topScalar;
        const ratio =
      (camera.frustum as PerspectiveFrustumCamera)._offCenterFrustum.right /
      (camera.frustum as PerspectiveFrustumCamera)._offCenterFrustum.top;
        const heightRatio = height * ratio;
        if (width > heightRatio) {
            rightScalar = width;
            topScalar = rightScalar / ratio;
        } else {
            topScalar = height;
            rightScalar = heightRatio;
        }

        d = Math.max(rightScalar, topScalar);
    } else {
        const tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        const tanTheta = camera.frustum.aspectRatio * tanPhi;

        d = Math.max(
            computeD(direction, up, northWest, tanPhi),
            computeD(direction, up, southEast, tanPhi),
            computeD(direction, up, northEast, tanPhi),
            computeD(direction, up, southWest, tanPhi),
            computeD(direction, up, northCenter, tanPhi),
            computeD(direction, up, southCenter, tanPhi),
            computeD(direction, right, northWest, tanTheta),
            computeD(direction, right, southEast, tanTheta),
            computeD(direction, right, northEast, tanTheta),
            computeD(direction, right, southWest, tanTheta),
            computeD(direction, right, northCenter, tanTheta),
            computeD(direction, right, southCenter, tanTheta)
        );

        // If the rectangle crosses the equator, compute D at the equator, too, because that's the
        // widest part of the rectangle when projected onto the globe.
        if (south < 0 && north > 0) {
            const equatorCartographic = viewRectangle3DCartographic1;
            equatorCartographic.longitude = west;
            equatorCartographic.latitude = 0.0;
            equatorCartographic.height = 0.0;
            let equatorPosition = ellipsoid.cartographicToCartesian(
                equatorCartographic,
                viewRectangle3DEquator
            );
            Cartesian3.subtract(equatorPosition, center, equatorPosition);
            d = Math.max(
                d,
                computeD(direction, up, equatorPosition, tanPhi),
                computeD(direction, right, equatorPosition, tanTheta)
            );

            equatorCartographic.longitude = east;
            equatorPosition = ellipsoid.cartographicToCartesian(
                equatorCartographic,
                viewRectangle3DEquator
            );
            Cartesian3.subtract(equatorPosition, center, equatorPosition);
            d = Math.max(
                d,
                computeD(direction, up, equatorPosition, tanPhi),
                computeD(direction, right, equatorPosition, tanTheta)
            );
        }
    }

    return Cartesian3.add(
        center,
        Cartesian3.multiplyByScalar(direction, -d, viewRectangle3DEquator),
        result
    );
}
const scratchCartesian = new Cartesian3();

function updateMembers (camera: Camera) {
    const mode = camera._mode;

    const heightChanged = false;
    const height = 0.0;
    if (mode === SceneMode.SCENE2D) {
        // height = camera.frustum.right - camera.frustum.left;
        // heightChanged = height !== camera._positionCartographic.height;
    }

    let position = camera._position;
    const positionChanged =
      !Cartesian3.equals(position, camera.position) || heightChanged;
    if (positionChanged) {
        position = Cartesian3.clone(camera.position, camera._position);
    }

    let up = camera._up;
    const upChanged = !Cartesian3.equals(up, camera.up);
    if (upChanged) {
        Cartesian3.normalize(camera.up, camera.up);
        up = Cartesian3.clone(camera.up, camera._up);
    }

    let direction = camera._direction;
    const directionChanged = !Cartesian3.equals(direction, camera.direction);
    if (directionChanged) {
        Cartesian3.normalize(camera.direction, camera.direction);
        direction = Cartesian3.clone(camera.direction, camera._direction);
    }

    let right = camera._right;
    const rightChanged = !Cartesian3.equals(right, camera.right);
    if (rightChanged) {
        Cartesian3.normalize(camera.right, camera.right);
        right = Cartesian3.clone(camera.right, camera._right);
    }

    const transformChanged = camera._transformChanged || camera._modeChanged;
    camera._transformChanged = false;

    if (transformChanged) {
        CesiumMatrix4.inverseTransformation(camera._transform, camera._invTransform);

        if (
            camera._mode === SceneMode.COLUMBUS_VIEW ||
            camera._mode === SceneMode.SCENE2D
        ) {

        } else {
            CesiumMatrix4.clone(camera._transform, camera._actualTransform);
        }

        CesiumMatrix4.inverseTransformation(
            camera._actualTransform,
            camera._actualInvTransform
        );

        camera._modeChanged = false;
    }

    const transform = camera._actualTransform;

    if (positionChanged || transformChanged) {
        camera._positionWC = CesiumMatrix4.multiplyByPoint(
            transform,
            position,
            camera._positionWC
        );

        // Compute the Cartographic position of the camera.
        if (mode === SceneMode.SCENE3D || mode === SceneMode.MORPHING) {
            camera._positionCartographic = (camera._projection.ellipsoid.cartesianToCartographic(
                camera._positionWC,
                camera._positionCartographic
            ) as Cartographic);
        } else {
        // The camera position is expressed in the 2D coordinate system where the Y axis is to the East,
        // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
        // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
            const positionENU = scratchCartesian;
            positionENU.x = camera._positionWC.y;
            positionENU.y = camera._positionWC.z;
            positionENU.z = camera._positionWC.x;

            // In 2D, the camera height is always 12.7 million meters.
            // The apparent height is equal to half the frustum width.
            if (mode === SceneMode.SCENE2D) {
                positionENU.z = height;
            }

            camera._projection.unproject(positionENU, camera._positionCartographic);
        }
    }

    if (directionChanged || upChanged || rightChanged) {
        const det = Cartesian3.dot(
            direction,
            Cartesian3.cross(up, right, scratchCartesian)
        );
        if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
        // orthonormalize axes
            const invUpMag = 1.0 / Cartesian3.magnitudeSquared(up);
            const scalar = Cartesian3.dot(up, direction) * invUpMag;
            const w0 = Cartesian3.multiplyByScalar(direction, scalar, scratchCartesian);
            up = Cartesian3.normalize(
                Cartesian3.subtract(up, w0, camera._up),
                camera._up
            );
            Cartesian3.clone(up, camera.up);

            right = Cartesian3.cross(direction, up, camera._right);
            Cartesian3.clone(right, camera.right);
        }
    }

    if (directionChanged || transformChanged) {
        camera._directionWC = CesiumMatrix4.multiplyByPointAsVector(
            transform,
            direction,
            camera._directionWC
        );
        Cartesian3.normalize(camera._directionWC, camera._directionWC);
    }

    if (upChanged || transformChanged) {
        camera._upWC = CesiumMatrix4.multiplyByPointAsVector(transform, up, camera._upWC);
        Cartesian3.normalize(camera._upWC, camera._upWC);
    }

    if (rightChanged || transformChanged) {
        camera._rightWC = CesiumMatrix4.multiplyByPointAsVector(
            transform,
            right,
            camera._rightWC
        );
        Cartesian3.normalize(camera._rightWC, camera._rightWC);
    }

    if (
        positionChanged ||
        directionChanged ||
        upChanged ||
        rightChanged ||
        transformChanged
    ) {
        updateViewMatrix(camera);
    }
}

const pickPerspCenter = new Cartesian3();
const pickPerspXDir = new Cartesian3();
const pickPerspYDir = new Cartesian3();

const raycaster = new Raycaster();
const mouse = new Vector2();

function getPickRayPerspective (camera: Camera, windowPosition: Cartesian2, result: Ray): Ray {
    const canvas = camera._scene.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // mouse.x = (windowPosition.x / width) * 2 - 1;
    // mouse.y = -(windowPosition.y / height) * 2 + 1;

    // raycaster.setFromCamera(mouse, camera.frustum);

    // result.direction.x = raycaster.ray.direction.x;
    // result.direction.y = raycaster.ray.direction.y;
    // result.direction.z = raycaster.ray.direction.z;

    // result.origin.x = raycaster.ray.origin.x;
    // result.origin.y = raycaster.ray.origin.y;
    // result.origin.z = raycaster.ray.origin.z;

    // return result;

    const tanPhi = Math.tan(MathUtils.degToRad(camera.frustum.fov) * 0.5);
    const tanTheta = camera.frustum.aspectRatio * tanPhi;
    const near = camera.frustum.near;

    const x = (2.0 / width) * windowPosition.x - 1.0;
    const y = (2.0 / height) * (height - windowPosition.y) - 1.0;

    const position = camera.positionWC;
    Cartesian3.clone(position, result.origin);

    const nearCenter = Cartesian3.multiplyByScalar(
        camera.directionWC,
        near,
        pickPerspCenter
    );
    Cartesian3.add(position, nearCenter, nearCenter);
    const xDir = Cartesian3.multiplyByScalar(
        camera.rightWC,
        x * near * tanTheta,
        pickPerspXDir
    );
    const yDir = Cartesian3.multiplyByScalar(
        camera.upWC,
        y * near * tanPhi,
        pickPerspYDir
    );
    const direction = Cartesian3.add(nearCenter, xDir, result.direction);
    Cartesian3.add(direction, yDir, direction);
    Cartesian3.subtract(direction, position, direction);
    Cartesian3.normalize(direction, direction);

    return result;
}

const rotateVertScratchP = new Cartesian3();
const rotateVertScratchA = new Cartesian3();
const rotateVertScratchTan = new Cartesian3();
const rotateVertScratchNegate = new Cartesian3();
function rotateVertical (camera: Camera, angle: number) {
    const position = camera.position;
    if (
        defined(camera.constrainedAxis) &&
        !Cartesian3.equalsEpsilon(
            camera.position,
            Cartesian3.ZERO,
            CesiumMath.EPSILON2
        )
    ) {
        const p = Cartesian3.normalize(position, rotateVertScratchP);
        const northParallel = Cartesian3.equalsEpsilon(
            p,
            camera.constrainedAxis,
            CesiumMath.EPSILON2
        );
        const southParallel = Cartesian3.equalsEpsilon(
            p,
            Cartesian3.negate((camera.constrainedAxis as Cartesian3), rotateVertScratchNegate),
            CesiumMath.EPSILON2
        );
        if (!northParallel && !southParallel) {
            const constrainedAxis = Cartesian3.normalize(
                (camera.constrainedAxis as Cartesian3),
                rotateVertScratchA
            );

            let dot = Cartesian3.dot(p, constrainedAxis);
            let angleToAxis = CesiumMath.acosClamped(dot);
            if (angle > 0 && angle > angleToAxis) {
                angle = angleToAxis - CesiumMath.EPSILON4;
            }

            dot = Cartesian3.dot(
                p,
                Cartesian3.negate(constrainedAxis, rotateVertScratchNegate)
            );
            angleToAxis = CesiumMath.acosClamped(dot);
            if (angle < 0 && -angle > angleToAxis) {
                angle = -angleToAxis + CesiumMath.EPSILON4;
            }

            const tangent = Cartesian3.cross(constrainedAxis, p, rotateVertScratchTan);
            camera.rotate(tangent, angle);
        } else if ((northParallel && angle < 0) || (southParallel && angle > 0)) {
            camera.rotate(camera.right, angle);
        }
    } else {
        camera.rotate(camera.right, angle);
    }
}

function rotateHorizontal (camera: Camera, angle: number) {
    if (defined(camera.constrainedAxis)) {
        camera.rotate((camera.constrainedAxis as Cartesian3), angle);
    } else {
        camera.rotate(camera.up, angle);
    }
}

function zoom3D (camera: Camera, amount: number) {
    camera.move(camera.direction, amount);
}

const scratchSetViewCartesian = new Cartesian3();
const scratchSetViewTransform1 = new CesiumMatrix4();
const scratchSetViewTransform2 = new CesiumMatrix4();
const scratchSetViewQuaternion = new CesiumQuaternion();
const scratchSetViewMatrix3 = new CesiumMatrix3();
const scratchSetViewCartographic = new Cartographic();

function setView3D (camera: Camera, position: Cartesian3, hpr: HeadingPitchRoll) {
    const currentTransform = CesiumMatrix4.clone(
        camera.transform,
        scratchSetViewTransform1
    );
    const localTransform = Transforms.eastNorthUpToFixedFrame(
        position,
        camera._projection.ellipsoid,
        scratchSetViewTransform2
    );
    camera._setTransform(localTransform);

    Cartesian3.clone(Cartesian3.ZERO, camera.position);
    hpr.heading = hpr.heading - CesiumMath.PI_OVER_TWO;

    const rotQuat = CesiumQuaternion.fromHeadingPitchRoll(hpr, scratchSetViewQuaternion);
    const rotMat = CesiumMatrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);

    CesiumMatrix3.getColumn(rotMat, 0, camera.direction);
    CesiumMatrix3.getColumn(rotMat, 2, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);

    camera._setTransform(currentTransform);

    camera._adjustOrthographicFrustum(true);
}

const scratchToHPRDirection = new Cartesian3();
const scratchToHPRUp = new Cartesian3();
const scratchToHPRRight = new Cartesian3();

function directionUpToHeadingPitchRoll (camera: Camera, position: Cartesian3, orientation: any, result: hprOptions): hprOptions {
    const direction = Cartesian3.clone(
        orientation.direction,
        scratchToHPRDirection
    );
    const up = Cartesian3.clone(orientation.up, scratchToHPRUp);

    if (camera._scene.mode === SceneMode.SCENE3D) {
        const ellipsoid = camera._projection.ellipsoid;
        const transform = Transforms.eastNorthUpToFixedFrame(
            position,
            ellipsoid,
            scratchHPRMatrix1
        );
        const invTransform = CesiumMatrix4.inverseTransformation(
            transform,
            scratchHPRMatrix2
        );

        CesiumMatrix4.multiplyByPointAsVector(invTransform, direction, direction);
        CesiumMatrix4.multiplyByPointAsVector(invTransform, up, up);
    }

    const right = Cartesian3.cross(direction, up, scratchToHPRRight);

    result.heading = getHeading(direction, up);
    result.pitch = getPitch(direction);
    result.roll = getRoll(direction, up, right);

    return result;
}

function getHeading (direction: Cartesian3, up: Cartesian3) {
    let heading;
    if (
        !CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)
    ) {
        heading = Math.atan2(direction.y, direction.x) - CesiumMath.PI_OVER_TWO;
    } else {
        heading = Math.atan2(up.y, up.x) - CesiumMath.PI_OVER_TWO;
    }

    return CesiumMath.TWO_PI - CesiumMath.zeroToTwoPi(heading);
}

function getPitch (direction: Cartesian3) {
    return CesiumMath.PI_OVER_TWO - CesiumMath.acosClamped(direction.z);
}

function getRoll (direction: Cartesian3, up: Cartesian3, right: Cartesian3) {
    let roll = 0.0;
    if (
        !CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)
    ) {
        roll = Math.atan2(-right.z, up.z);
        roll = CesiumMath.zeroToTwoPi(roll + CesiumMath.TWO_PI);
    }

    return roll;
}

const pickEllipsoid3DRay = new Ray();
function pickEllipsoid3D (camera: Camera, windowPosition: Cartesian2, ellipsoid = Ellipsoid.WGS84, result?: Cartesian3): Cartesian3 | undefined {
    ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
    const ray = camera.getPickRay(windowPosition, pickEllipsoid3DRay);
    const intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
    if (!intersection) {
        return undefined;
    }

    const t = intersection.start > 0.0 ? intersection.start : intersection.stop;
    return Ray.getPoint(ray, t, result);
}

function updateCameraDeltas (camera: Camera) {
    if (!defined(camera._oldPositionWC)) {
        camera._oldPositionWC = Cartesian3.clone(
            camera.positionWC,
            camera._oldPositionWC
        );
    } else {
        camera.positionWCDeltaMagnitudeLastFrame = camera.positionWCDeltaMagnitude;
        const delta = Cartesian3.subtract(
            camera.positionWC,
            (camera._oldPositionWC as Cartesian3),
            (camera._oldPositionWC as Cartesian3)
        );
        camera.positionWCDeltaMagnitude = Cartesian3.magnitude(delta);
        camera._oldPositionWC = Cartesian3.clone(
            camera.positionWC,
            camera._oldPositionWC
        );

        // Update move timers
        if (camera.positionWCDeltaMagnitude > 0.0) {
            camera.timeSinceMoved = 0.0;
            camera._lastMovedTimestamp = getTimestamp();
        } else {
            camera.timeSinceMoved =
          Math.max(getTimestamp() - camera._lastMovedTimestamp, 0.0) / 1000.0;
        }
    }
}

export { Camera };
