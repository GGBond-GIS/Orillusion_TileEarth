import { PerspectiveFrustumCamera } from '../Scene/PerspectiveFrustumCamera';
import { Cartesian2 } from './Cartesian2';
import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { CesiumMath } from './CesiumMath';
import { CesiumMatrix4 } from './CesiumMatrix4';
import { CullingVolume } from './CullingVolume';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

const getPlanesRight = new Cartesian3();
const getPlanesNearCenter = new Cartesian3();
const getPlanesFarCenter = new Cartesian3();
const getPlanesNormal = new Cartesian3();

class PerspectiveOffCenterFrustum {
    left: any;
    _left: any;

    right: any;
    _right: any;

    top: any;
    _top: any;

    bottom: any;
    _bottom: any;

    near: number;
    _near?: number;

    far: number;
    _far?: number;

    _cullingVolume: CullingVolume;
    _perspectiveMatrix: CesiumMatrix4;
    _infinitePerspective: CesiumMatrix4;
    constructor (options: any = {}) {
        /**
         * Defines the left clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.left = options.left;
        this._left = undefined;

        /**
         * Defines the right clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.right = options.right;
        this._right = undefined;

        /**
         * Defines the top clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.top = options.top;
        this._top = undefined;

        /**
         * Defines the bottom clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.bottom = options.bottom;
        this._bottom = undefined;

        /**
         * The distance of the near plane.
         * @type {Number}
         * @default 1.0
         */
        this.near = defaultValue(options.near, 1.0);
        this._near = this.near;

        /**
         * The distance of the far plane.
         * @type {Number}
         * @default 500000000.0
         */
        this.far = defaultValue(options.far, 500000000.0);
        this._far = this.far;

        this._cullingVolume = new CullingVolume();
        this._perspectiveMatrix = new CesiumMatrix4();
        this._infinitePerspective = new CesiumMatrix4();
    }

    get projectionMatrix (): CesiumMatrix4 {
        update(this);
        return this._perspectiveMatrix;
    }

    get infiniteProjectionMatrix (): CesiumMatrix4 {
        update(this);
        return this._infinitePerspective;
    }

    /**
     * Creates a culling volume for this frustum.
     *
     * @param {Cartesian3} position The eye position.
     * @param {Cartesian3} direction The view direction.
     * @param {Cartesian3} up The up direction.
     * @returns {CullingVolume} A culling volume at the given position and orientation.
     *
     * @example
     * // Check if a bounding volume intersects the frustum.
     * var cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
     * var intersect = cullingVolume.computeVisibility(boundingVolume);
     */
    computeCullingVolume (
        position: Cartesian3,
        direction: Cartesian3,
        up: Cartesian3
    ): CullingVolume {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }

        if (!defined(direction)) {
            throw new DeveloperError('direction is required.');
        }

        if (!defined(up)) {
            throw new DeveloperError('up is required.');
        }
        // >>includeEnd('debug');

        const planes = this._cullingVolume.planes;

        const t = this.top;
        const b = this.bottom;
        const r = this.right;
        const l = this.left;
        const n = this.near as number;
        const f = this.far;

        const right = Cartesian3.cross(direction, up, getPlanesRight);

        const nearCenter = getPlanesNearCenter;
        Cartesian3.multiplyByScalar(direction, n, nearCenter);
        Cartesian3.add(position, nearCenter, nearCenter);

        const farCenter = getPlanesFarCenter;
        Cartesian3.multiplyByScalar(direction, f, farCenter);
        Cartesian3.add(position, farCenter, farCenter);

        const normal = getPlanesNormal;

        // Left plane computation
        Cartesian3.multiplyByScalar(right, l, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(normal, up, normal);
        Cartesian3.normalize(normal, normal);

        let plane = planes[0];
        if (!defined(plane)) {
            plane = planes[0] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        // Right plane computation
        Cartesian3.multiplyByScalar(right, r, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(up, normal, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[1];
        if (!defined(plane)) {
            plane = planes[1] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        // Bottom plane computation
        Cartesian3.multiplyByScalar(up, b, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(right, normal, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[2];
        if (!defined(plane)) {
            plane = planes[2] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        // Top plane computation
        Cartesian3.multiplyByScalar(up, t, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(normal, right, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[3];
        if (!defined(plane)) {
            plane = planes[3] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        // Near plane computation
        plane = planes[4];
        if (!defined(plane)) {
            plane = planes[4] = new Cartesian4();
        }
        plane.x = direction.x;
        plane.y = direction.y;
        plane.z = direction.z;
        plane.w = -Cartesian3.dot(direction, nearCenter);

        // Far plane computation
        Cartesian3.negate(direction, normal);

        plane = planes[5];
        if (!defined(plane)) {
            plane = planes[5] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, farCenter);

        return this._cullingVolume;
    }

    /**
   * Returns the pixel's width and height in meters.
   *
   * @param {Number} drawingBufferWidth The width of the drawing buffer.
   * @param {Number} drawingBufferHeight The height of the drawing buffer.
   * @param {Number} distance The distance to the near plane in meters.
   * @param {Number} pixelRatio The scaling factor from pixel space to coordinate space.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
   *
   * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
   * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
   * @exception {DeveloperError} pixelRatio must be greater than zero.
   *
   * @example
   * // Example 1
   * // Get the width and height of a pixel.
   * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 1.0, scene.pixelRatio, new Cesium.Cartesian2());
   *
   * @example
   * // Example 2
   * // Get the width and height of a pixel if the near plane was set to 'distance'.
   * // For example, get the size of a pixel of an image on a billboard.
   * var position = camera.position;
   * var direction = camera.direction;
   * var toCenter = Cesium.Cartesian3.subtract(primitive.boundingVolume.center, position, new Cesium.Cartesian3());      // vector from camera to a primitive
   * var toCenterProj = Cesium.Cartesian3.multiplyByScalar(direction, Cesium.Cartesian3.dot(direction, toCenter), new Cesium.Cartesian3()); // project vector onto camera direction vector
   * var distance = Cesium.Cartesian3.magnitude(toCenterProj);
   * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, distance, scene.pixelRatio, new Cesium.Cartesian2());
   */
    getPixelDimensions (
        drawingBufferWidth: number,
        drawingBufferHeight: number,
        distance: number,
        pixelRatio: number,
        result: Cartesian2
    ): Cartesian2 {
        update(this);

        // >>includeStart('debug', pragmas.debug);
        if (!defined(drawingBufferWidth) || !defined(drawingBufferHeight)) {
            throw new DeveloperError(
                'Both drawingBufferWidth and drawingBufferHeight are required.'
            );
        }
        if (drawingBufferWidth <= 0) {
            throw new DeveloperError('drawingBufferWidth must be greater than zero.');
        }
        if (drawingBufferHeight <= 0) {
            throw new DeveloperError('drawingBufferHeight must be greater than zero.');
        }
        if (!defined(distance)) {
            throw new DeveloperError('distance is required.');
        }
        if (!defined(pixelRatio)) {
            throw new DeveloperError('pixelRatio is required');
        }
        if (pixelRatio <= 0) {
            throw new DeveloperError('pixelRatio must be greater than zero.');
        }
        if (!defined(result)) {
            throw new DeveloperError('A result object is required.');
        }
        // >>includeEnd('debug');

        const inverseNear = 1.0 / (this.near as number);
        let tanTheta = this.top * inverseNear;
        const pixelHeight =
      (2.0 * pixelRatio * distance * tanTheta) / drawingBufferHeight;
        tanTheta = this.right * inverseNear;
        const pixelWidth =
      (2.0 * pixelRatio * distance * tanTheta) / drawingBufferWidth;

        result.x = pixelWidth;
        result.y = pixelHeight;
        return result;
    }

    /**
   * Returns a duplicate of a PerspectiveOffCenterFrustum instance.
   *
   * @param {PerspectiveOffCenterFrustum} [result] The object onto which to store the result.
   * @returns {PerspectiveOffCenterFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
   */
    clone (result = new PerspectiveOffCenterFrustum()): PerspectiveOffCenterFrustum {
        if (!defined(result)) {
            result = new PerspectiveOffCenterFrustum();
        }

        result.right = this.right;
        result.left = this.left;
        result.top = this.top;
        result.bottom = this.bottom;
        result.near = this.near;
        result.far = this.far;

        // force update of clone to compute matrices
        result._left = undefined;
        result._right = undefined;
        result._top = undefined;
        result._bottom = undefined;
        result._near = undefined;
        result._far = undefined;

        return result;
    }

    /**
   * Compares the provided PerspectiveOffCenterFrustum componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {PerspectiveOffCenterFrustum} [other] The right hand side PerspectiveOffCenterFrustum.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
    equals (other: PerspectiveOffCenterFrustum) : boolean {
        return (
            defined(other) &&
      other instanceof PerspectiveOffCenterFrustum &&
      this.right === other.right &&
      this.left === other.left &&
      this.top === other.top &&
      this.bottom === other.bottom &&
      this.near === other.near &&
      this.far === other.far
        );
    }

    /**
   * Compares the provided PerspectiveOffCenterFrustum componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {PerspectiveOffCenterFrustum} other The right hand side PerspectiveOffCenterFrustum.
   * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
   */
    equalsEpsilon (
        other: PerspectiveOffCenterFrustum,
        relativeEpsilon: number,
        absoluteEpsilon?: number
    ): boolean {
        return (
            other === this ||
      (defined(other) &&
        other instanceof PerspectiveOffCenterFrustum &&
        CesiumMath.equalsEpsilon(
            this.right,
            other.right,
            relativeEpsilon,
            absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
            this.left,
            other.left,
            relativeEpsilon,
            absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
            this.top,
            other.top,
            relativeEpsilon,
            absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
            this.bottom,
            other.bottom,
            relativeEpsilon,
            absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
            this.near,
            other.near,
            relativeEpsilon,
            absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
            this.far,
            other.far,
            relativeEpsilon,
            absoluteEpsilon
        ))
        );
    }
}

function update (frustum: PerspectiveOffCenterFrustum) {
    // >>includeStart('debug', pragmas.debug);
    if (
        !defined(frustum.right) ||
      !defined(frustum.left) ||
      !defined(frustum.top) ||
      !defined(frustum.bottom) ||
      !defined(frustum.near) ||
      !defined(frustum.far)
    ) {
        throw new DeveloperError(
            'right, left, top, bottom, near, or far parameters are not set.'
        );
    }
    // >>includeEnd('debug');

    const t = frustum.top;
    const b = frustum.bottom;
    const r = frustum.right;
    const l = frustum.left;
    const n = frustum.near;
    const f = frustum.far;

    if (
        t !== frustum._top ||
      b !== frustum._bottom ||
      l !== frustum._left ||
      r !== frustum._right ||
      n !== frustum._near ||
      f !== frustum._far
    ) {
        // >>includeStart('debug', pragmas.debug);
        if (frustum.near <= 0 || frustum.near > frustum.far) {
            throw new DeveloperError(
                'near must be greater than zero and less than far.'
            );
        }
        // >>includeEnd('debug');

        frustum._left = l;
        frustum._right = r;
        frustum._top = t;
        frustum._bottom = b;
        frustum._near = n;
        frustum._far = f;
        frustum._perspectiveMatrix = CesiumMatrix4.computePerspectiveOffCenter(
            l,
            r,
            b,
            t,
            n,
            f,
            frustum._perspectiveMatrix
        );
        frustum._infinitePerspective = CesiumMatrix4.computeInfinitePerspectiveOffCenter(
            l,
            r,
            b,
            t,
            n,
            frustum._infinitePerspective
        );
    }
}

export { PerspectiveOffCenterFrustum };
