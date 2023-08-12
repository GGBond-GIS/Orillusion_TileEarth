import { CesiumMath } from './CesiumMath';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { WebGLConstants } from './WebGLConstants';

const IndexDatatype = {
    /**
     * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
     * of an element in <code>Uint8Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

    /**
     * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
     * of an element in <code>Uint16Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

    /**
     * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
     * of an element in <code>Uint32Array</code>.
     *
     * @type {Number}
     * @constant
     */
    UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,
    createTypedArray: function (
        numberOfVertices: number,
        indicesLengthOrArray: number
    ): Uint32Array | Uint16Array {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(numberOfVertices)) {
            throw new DeveloperError('numberOfVertices is required.');
        }
        // >>includeEnd('debug');

        if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(indicesLengthOrArray);
        }

        return new Uint16Array(indicesLengthOrArray);
    },

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {IndexDatatype} indexDatatype The index datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @example
     * // Returns 2
     * var size = Cesium.IndexDatatype.getSizeInBytes(Cesium.IndexDatatype.UNSIGNED_SHORT);
     */
    getSizeInBytes  (indexDatatype: number): number {
        switch (indexDatatype) {
        case IndexDatatype.UNSIGNED_BYTE:
            return Uint8Array.BYTES_PER_ELEMENT;
        case IndexDatatype.UNSIGNED_SHORT:
            return Uint16Array.BYTES_PER_ELEMENT;
        case IndexDatatype.UNSIGNED_INT:
            return Uint32Array.BYTES_PER_ELEMENT;
        }

        // >>includeStart('debug', pragmas.debug);
        throw new DeveloperError(
            'indexDatatype is required and must be a valid IndexDatatype constant.'
        );
    // >>includeEnd('debug');
    },

    /**
     * Gets the datatype with a given size in bytes.
     *
     * @param {Number} sizeInBytes The size of a single index in bytes.
     * @returns {IndexDatatype} The index datatype with the given size.
     */
    fromSizeInBytes (sizeInBytes: number): number {
        switch (sizeInBytes) {
        case 2:
            return IndexDatatype.UNSIGNED_SHORT;
        case 4:
            return IndexDatatype.UNSIGNED_INT;
        case 1:
            return IndexDatatype.UNSIGNED_BYTE;
            // >>includeStart('debug', pragmas.debug);
        default:
            throw new DeveloperError(
                'Size in bytes cannot be mapped to an IndexDatatype'
            );
      // >>includeEnd('debug');
        }
    }
};
export { IndexDatatype };
