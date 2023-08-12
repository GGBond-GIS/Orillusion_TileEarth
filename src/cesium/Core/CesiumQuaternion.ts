import { Cartesian3 } from './Cartesian3';
import { defined } from './defined';
import { HeadingPitchRoll } from './HeadingPitchRoll';

let fromAxisAngleScratch = new Cartesian3();

class CesiumQuaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor (x = 0.0, y = 0.0, z = 0.0, w = 0.0) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = x;

        /**
        * The Y component.
        * @type {Number}
        * @default 0.0
        */
        this.y = y;

        /**
        * The Z component.
        * @type {Number}
        * @default 0.0
        */
        this.z = z;

        /**
        * The W component.
        * @type {Number}
        * @default 0.0
        */
        this.w = w;
    }

    /**
     * Computes a quaternion representing a rotation around an axis.
     *
     * @param {Cartesian3} axis The axis of rotation.
     * @param {Number} angle The angle in radians to rotate around the axis.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    static fromAxisAngle (axis: Cartesian3, angle: number, result?: CesiumQuaternion): CesiumQuaternion {
        const halfAngle = angle / 2.0;
        const s = Math.sin(halfAngle);
        fromAxisAngleScratch = Cartesian3.normalize(axis, fromAxisAngleScratch);

        const x = fromAxisAngleScratch.x * s;
        const y = fromAxisAngleScratch.y * s;
        const z = fromAxisAngleScratch.z * s;
        const w = Math.cos(halfAngle);
        if (!defined(result)) {
            return new CesiumQuaternion(x, y, z, w);
        }
        (result as CesiumQuaternion).x = x;
        (result as CesiumQuaternion).y = y;
        (result as CesiumQuaternion).z = z;
        (result as CesiumQuaternion).w = w;
        return (result as CesiumQuaternion);
    }

    /**
     * Computes the product of two quaternions.
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    static multiply (left: CesiumQuaternion, right: CesiumQuaternion, result: CesiumQuaternion): CesiumQuaternion {
        const leftX = left.x;
        const leftY = left.y;
        const leftZ = left.z;
        const leftW = left.w;

        const rightX = right.x;
        const rightY = right.y;
        const rightZ = right.z;
        const rightW = right.w;

        const x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
        const y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
        const z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
        const w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    }

    /**
     * Computes a rotation from the given heading, pitch and roll angles. Heading is the rotation about the
     * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
     * the positive x axis.
     *
     * @param {HeadingPitchRoll} headingPitchRoll The rotation expressed as a heading, pitch and roll.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
     */
    static fromHeadingPitchRoll (headingPitchRoll: HeadingPitchRoll, result?: CesiumQuaternion): CesiumQuaternion {
        scratchRollQuaternion = CesiumQuaternion.fromAxisAngle(
            Cartesian3.UNIT_X,
            headingPitchRoll.roll,
            scratchHPRQuaternion
        );
        scratchPitchQuaternion = CesiumQuaternion.fromAxisAngle(
            Cartesian3.UNIT_Y,
            -headingPitchRoll.pitch,
            result
        );
        result = CesiumQuaternion.multiply(
            scratchPitchQuaternion,
            scratchRollQuaternion,
            scratchPitchQuaternion
        );
        scratchHeadingQuaternion = CesiumQuaternion.fromAxisAngle(
            Cartesian3.UNIT_Z,
            -headingPitchRoll.heading,
            scratchHPRQuaternion
        );
        return CesiumQuaternion.multiply(scratchHeadingQuaternion, result, result);
    }
}

const scratchHPRQuaternion = new CesiumQuaternion();
let scratchHeadingQuaternion = new CesiumQuaternion();
let scratchPitchQuaternion = new CesiumQuaternion();
let scratchRollQuaternion = new CesiumQuaternion();

export { CesiumQuaternion };
