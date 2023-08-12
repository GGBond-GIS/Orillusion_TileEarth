import { Matrix4 } from 'three';
import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { CesiumMatrix3 } from './CesiumMatrix3';
import { Check } from './Check';
import { defaultValue } from './defaultValue';
import { defined } from './defined';

class CesiumMatrix4 {
    constructor (
        column0Row0 = 0.0,
        column1Row0 = 0.0,
        column2Row0 = 0.0,
        column3Row0 = 0.0,
        column0Row1 = 0.0,
        column1Row1 = 0.0,
        column2Row1 = 0.0,
        column3Row1 = 0.0,
        column0Row2 = 0.0,
        column1Row2 = 0.0,
        column2Row2 = 0.0,
        column3Row2 = 0.0,
        column0Row3 = 0.0,
        column1Row3 = 0.0,
        column2Row3 = 0.0,
        column3Row3 = 0.0
    ) {
        this[0] = defaultValue(column0Row0, 0.0);
        this[1] = defaultValue(column0Row1, 0.0);
        this[2] = defaultValue(column0Row2, 0.0);
        this[3] = defaultValue(column0Row3, 0.0);
        this[4] = defaultValue(column1Row0, 0.0);
        this[5] = defaultValue(column1Row1, 0.0);
        this[6] = defaultValue(column1Row2, 0.0);
        this[7] = defaultValue(column1Row3, 0.0);
        this[8] = defaultValue(column2Row0, 0.0);
        this[9] = defaultValue(column2Row1, 0.0);
        this[10] = defaultValue(column2Row2, 0.0);
        this[11] = defaultValue(column2Row3, 0.0);
        this[12] = defaultValue(column3Row0, 0.0);
        this[13] = defaultValue(column3Row1, 0.0);
        this[14] = defaultValue(column3Row2, 0.0);
        this[15] = defaultValue(column3Row3, 0.0);
    }

    /**
     * An immutable Matrix4 instance initialized to the identity matrix.
     *
     * @type {Matrix4}
     * @constant
     */
    static IDENTITY = Object.freeze(
        new CesiumMatrix4(
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
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0
        )
    );

    /**
     * Computes the inverse of the provided matrix assuming it is a proper rigid matrix,
     * where the upper left 3x3 elements are a rotation matrix,
     * and the upper three elements in the fourth column are the translation.
     * The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the inverse for a general 4x4
     * matrix using {@link Matrix4.inverse}.
     *
     * @param {Matrix4} matrix The matrix to invert.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    static inverseTransformation (matrix:CesiumMatrix4, result:CesiumMatrix4):CesiumMatrix4 {
    // This function is an optimized version of the below 4 lines.
    // var rT = Matrix3.transpose(Matrix4.getMatrix3(matrix));
    // var rTN = Matrix3.negate(rT);
    // var rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
    // return Matrix4.fromRotationTranslation(rT, rTT, result);

        const matrix0 = matrix[0];
        const matrix1 = matrix[1];
        const matrix2 = matrix[2];
        const matrix4 = matrix[4];
        const matrix5 = matrix[5];
        const matrix6 = matrix[6];
        const matrix8 = matrix[8];
        const matrix9 = matrix[9];
        const matrix10 = matrix[10];

        const vX = matrix[12];
        const vY = matrix[13];
        const vZ = matrix[14];

        const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
        const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
        const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

        result[0] = matrix0;
        result[1] = matrix4;
        result[2] = matrix8;
        result[3] = 0.0;
        result[4] = matrix1;
        result[5] = matrix5;
        result[6] = matrix9;
        result[7] = 0.0;
        result[8] = matrix2;
        result[9] = matrix6;
        result[10] = matrix10;
        result[11] = 0.0;
        result[12] = x;
        result[13] = y;
        result[14] = z;
        result[15] = 1.0;
        return result;
    }

    /**
 * Computes the product of two matrices.
 *
 * @param {Matrix4} left The first matrix.
 * @param {Matrix4} right The second matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
    static multiply (left:CesiumMatrix4, right:CesiumMatrix4, result:CesiumMatrix4) :CesiumMatrix4 {
        const left0 = left[0];
        const left1 = left[1];
        const left2 = left[2];
        const left3 = left[3];
        const left4 = left[4];
        const left5 = left[5];
        const left6 = left[6];
        const left7 = left[7];
        const left8 = left[8];
        const left9 = left[9];
        const left10 = left[10];
        const left11 = left[11];
        const left12 = left[12];
        const left13 = left[13];
        const left14 = left[14];
        const left15 = left[15];

        const right0 = right[0];
        const right1 = right[1];
        const right2 = right[2];
        const right3 = right[3];
        const right4 = right[4];
        const right5 = right[5];
        const right6 = right[6];
        const right7 = right[7];
        const right8 = right[8];
        const right9 = right[9];
        const right10 = right[10];
        const right11 = right[11];
        const right12 = right[12];
        const right13 = right[13];
        const right14 = right[14];
        const right15 = right[15];

        const column0Row0 =
      left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
        const column0Row1 =
      left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
        const column0Row2 =
      left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
        const column0Row3 =
      left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

        const column1Row0 =
      left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
        const column1Row1 =
      left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
        const column1Row2 =
      left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
        const column1Row3 =
      left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

        const column2Row0 =
      left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
        const column2Row1 =
      left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
        const column2Row2 =
      left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
        const column2Row3 =
      left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

        const column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
        const column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
        const column3Row2 =
      left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
        const column3Row3 =
      left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column0Row3;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = column1Row3;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = column3Row3;
        return result;
    }

    /**
     * Computes a Matrix4 instance from a Matrix3 representing the rotation
     * and a Cartesian3 representing the translation.
     *
     * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
     * @param {Cartesian3} [translation=Cartesian3.ZERO] The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    static fromRotationTranslation (rotation:CesiumMatrix3, translation = Cartesian3.ZERO, result?:CesiumMatrix4):CesiumMatrix4 {
        translation = defaultValue(translation, Cartesian3.ZERO);

        if (!defined(result)) {
            return new CesiumMatrix4(
                rotation[0],
                rotation[3],
                rotation[6],
                translation.x,
                rotation[1],
                rotation[4],
                rotation[7],
                translation.y,
                rotation[2],
                rotation[5],
                rotation[8],
                translation.z,
                0.0,
                0.0,
                0.0,
                1.0
            );
        }

        (result as CesiumMatrix4)[0] = rotation[0];
        (result as CesiumMatrix4)[1] = rotation[1];
        (result as CesiumMatrix4)[2] = rotation[2];
        (result as CesiumMatrix4)[3] = 0.0;
        (result as CesiumMatrix4)[4] = rotation[3];
        (result as CesiumMatrix4)[5] = rotation[4];
        (result as CesiumMatrix4)[6] = rotation[5];
        (result as CesiumMatrix4)[7] = 0.0;
        (result as CesiumMatrix4)[8] = rotation[6];
        (result as CesiumMatrix4)[9] = rotation[7];
        (result as CesiumMatrix4)[10] = rotation[8];
        (result as CesiumMatrix4)[11] = 0.0;
        (result as CesiumMatrix4)[12] = translation.x;
        (result as CesiumMatrix4)[13] = translation.y;
        (result as CesiumMatrix4)[14] = translation.z;
        (result as CesiumMatrix4)[15] = 1.0;
        return (result as CesiumMatrix4);
    }

    /**
     * Creates a Matrix4 instance from a Cartesian3 representing the translation.
     *
     * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @see Matrix4.multiplyByTranslation
     */
    static fromTranslation (translation: Cartesian3, result?:CesiumMatrix4): CesiumMatrix4 {
        return CesiumMatrix4.fromRotationTranslation(CesiumMatrix3.IDENTITY, translation, result);
    }

    /**
     * Computes a new matrix that replaces the translation in the rightmost column of the provided
     * matrix with the provided translation. This assumes the matrix is an affine transformation.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} translation The translation that replaces the translation of the provided matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    static setTranslation (matrix:CesiumMatrix4, translation:Cartesian3, result:CesiumMatrix4):CesiumMatrix4 {
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];

        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];

        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];

        result[12] = translation.x;
        result[13] = translation.y;
        result[14] = translation.z;
        result[15] = matrix[15];

        return result;
    }

    /**
     * Computes a Matrix4 instance representing a non-uniform scale.
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0, 0.0]
     * //   [0.0, 0.0, 9.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    static fromScale (scale:Cartesian3, result?:CesiumMatrix4):CesiumMatrix4 {
        if (!defined(result)) {
            return new CesiumMatrix4(
                scale.x,
                0.0,
                0.0,
                0.0,
                0.0,
                scale.y,
                0.0,
                0.0,
                0.0,
                0.0,
                scale.z,
                0.0,
                0.0,
                0.0,
                0.0,
                1.0
            );
        }

        (result as CesiumMatrix4)[0] = scale.x;
        (result as CesiumMatrix4)[1] = 0.0;
        (result as CesiumMatrix4)[2] = 0.0;
        (result as CesiumMatrix4)[3] = 0.0;
        (result as CesiumMatrix4)[4] = 0.0;
        (result as CesiumMatrix4)[5] = scale.y;
        (result as CesiumMatrix4)[6] = 0.0;
        (result as CesiumMatrix4)[7] = 0.0;
        (result as CesiumMatrix4)[8] = 0.0;
        (result as CesiumMatrix4)[9] = 0.0;
        (result as CesiumMatrix4)[10] = scale.z;
        (result as CesiumMatrix4)[11] = 0.0;
        (result as CesiumMatrix4)[12] = 0.0;
        (result as CesiumMatrix4)[13] = 0.0;
        (result as CesiumMatrix4)[14] = 0.0;
        (result as CesiumMatrix4)[15] = 1.0;
        return (result as CesiumMatrix4);
    }

    /**
 * Duplicates a Matrix4 instance.
 *
 * @param {Matrix4} matrix The matrix to duplicate.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
 */
    static clone (matrix:CesiumMatrix4, result?:CesiumMatrix4):any {
        if (!defined(matrix)) {
            return undefined;
        }
        if (!defined(result)) {
            return new CesiumMatrix4(
                matrix[0],
                matrix[4],
                matrix[8],
                matrix[12],
                matrix[1],
                matrix[5],
                matrix[9],
                matrix[13],
                matrix[2],
                matrix[6],
                matrix[10],
                matrix[14],
                matrix[3],
                matrix[7],
                matrix[11],
                matrix[15]
            );
        }
        (result as CesiumMatrix4)[0] = matrix[0];
        (result as CesiumMatrix4)[1] = matrix[1];
        (result as CesiumMatrix4)[2] = matrix[2];
        (result as CesiumMatrix4)[3] = matrix[3];
        (result as CesiumMatrix4)[4] = matrix[4];
        (result as CesiumMatrix4)[5] = matrix[5];
        (result as CesiumMatrix4)[6] = matrix[6];
        (result as CesiumMatrix4)[7] = matrix[7];
        (result as CesiumMatrix4)[8] = matrix[8];
        (result as CesiumMatrix4)[9] = matrix[9];
        (result as CesiumMatrix4)[10] = matrix[10];
        (result as CesiumMatrix4)[11] = matrix[11];
        (result as CesiumMatrix4)[12] = matrix[12];
        (result as CesiumMatrix4)[13] = matrix[13];
        (result as CesiumMatrix4)[14] = matrix[14];
        (result as CesiumMatrix4)[15] = matrix[15];
        return (result as CesiumMatrix4);
    }

    /**
 * Computes the product of a matrix and a {@link Cartesian3}. This is equivalent to calling {@link Matrix4.multiplyByVector}
 * with a {@link Cartesian4} with a <code>w</code> component of 1, but returns a {@link Cartesian3} instead of a {@link Cartesian4}.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Cartesian3} cartesian The point.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 *
 * @example
 * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
 * var result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
 */
    static multiplyByPoint (matrix:CesiumMatrix4, cartesian:Cartesian3, result:Cartesian3):Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
        const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
        const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //returns a Cartesian4 instance with values from the specified column
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * //Example 1: Creates an instance of Cartesian
     * var a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
     *
     * @example
     * //Example 2: Sets values for Cartesian instance
     * var a = new Cesium.Cartesian4();
     * Cesium.Matrix4.getColumn(m, 2, a);
     *
     * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
     */
    static getColumn (matrix: CesiumMatrix4, index: number, result: Cartesian4):Cartesian4 {
        const startIndex = index * 4;
        const x = matrix[startIndex];
        const y = matrix[startIndex + 1];
        const z = matrix[startIndex + 2];
        const w = matrix[startIndex + 3];

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    }

    /**
     * Gets the translation portion of the provided matrix, assuming the matrix is an affine transformation matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static getTranslation (matrix: CesiumMatrix4, result:Cartesian3):Cartesian3 {
        result.x = matrix[12];
        result.y = matrix[13];
        result.z = matrix[14];
        return result;
    }

    static transformToThreeMatrix4 (matrix: CesiumMatrix4, threeMatrix: Matrix4): any {
        if (!defined(matrix)) {
            return undefined;
        }
        CesiumMatrix4.toArray(matrix, threeMatrix.elements);
        return threeMatrix;
    }

    static setFromThreeMatrix4 (threeMatrix4: Matrix4, cesiumMatrix4: CesiumMatrix4): CesiumMatrix4 {
        CesiumMatrix4.toArray(threeMatrix4.elements, cesiumMatrix4 as number[]);
        return cesiumMatrix4;
    }

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     *
     * @example
     * //compares two Matrix4 instances
     *
     * // a = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * // b = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * if(Cesium.Matrix4.equals(a,b)) {
     *      console.log("Both matrices are equal");
     * } else {
     *      console.log("They are not equal");
     * }
     *
     * //Prints "Both matrices are equal" on the console
     */
    static equals (left: CesiumMatrix4, right: CesiumMatrix4): boolean {
    // Given that most matrices will be transformation matrices, the elements
    // are tested in order such that the test is likely to fail as early
    // as possible.  I _think_ this is just as friendly to the L1 cache
    // as testing in index order.  It is certainty faster in practice.
        return (
            left === right ||
      (defined(left) &&
        defined(right) &&
        // Translation
        left[12] === right[12] &&
        left[13] === right[13] &&
        left[14] === right[14] &&
        // Rotation/scale
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[8] === right[8] &&
        left[9] === right[9] &&
        left[10] === right[10] &&
        // Bottom row
        left[3] === right[3] &&
        left[7] === right[7] &&
        left[11] === right[11] &&
        left[15] === right[15])
        );
    }

    /**
     * Computes a Matrix4 instance that transforms from world space to view space.
     *
     * @param {Cartesian3} position The position of the camera.
     * @param {Cartesian3} direction The forward direction.
     * @param {Cartesian3} up The up direction.
     * @param {Cartesian3} right The right direction.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computeView (position: Cartesian3, direction: Cartesian3, up: Cartesian3, right: Cartesian3, result: CesiumMatrix4): CesiumMatrix4 {
        result[0] = right.x;
        result[1] = up.x;
        result[2] = -direction.x;
        result[3] = 0.0;
        result[4] = right.y;
        result[5] = up.y;
        result[6] = -direction.y;
        result[7] = 0.0;
        result[8] = right.z;
        result[9] = up.z;
        result[10] = -direction.z;
        result[11] = 0.0;
        result[12] = -Cartesian3.dot(right, position);
        result[13] = -Cartesian3.dot(up, position);
        result[14] = Cartesian3.dot(direction, position);
        result[15] = 1.0;
        return result;
    }

    /**
     * Computes a Matrix4 instance representing an off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computePerspectiveOffCenter (
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number,
        result: CesiumMatrix4
    ): CesiumMatrix4 {
        const column0Row0 = (2.0 * near) / (right - left);
        const column1Row1 = (2.0 * near) / (top - bottom);
        const column2Row0 = (right + left) / (right - left);
        const column2Row1 = (top + bottom) / (top - bottom);
        const column2Row2 = -(far + near) / (far - near);
        const column2Row3 = -1.0;
        const column3Row2 = (-2.0 * far * near) / (far - near);

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    }

    /**
     * Computes a Matrix4 instance representing an infinite off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computeInfinitePerspectiveOffCenter (
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        result: CesiumMatrix4
    ): CesiumMatrix4 {
        const column0Row0 = (2.0 * near) / (right - left);
        const column1Row1 = (2.0 * near) / (top - bottom);
        const column2Row0 = (right + left) / (right - left);
        const column2Row1 = (top + bottom) / (top - bottom);
        const column2Row2 = -1.0;
        const column2Row3 = -1.0;
        const column3Row2 = -2.0 * near;

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    }

    /**
     * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of zero.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @example
     * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
     * // A shortcut for
     * //   Cartesian3 p = ...
     * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
     */
    static multiplyByPointAsVector (matrix: CesiumMatrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
        const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
        const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Computes an Array from the provided Matrix4 instance.
     * The array will be in column-major order.
     *
     * @param {Matrix4} matrix The matrix to use..
     * @param {Number[]} [result] The Array onto which to store the result.
     * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
     *
     * @example
     * //create an array from an instance of Matrix4
     * // m = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     * var a = Cesium.Matrix4.toArray(m);
     *
     * // m remains the same
     * //creates a = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0]
     */
    static toArray (matrix: CesiumMatrix4, result?: number[]): number[] {
        if (!defined(result)) {
            return [
                matrix[0],
                matrix[1],
                matrix[2],
                matrix[3],
                matrix[4],
                matrix[5],
                matrix[6],
                matrix[7],
                matrix[8],
                matrix[9],
                matrix[10],
                matrix[11],
                matrix[12],
                matrix[13],
                matrix[14],
                matrix[15]
            ];
        }
        (result as number[])[0] = matrix[0];
        (result as number[])[1] = matrix[1];
        (result as number[])[2] = matrix[2];
        (result as number[])[3] = matrix[3];
        (result as number[])[4] = matrix[4];
        (result as number[])[5] = matrix[5];
        (result as number[])[6] = matrix[6];
        (result as number[])[7] = matrix[7];
        (result as number[])[8] = matrix[8];
        (result as number[])[9] = matrix[9];
        (result as number[])[10] = matrix[10];
        (result as number[])[11] = matrix[11];
        (result as number[])[12] = matrix[12];
        (result as number[])[13] = matrix[13];
        (result as number[])[14] = matrix[14];
        (result as number[])[15] = matrix[15];
        return (result as number[]);
    }

    /**
     * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
     *
     * @param {Object} [viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
     * @param {Number} [nearDepthRange=0.0] The near plane distance in window coordinates.
     * @param {Number} [farDepthRange=1.0] The far plane distance in window coordinates.
     * @param {Matrix4} [result] The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * // Create viewport transformation using an explicit viewport and depth range.
     * var m = Cesium.Matrix4.computeViewportTransformation({
     *     x : 0.0,
     *     y : 0.0,
     *     width : 1024.0,
     *     height : 768.0
     * }, 0.0, 1.0, new Cesium.Matrix4());
     */
    static computeViewportTransformation (
        viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },
        nearDepthRange = 0.0,
        farDepthRange = 1.0,
        result?: CesiumMatrix4
    ):CesiumMatrix4 {
        if (!defined(result)) {
            result = new Matrix4();
        }

        viewport = defaultValue(viewport, defaultValue.EMPTY_OBJECT) as any;
        const x = defaultValue(viewport.x, 0.0);
        const y = defaultValue(viewport.y, 0.0);
        const width = defaultValue(viewport.width, 0.0);
        const height = defaultValue(viewport.height, 0.0);
        nearDepthRange = defaultValue(nearDepthRange, 0.0);
        farDepthRange = defaultValue(farDepthRange, 1.0);

        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        const halfDepth = (farDepthRange - nearDepthRange) * 0.5;

        const column0Row0 = halfWidth;
        const column1Row1 = halfHeight;
        const column2Row2 = halfDepth;
        const column3Row0 = x + halfWidth;
        const column3Row1 = y + halfHeight;
        const column3Row2 = nearDepthRange + halfDepth;
        const column3Row3 = 1.0;

        (result as CesiumMatrix4)[0] = column0Row0;
        (result as CesiumMatrix4)[1] = 0.0;
        (result as CesiumMatrix4)[2] = 0.0;
        (result as CesiumMatrix4)[3] = 0.0;
        (result as CesiumMatrix4)[4] = 0.0;
        (result as CesiumMatrix4)[5] = column1Row1;
        (result as CesiumMatrix4)[6] = 0.0;
        (result as CesiumMatrix4)[7] = 0.0;
        (result as CesiumMatrix4)[8] = 0.0;
        (result as CesiumMatrix4)[9] = 0.0;
        (result as CesiumMatrix4)[10] = column2Row2;
        (result as CesiumMatrix4)[11] = 0.0;
        (result as CesiumMatrix4)[12] = column3Row0;
        (result as CesiumMatrix4)[13] = column3Row1;
        (result as CesiumMatrix4)[14] = column3Row2;
        (result as CesiumMatrix4)[15] = column3Row3;
        return (result as CesiumMatrix4);
    }

    /**
     * Computes the product of a matrix and a column vector.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian4} cartesian The vector.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    static multiplyByVector (matrix: CesiumMatrix4, cartesian:Cartesian4, result: Cartesian4): Cartesian4 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;
        const vW = cartesian.w;

        const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
        const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
        const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
        const w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    }

    /**
     * Computes the product of two matrices assuming the matrices are affine transformation matrices,
     * where the upper left 3x3 elements are any matrix, and
     * the upper three elements in the fourth column are the translation.
     * The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the product for general 4x4
     * matrices using {@link Matrix4.multiply}.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * var m1 = new Cesium.Matrix4(1.0, 6.0, 7.0, 0.0, 2.0, 5.0, 8.0, 0.0, 3.0, 4.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0);
     * var m2 = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 1.0, 1.0));
     * var m3 = Cesium.Matrix4.multiplyTransformation(m1, m2, new Cesium.Matrix4());
     */
    static multiplyTransformation (left: CesiumMatrix4, right: CesiumMatrix4, result: CesiumMatrix4): CesiumMatrix4 {
        const left0 = left[0];
        const left1 = left[1];
        const left2 = left[2];
        const left4 = left[4];
        const left5 = left[5];
        const left6 = left[6];
        const left8 = left[8];
        const left9 = left[9];
        const left10 = left[10];
        const left12 = left[12];
        const left13 = left[13];
        const left14 = left[14];

        const right0 = right[0];
        const right1 = right[1];
        const right2 = right[2];
        const right4 = right[4];
        const right5 = right[5];
        const right6 = right[6];
        const right8 = right[8];
        const right9 = right[9];
        const right10 = right[10];
        const right12 = right[12];
        const right13 = right[13];
        const right14 = right[14];

        const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
        const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
        const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

        const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
        const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
        const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

        const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
        const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
        const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

        const column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12;
        const column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13;
        const column3Row2 =
      left2 * right12 + left6 * right13 + left10 * right14 + left14;

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = 0.0;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = 0.0;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = 1.0;
        return result;
    }

    /**
     * Gets the upper left 3x3 matrix of the provided matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @example
     * // returns a Matrix3 instance from a Matrix4 instance
     *
     * // m = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * var b = new Cesium.Matrix3();
     * Cesium.Matrix4.getMatrix3(m,b);
     *
     * // b = [10.0, 14.0, 18.0]
     * //     [11.0, 15.0, 19.0]
     * //     [12.0, 16.0, 20.0]
     */
    static getMatrix3 (matrix: CesiumMatrix4, result: CesiumMatrix3): CesiumMatrix3 {
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[4];
        result[4] = matrix[5];
        result[5] = matrix[6];
        result[6] = matrix[8];
        result[7] = matrix[9];
        result[8] = matrix[10];
        return result;
    }
}

export { CesiumMatrix4 };
