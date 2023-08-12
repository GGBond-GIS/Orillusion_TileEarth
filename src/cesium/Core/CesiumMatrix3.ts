import { Cartesian3 } from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import { CesiumQuaternion } from './CesiumQuaternion';
import { Check } from './Check';
import { defaultValue } from './defaultValue';
import { defined } from './defined';

function computeFrobeniusNorm (matrix: CesiumMatrix3): number {
    let norm = 0.0;
    for (let i = 0; i < 9; ++i) {
        const temp = matrix[i];
        norm += temp * temp;
    }

    return Math.sqrt(norm);
}

const rowVal = [1, 0, 0];
const colVal = [2, 2, 1];

function offDiagonalFrobeniusNorm (matrix: CesiumMatrix3) {
    // Computes the "off-diagonal" Frobenius norm.
    // Assumes matrix is symmetric.

    let norm = 0.0;
    for (let i = 0; i < 3; ++i) {
        const temp = matrix[CesiumMatrix3.getElementIndex(colVal[i], rowVal[i])];
        norm += 2.0 * temp * temp;
    }

    return Math.sqrt(norm);
}

function shurDecomposition (matrix:CesiumMatrix3, result:CesiumMatrix3):CesiumMatrix3 {
    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.2 The 2by2 Symmetric Schur Decomposition.
    //
    // The routine takes a matrix, which is assumed to be symmetric, and
    // finds the largest off-diagonal term, and then creates
    // a matrix (result) which can be used to help reduce it

    const tolerance = CesiumMath.EPSILON15;

    let maxDiagonal = 0.0;
    let rotAxis = 1;

    // find pivot (rotAxis) based on max diagonal of matrix
    for (let i = 0; i < 3; ++i) {
        const temp = Math.abs(matrix[CesiumMatrix3.getElementIndex(colVal[i], rowVal[i])]);
        if (temp > maxDiagonal) {
            rotAxis = i;
            maxDiagonal = temp;
        }
    }

    let c = 1.0;
    let s = 0.0;

    const p = rowVal[rotAxis];
    const q = colVal[rotAxis];

    if (Math.abs(matrix[CesiumMatrix3.getElementIndex(q, p)]) > tolerance) {
        const qq = matrix[CesiumMatrix3.getElementIndex(q, q)];
        const pp = matrix[CesiumMatrix3.getElementIndex(p, p)];
        const qp = matrix[CesiumMatrix3.getElementIndex(q, p)];

        const tau = (qq - pp) / 2.0 / qp;
        let t;

        if (tau < 0.0) {
            t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
        } else {
            t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
        }

        c = 1.0 / Math.sqrt(1.0 + t * t);
        s = t * c;
    }

    result = CesiumMatrix3.clone(CesiumMatrix3.IDENTITY, result) as CesiumMatrix3;

    result[CesiumMatrix3.getElementIndex(p, p)] = result[
        CesiumMatrix3.getElementIndex(q, q)
    ] = c;
    result[CesiumMatrix3.getElementIndex(q, p)] = s;
    result[CesiumMatrix3.getElementIndex(p, q)] = -s;

    return result;
}

/**
 * A 3x3 matrix, indexable as a column-major order array.
 * Constructor parameters are in row-major order for code readability.
 * @alias Matrix3
 * @constructor
 * @implements {ArrayLike<number>}
 *
 * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
 * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
 * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
 * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
 * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
 * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
 * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
 * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
 * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
 *
 * @see Matrix3.fromColumnMajorArray
 * @see Matrix3.fromRowMajorArray
 * @see Matrix3.fromQuaternion
 * @see Matrix3.fromScale
 * @see Matrix3.fromUniformScale
 * @see Matrix2
 * @see Matrix4
 */
class CesiumMatrix3 {
    constructor (
        column0Row0 = 0.0, column1Row0 = 0.0, column2Row0 = 0.0,
        column0Row1 = 0.0, column1Row1 = 0.0, column2Row1 = 0.0,
        column0Row2 = 0.0, column1Row2 = 0.0, column2Row2 = 0.0) {
        this[0] = defaultValue(column0Row0, 0.0);
        this[1] = defaultValue(column0Row1, 0.0);
        this[2] = defaultValue(column0Row2, 0.0);
        this[3] = defaultValue(column1Row0, 0.0);
        this[4] = defaultValue(column1Row1, 0.0);
        this[5] = defaultValue(column1Row2, 0.0);
        this[6] = defaultValue(column2Row0, 0.0);
        this[7] = defaultValue(column2Row1, 0.0);
        this[8] = defaultValue(column2Row2, 0.0);
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    static packedLength = 9;

    /**
     * An immutable Matrix3 instance initialized to the identity matrix.
     *
     * @type {Matrix3}
     * @constant
     */
    static IDENTITY = Object.freeze(
        new CesiumMatrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)
    );

    /**
   * An immutable Matrix3 instance initialized to the zero matrix.
   *
   * @type {Matrix3}
   * @constant
   */
    static ZERO = Object.freeze(
        new CesiumMatrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    );

    /**
    * The index into Matrix3 for column 0, row 0.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN0ROW0 = 0;

    /**
    * The index into Matrix3 for column 0, row 1.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN0ROW1 = 1;

    /**
    * The index into Matrix3 for column 0, row 2.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN0ROW2 = 2;

    /**
    * The index into Matrix3 for column 1, row 0.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN1ROW0 = 3;

    /**
    * The index into Matrix3 for column 1, row 1.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN1ROW1 = 4;

    /**
    * The index into Matrix3 for column 1, row 2.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN1ROW2 = 5;

    /**
    * The index into Matrix3 for column 2, row 0.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN2ROW0 = 6;

    /**
    * The index into Matrix3 for column 2, row 1.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN2ROW1 = 7;

    /**
    * The index into Matrix3 for column 2, row 2.
    *
    * @type {Number}
    * @constant
    */
    static COLUMN2ROW2 = 8;

    /**
      * Stores the provided instance into the provided array.
      *
      * @param {Matrix3} value The value to pack.
      * @param {Number[]} array The array to pack into.
      * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
      *
      * @returns {Number[]} The array that was packed into
      */
    static pack (value: CesiumMatrix3, array: number[], startingIndex = 0): number[] {
        // >>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        // >>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value[0];
        array[startingIndex++] = value[1];
        array[startingIndex++] = value[2];
        array[startingIndex++] = value[3];
        array[startingIndex++] = value[4];
        array[startingIndex++] = value[5];
        array[startingIndex++] = value[6];
        array[startingIndex++] = value[7];
        array[startingIndex++] = value[8];

        return array;
    }

    /**
      * Retrieves an instance from a packed array.
      *
      * @param {Number[]} array The packed array.
      * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
      * @param {Matrix3} [result] The object into which to store the result.
      * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
      */
    static unpack (array: number[], startingIndex = 0, result?: CesiumMatrix3): CesiumMatrix3 {
        // >>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        // >>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new CesiumMatrix3();
        }

        (result as CesiumMatrix3)[0] = array[startingIndex++];
        (result as CesiumMatrix3)[1] = array[startingIndex++];
        (result as CesiumMatrix3)[2] = array[startingIndex++];
        (result as CesiumMatrix3)[3] = array[startingIndex++];
        (result as CesiumMatrix3)[4] = array[startingIndex++];
        (result as CesiumMatrix3)[5] = array[startingIndex++];
        (result as CesiumMatrix3)[6] = array[startingIndex++];
        (result as CesiumMatrix3)[7] = array[startingIndex++];
        (result as CesiumMatrix3)[8] = array[startingIndex++];
        return (result as CesiumMatrix3);
    }

    /**
      * Duplicates a Matrix3 instance.
      *
      * @param {Matrix3} matrix The matrix to duplicate.
      * @param {Matrix3} [result] The object onto which to store the result.
      * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
      */
    static clone (matrix: CesiumMatrix3, result?: CesiumMatrix3): CesiumMatrix3 | undefined {
        if (!defined(matrix)) {
            return undefined;
        }
        if (!defined(result)) {
            return new CesiumMatrix3(
                matrix[0],
                matrix[3],
                matrix[6],
                matrix[1],
                matrix[4],
                matrix[7],
                matrix[2],
                matrix[5],
                matrix[8]
            );
        }
        (result as CesiumMatrix3)[0] = matrix[0];
        (result as CesiumMatrix3)[1] = matrix[1];
        (result as CesiumMatrix3)[2] = matrix[2];
        (result as CesiumMatrix3)[3] = matrix[3];
        (result as CesiumMatrix3)[4] = matrix[4];
        (result as CesiumMatrix3)[5] = matrix[5];
        (result as CesiumMatrix3)[6] = matrix[6];
        (result as CesiumMatrix3)[7] = matrix[7];
        (result as CesiumMatrix3)[8] = matrix[8];
        return (result as CesiumMatrix3);
    }

    /**
      * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
      *
      * @param {Matrix3} matrix The matrix to use.
      * @param {Number} index The zero-based index of the column to retrieve.
      * @param {Cartesian3} result The object onto which to store the result.
      * @returns {Cartesian3} The modified result parameter.
      *
      * @exception {DeveloperError} index must be 0, 1, or 2.
      */
    static getColumn (matrix: CesiumMatrix3, index: number, result: Cartesian3): Cartesian3 {
        const startIndex = index * 3;
        const x = matrix[startIndex];
        const y = matrix[startIndex + 1];
        const z = matrix[startIndex + 2];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
  * Computes the eigenvectors and eigenvalues of a symmetric matrix.
  * <p>
  * Returns a diagonal matrix and unitary matrix such that:
  * <code>matrix = unitary matrix * diagonal matrix * transpose(unitary matrix)</code>
  * </p>
  * <p>
  * The values along the diagonal of the diagonal matrix are the eigenvalues. The columns
  * of the unitary matrix are the corresponding eigenvectors.
  * </p>
  *
  * @param {Matrix3} matrix The matrix to decompose into diagonal and unitary matrix. Expected to be symmetric.
  * @param {Object} [result] An object with unitary and diagonal properties which are matrices onto which to store the result.
  * @returns {Object} An object with unitary and diagonal properties which are the unitary and diagonal matrices, respectively.
  *
  * @example
  * var a = //... symetric matrix
  * var result = {
  *     unitary : new Cesium.Matrix3(),
  *     diagonal : new Cesium.Matrix3()
  * };
  * Cesium.Matrix3.computeEigenDecomposition(a, result);
  *
  * var unitaryTranspose = Cesium.Matrix3.transpose(result.unitary, new Cesium.Matrix3());
  * var b = Cesium.Matrix3.multiply(result.unitary, result.diagonal, new Cesium.Matrix3());
  * Cesium.Matrix3.multiply(b, unitaryTranspose, b); // b is now equal to a
  *
  * var lambda = Cesium.Matrix3.getColumn(result.diagonal, 0, new Cesium.Cartesian3()).x;  // first eigenvalue
  * var v = Cesium.Matrix3.getColumn(result.unitary, 0, new Cesium.Cartesian3());          // first eigenvector
  * var c = Cesium.Cartesian3.multiplyByScalar(v, lambda, new Cesium.Cartesian3());        // equal to Cesium.Matrix3.multiplyByVector(a, v)
  */
    static computeEigenDecomposition (matrix: CesiumMatrix3, result = {
        unitary: new CesiumMatrix3(),
        diagonal: new CesiumMatrix3()
    }): { unitary: CesiumMatrix3, diagonal: CesiumMatrix3 } {
        // >>includeStart('debug', pragmas.debug);
        Check.typeOf.object('matrix', matrix);
        // >>includeEnd('debug');

        // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
        // section 8.4.3 The Classical Jacobi Algorithm

        const tolerance = CesiumMath.EPSILON20;
        const maxSweeps = 10;

        let count = 0;
        let sweep = 0;

        if (!defined(result)) {
            result = {
                unitary: new CesiumMatrix3(),
                diagonal: new CesiumMatrix3()
            };
        }

        const unitaryMatrix = (result.unitary = CesiumMatrix3.clone(
            CesiumMatrix3.IDENTITY,
            result.unitary
        ) as CesiumMatrix3);

        const diagMatrix = (result.diagonal = CesiumMatrix3.clone(matrix, result.diagonal) as CesiumMatrix3);

        const epsilon = tolerance * computeFrobeniusNorm(diagMatrix);

        while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
            shurDecomposition(diagMatrix, jMatrix);
            CesiumMatrix3.transpose(jMatrix, jMatrixTranspose);
            CesiumMatrix3.multiply(diagMatrix, jMatrix, diagMatrix);
            CesiumMatrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
            CesiumMatrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);

            if (++count > 2) {
                ++sweep;
                count = 0;
            }
        }

        return result;
    }

    /**
      * Computes the array index of the element at the provided row and column.
      *
      * @param {Number} row The zero-based index of the row.
      * @param {Number} column The zero-based index of the column.
      * @returns {Number} The index of the element at the provided row and column.
      *
      * @exception {DeveloperError} row must be 0, 1, or 2.
      * @exception {DeveloperError} column must be 0, 1, or 2.
      *
      * @example
      * var myMatrix = new Cesium.Matrix3();
      * var column1Row0Index = Cesium.Matrix3.getElementIndex(1, 0);
      * var column1Row0 = myMatrix[column1Row0Index]
      * myMatrix[column1Row0Index] = 10.0;
      */
    static getElementIndex (column: number, row: number): number {
        return column * 3 + row;
    }

    /**
  * Computes the transpose of the provided matrix.
  *
  * @param {Matrix3} matrix The matrix to transpose.
  * @param {Matrix3} result The object onto which to store the result.
  * @returns {Matrix3} The modified result parameter.
  */
    static transpose (matrix: CesiumMatrix3, result: CesiumMatrix3): CesiumMatrix3 {
        const column0Row0 = matrix[0];
        const column0Row1 = matrix[3];
        const column0Row2 = matrix[6];
        const column1Row0 = matrix[1];
        const column1Row1 = matrix[4];
        const column1Row2 = matrix[7];
        const column2Row0 = matrix[2];
        const column2Row1 = matrix[5];
        const column2Row2 = matrix[8];

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column1Row0;
        result[4] = column1Row1;
        result[5] = column1Row2;
        result[6] = column2Row0;
        result[7] = column2Row1;
        result[8] = column2Row2;
        return result;
    }

    /**
      * Computes the product of two matrices.
      *
      * @param {Matrix3} left The first matrix.
      * @param {Matrix3} right The second matrix.
      * @param {Matrix3} result The object onto which to store the result.
      * @returns {Matrix3} The modified result parameter.
      */
    static multiply (left: CesiumMatrix3, right: CesiumMatrix3, result: CesiumMatrix3): CesiumMatrix3 {
        const column0Row0 =
            left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
        const column0Row1 =
            left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
        const column0Row2 =
            left[2] * right[0] + left[5] * right[1] + left[8] * right[2];

        const column1Row0 =
            left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
        const column1Row1 =
            left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
        const column1Row2 =
            left[2] * right[3] + left[5] * right[4] + left[8] * right[5];

        const column2Row0 =
            left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
        const column2Row1 =
            left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
        const column2Row2 =
            left[2] * right[6] + left[5] * right[7] + left[8] * right[8];

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column1Row0;
        result[4] = column1Row1;
        result[5] = column1Row2;
        result[6] = column2Row0;
        result[7] = column2Row1;
        result[8] = column2Row2;
        return result;
    }

    /**
      * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
      *
      * @param {CesiumMatrix3} matrix The matrix to use.
      * @param {Number} index The zero-based index of the column to set.
      * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified column.
      * @param {CesiumMatrix3} result The object onto which to store the result.
      * @returns {CesiumMatrix3} The modified result parameter.
      *
      * @exception {DeveloperError} index must be 0, 1, or 2.
      */
    static setColumn (matrix: CesiumMatrix3, index: number, cartesian: Cartesian3, result: CesiumMatrix3): CesiumMatrix3 {
        result = CesiumMatrix3.clone(matrix, result) as CesiumMatrix3;
        const startIndex = index * 3;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        result[startIndex + 2] = cartesian.z;
        return result;
    }

    /**
      * Computes the product of a matrix and a column vector.
      *
      * @param {Matrix3} matrix The matrix.
      * @param {Cartesian3} cartesian The column.
      * @param {Cartesian3} result The object onto which to store the result.
      * @returns {Cartesian3} The modified result parameter.
      */
    static multiplyByVector (matrix: CesiumMatrix3, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
        const y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
        const z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
      * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
      *
      * @param {Matrix3} matrix The matrix on the left-hand side.
      * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
      * @param {Matrix3} result The object onto which to store the result.
      * @returns {Matrix3} The modified result parameter.
      *
      *
      * @example
      * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromScale(scale), m);
      * Cesium.Matrix3.multiplyByScale(m, scale, m);
      *
      * @see Matrix3.fromScale
      * @see Matrix3.multiplyByUniformScale
      */
    static multiplyByScale (matrix: CesiumMatrix3, scale: Cartesian3, result: CesiumMatrix3): CesiumMatrix3 {
        result[0] = matrix[0] * scale.x;
        result[1] = matrix[1] * scale.x;
        result[2] = matrix[2] * scale.x;
        result[3] = matrix[3] * scale.y;
        result[4] = matrix[4] * scale.y;
        result[5] = matrix[5] * scale.y;
        result[6] = matrix[6] * scale.z;
        result[7] = matrix[7] * scale.z;
        result[8] = matrix[8] * scale.z;
        return result;
    }

    /**
      * Computes a 3x3 rotation matrix from the provided quaternion.
      *
      * @param {Quaternion} quaternion the quaternion to use.
      * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
      * @returns {Matrix3} The 3x3 rotation matrix from this quaternion.
      */
    static fromQuaternion (quaternion: CesiumQuaternion, result?: CesiumMatrix3): CesiumMatrix3 {
        const x2 = quaternion.x * quaternion.x;
        const xy = quaternion.x * quaternion.y;
        const xz = quaternion.x * quaternion.z;
        const xw = quaternion.x * quaternion.w;
        const y2 = quaternion.y * quaternion.y;
        const yz = quaternion.y * quaternion.z;
        const yw = quaternion.y * quaternion.w;
        const z2 = quaternion.z * quaternion.z;
        const zw = quaternion.z * quaternion.w;
        const w2 = quaternion.w * quaternion.w;

        const m00 = x2 - y2 - z2 + w2;
        const m01 = 2.0 * (xy - zw);
        const m02 = 2.0 * (xz + yw);

        const m10 = 2.0 * (xy + zw);
        const m11 = -x2 + y2 - z2 + w2;
        const m12 = 2.0 * (yz - xw);

        const m20 = 2.0 * (xz - yw);
        const m21 = 2.0 * (yz + xw);
        const m22 = -x2 - y2 + z2 + w2;

        if (!defined(result)) {
            return new CesiumMatrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
        }
        (result as CesiumMatrix3)[0] = m00;
        (result as CesiumMatrix3)[1] = m10;
        (result as CesiumMatrix3)[2] = m20;
        (result as CesiumMatrix3)[3] = m01;
        (result as CesiumMatrix3)[4] = m11;
        (result as CesiumMatrix3)[5] = m21;
        (result as CesiumMatrix3)[6] = m02;
        (result as CesiumMatrix3)[7] = m12;
        (result as CesiumMatrix3)[8] = m22;
        return (result as CesiumMatrix3);
    }

    /**
      * Computes a Matrix3 instance representing a non-uniform scale.
      *
      * @param {Cartesian3} scale The x, y, and z scale factors.
      * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
      * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
      *
      * @example
      * // Creates
      * //   [7.0, 0.0, 0.0]
      * //   [0.0, 8.0, 0.0]
      * //   [0.0, 0.0, 9.0]
      * var m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
      */
    static fromScale (scale: Cartesian3, result?: CesiumMatrix3): CesiumMatrix3 {
        if (!defined(result)) {
            return new CesiumMatrix3(scale.x, 0.0, 0.0, 0.0, scale.y, 0.0, 0.0, 0.0, scale.z);
        }

        (result as CesiumMatrix3)[0] = scale.x;
        (result as CesiumMatrix3)[1] = 0.0;
        (result as CesiumMatrix3)[2] = 0.0;
        (result as CesiumMatrix3)[3] = 0.0;
        (result as CesiumMatrix3)[4] = scale.y;
        (result as CesiumMatrix3)[5] = 0.0;
        (result as CesiumMatrix3)[6] = 0.0;
        (result as CesiumMatrix3)[7] = 0.0;
        (result as CesiumMatrix3)[8] = scale.z;
        return (result as CesiumMatrix3);
    }

    /**
      * Creates a rotation matrix around the x-axis.
      *
      * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
      * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
      * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
      *
      * @example
      * // Rotate a point 45 degrees counterclockwise around the x-axis.
      * var p = new Cesium.Cartesian3(5, 6, 7);
      * var m = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(45.0));
      * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
      */
    static fromRotationX (angle: number, result?: CesiumMatrix3): CesiumMatrix3 {
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new CesiumMatrix3(
                1.0,
                0.0,
                0.0,
                0.0,
                cosAngle,
                -sinAngle,
                0.0,
                sinAngle,
                cosAngle
            );
        }

        (result as CesiumMatrix3)[0] = 1.0;
        (result as CesiumMatrix3)[1] = 0.0;
        (result as CesiumMatrix3)[2] = 0.0;
        (result as CesiumMatrix3)[3] = 0.0;
        (result as CesiumMatrix3)[4] = cosAngle;
        (result as CesiumMatrix3)[5] = sinAngle;
        (result as CesiumMatrix3)[6] = 0.0;
        (result as CesiumMatrix3)[7] = -sinAngle;
        (result as CesiumMatrix3)[8] = cosAngle;

        return (result as CesiumMatrix3);
    }

    /**
     * Creates a rotation matrix around the y-axis.
     *
     * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Rotate a point 45 degrees counterclockwise around the y-axis.
     * var p = new Cesium.Cartesian3(5, 6, 7);
     * var m = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(45.0));
     * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
     */
    static fromRotationY (angle: number, result?: CesiumMatrix3): CesiumMatrix3 {
    // >>includeStart('debug', pragmas.debug);
        Check.typeOf.number('angle', angle);
        // >>includeEnd('debug');

        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new CesiumMatrix3(
                cosAngle,
                0.0,
                sinAngle,
                0.0,
                1.0,
                0.0,
                -sinAngle,
                0.0,
                cosAngle
            );
        }

        (result as CesiumMatrix3)[0] = cosAngle;
        (result as CesiumMatrix3)[1] = 0.0;
        (result as CesiumMatrix3)[2] = -sinAngle;
        (result as CesiumMatrix3)[3] = 0.0;
        (result as CesiumMatrix3)[4] = 1.0;
        (result as CesiumMatrix3)[5] = 0.0;
        (result as CesiumMatrix3)[6] = sinAngle;
        (result as CesiumMatrix3)[7] = 0.0;
        (result as CesiumMatrix3)[8] = cosAngle;

        return (result as CesiumMatrix3);
    }

    /**
     * Creates a rotation matrix around the z-axis.
     *
     * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Rotate a point 45 degrees counterclockwise around the z-axis.
     * var p = new Cesium.Cartesian3(5, 6, 7);
     * var m = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(45.0));
     * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
     */
    static fromRotationZ (angle: number, result?: CesiumMatrix3): CesiumMatrix3 {
        // >>includeStart('debug', pragmas.debug);
        Check.typeOf.number('angle', angle);
        // >>includeEnd('debug');

        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new CesiumMatrix3(
                cosAngle,
                -sinAngle,
                0.0,
                sinAngle,
                cosAngle,
                0.0,
                0.0,
                0.0,
                1.0
            );
        }
        (result as CesiumMatrix3)[0] = cosAngle;
        (result as CesiumMatrix3)[1] = sinAngle;
        (result as CesiumMatrix3)[2] = 0.0;
        (result as CesiumMatrix3)[3] = -sinAngle;
        (result as CesiumMatrix3)[4] = cosAngle;
        (result as CesiumMatrix3)[5] = 0.0;
        (result as CesiumMatrix3)[6] = 0.0;
        (result as CesiumMatrix3)[7] = 0.0;
        (result as CesiumMatrix3)[8] = 1.0;

        return (result as CesiumMatrix3);
    }
}

const jMatrix = new CesiumMatrix3();
const jMatrixTranspose = new CesiumMatrix3();

export { CesiumMatrix3 };
