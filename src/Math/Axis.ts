import { CesiumMath } from './CesiumMath';
import { CesiumMatrix3 } from './CesiumMatrix3';
import { CesiumMatrix4 } from './CesiumMatrix4';

/**
 * An enum describing the x, y, and z axes and helper conversion functions.
 *
 * @enum {Number}
 */
const Axis = {
    /**
     * Denotes the x-axis.
     *
     * @type {Number}
     * @constant
     */
    X: 0,

    /**
     * Denotes the y-axis.
     *
     * @type {Number}
     * @constant
     */
    Y: 1,

    /**
     * Denotes the z-axis.
     *
     * @type {Number}
     * @constant
     */
    Z: 2,

    /**
     * Matrix used to convert from y-up to z-up
     *
     * @type {Matrix4}
     * @constant
     */
    Y_UP_TO_Z_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationX(CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Matrix used to convert from z-up to y-up
     *
     * @type {Matrix4}
     * @constant
     */
    Z_UP_TO_Y_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationX(-CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Matrix used to convert from x-up to z-up
     *
     * @type {Matrix4}
     * @constant
     */
    X_UP_TO_Z_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationY(-CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Matrix used to convert from z-up to x-up
     *
     * @type {Matrix4}
     * @constant
     */
    Z_UP_TO_X_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationY(CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Matrix used to convert from x-up to y-up
     *
     * @type {Matrix4}
     * @constant
     */
    X_UP_TO_Y_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationZ(CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Matrix used to convert from y-up to x-up
     *
     * @type {Matrix4}
     * @constant
     */
    Y_UP_TO_X_UP: CesiumMatrix4.fromRotationTranslation(
        CesiumMatrix3.fromRotationZ(-CesiumMath.PI_OVER_TWO)
    ),

    /**
     * Gets the axis by name
     *
     * @param {String} name The name of the axis.
     * @returns {Number} The axis enum.
     */
    fromName  (name: number): number {
        return Axis[name];
    }

};
export { Axis };
