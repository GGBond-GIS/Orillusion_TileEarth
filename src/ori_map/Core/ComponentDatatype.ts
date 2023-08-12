import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

const ComponentDatatype = {
    BYTE: 5120,
    DOUBLE: 5130,
    FLOAT: 5126,
    INT: 5124,
    SHORT: 5122,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_INT: 5125,
    UNSIGNED_SHORT: 5123,

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
     *
     * @example
     * // Returns Int8Array.BYTES_PER_ELEMENT
     * var size = Cesium.ComponentDatatype.getSizeInBytes(Cesium.ComponentDatatype.BYTE);
     */
    getSizeInBytes: (componentDatatype: number) => {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(componentDatatype)) {
            throw new DeveloperError('value is required.');
        }
        // >>includeEnd('debug');

        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return Int8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_BYTE:
            return Uint8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.SHORT:
            return Int16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_SHORT:
            return Uint16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.INT:
            return Int32Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_INT:
            return Uint32Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.FLOAT:
            return Float32Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.DOUBLE:
            return Float64Array.BYTES_PER_ELEMENT;
        // >>includeStart('debug', pragmas.debug);
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        // >>includeEnd('debug');
        }
    }
};

export { ComponentDatatype };
