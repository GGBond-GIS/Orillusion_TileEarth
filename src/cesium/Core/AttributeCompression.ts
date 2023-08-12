import { Cartesian2 } from './Cartesian2';
import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { CesiumMath } from './CesiumMath';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

const RIGHT_SHIFT = 1.0 / 256.0;
const LEFT_SHIFT = 256.0;

/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-rangeMax] following the 'oct' encoding.
 *
 * Oct encoding is a compact representation of unit length vectors.
 * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
 * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
 *
 * @param {Cartesian3} vector The normalized vector to be compressed into 2 component 'oct' encoding.
 * @param {Cartesian2} result The 2 component oct-encoded unit length vector.
 * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
 * @returns {Cartesian2} The 2 component oct-encoded unit length vector.
 *
 * @exception {DeveloperError} vector must be normalized.
 *
 * @see AttributeCompression.octDecodeInRange
 */
const octEncodeInRange = function (vector:Cartesian3, rangeMax:number, result:Cartesian2):Cartesian2 {
    // >>includeStart('debug', pragmas.debug);

    const magSquared = Cartesian3.magnitudeSquared(vector);
    if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
        throw new DeveloperError('vector must be normalized.');
    }
    // >>includeEnd('debug');

    result.x =
    vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    result.y =
    vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    if (vector.z < 0) {
        const x = result.x;
        const y = result.y;
        result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x);
        result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y);
    }

    result.x = CesiumMath.toSNorm(result.x, rangeMax);
    result.y = CesiumMath.toSNorm(result.y, rangeMax);

    return result;
};

/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
 *
 * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
 * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
 * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
 *
 * @exception {DeveloperError} vector must be normalized.
 *
 * @see AttributeCompression.octEncodeInRange
 * @see AttributeCompression.octDecode
 */
const octEncode = function (vector: Cartesian3, result:Cartesian2):Cartesian2 {
    return AttributeCompression.octEncodeInRange(vector, 255, result);
};

const octEncodeScratch = new Cartesian2();
const uint8ForceArray = new Uint8Array(1);
function forceUint8 (value: number): number {
    uint8ForceArray[0] = value;
    return uint8ForceArray[0];
}
/**
 * @param {Cartesian3} vector The normalized vector to be compressed into 4 byte 'oct' encoding.
 * @param {Cartesian4} result The 4 byte oct-encoded unit length vector.
 * @returns {Cartesian4} The 4 byte oct-encoded unit length vector.
 *
 * @exception {DeveloperError} vector must be normalized.
 *
 * @see AttributeCompression.octEncodeInRange
 * @see AttributeCompression.octDecodeFromCartesian4
 */
const octEncodeToCartesian4 = function (vector:Cartesian3, result:Cartesian4):Cartesian4 {
    AttributeCompression.octEncodeInRange(vector, 65535, octEncodeScratch);
    result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
    result.y = forceUint8(octEncodeScratch.x);
    result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
    result.w = forceUint8(octEncodeScratch.y);
    return result;
};

/**
 * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
 *
 * @param {Number} x The x component of the oct-encoded unit length vector.
 * @param {Number} y The y component of the oct-encoded unit length vector.
 * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
 * @param {Cartesian3} result The decoded and normalized vector
 * @returns {Cartesian3} The decoded and normalized vector.
 *
 * @exception {DeveloperError} x and y must be unsigned normalized integers between 0 and rangeMax.
 *
 * @see AttributeCompression.octEncodeInRange
 */
const octDecodeInRange = function (x: number, y: number, rangeMax: number, result: Cartesian3): Cartesian3 {
    // >>includeStart('debug', pragmas.debug);
    if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
        throw new DeveloperError(
            'x and y must be unsigned normalized integers between 0 and ' + rangeMax
        );
    }
    // >>includeEnd('debug');

    result.x = CesiumMath.fromSNorm(x, rangeMax);
    result.y = CesiumMath.fromSNorm(y, rangeMax);
    result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

    if (result.z < 0.0) {
        const oldVX = result.x;
        result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
        result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
    }

    return Cartesian3.normalize(result, result);
};

/**
 * Decodes a unit-length vector in 2 byte 'oct' encoding to a normalized 3-component vector.
 *
 * @param {Number} x The x component of the oct-encoded unit length vector.
 * @param {Number} y The y component of the oct-encoded unit length vector.
 * @param {Cartesian3} result The decoded and normalized vector.
 * @returns {Cartesian3} The decoded and normalized vector.
 *
 * @exception {DeveloperError} x and y must be an unsigned normalized integer between 0 and 255.
 *
 * @see AttributeCompression.octDecodeInRange
 */
const octDecode = function (x: number, y: number, result: Cartesian3): Cartesian3 {
    return AttributeCompression.octDecodeInRange(x, y, 255, result);
};

/**
 * Decodes a unit-length vector in 4 byte 'oct' encoding to a normalized 3-component vector.
 *
 * @param {Cartesian4} encoded The oct-encoded unit length vector.
 * @param {Cartesian3} result The decoded and normalized vector.
 * @returns {Cartesian3} The decoded and normalized vector.
 *
 * @exception {DeveloperError} x, y, z, and w must be unsigned normalized integers between 0 and 255.
 *
 * @see AttributeCompression.octDecodeInRange
 * @see AttributeCompression.octEncodeToCartesian4
 */
const octDecodeFromCartesian4 = function (encoded: Cartesian4, result:Cartesian3):Cartesian3 {
    const x = encoded.x;
    const y = encoded.y;
    const z = encoded.z;
    const w = encoded.w;
    // >>includeStart('debug', pragmas.debug);
    if (
        x < 0 ||
        x > 255 ||
        y < 0 ||
        y > 255 ||
        z < 0 ||
        z > 255 ||
        w < 0 ||
        w > 255
    ) {
        throw new DeveloperError(
            'x, y, z, and w must be unsigned normalized integers between 0 and 255'
        );
    }
    // >>includeEnd('debug');

    const xOct16 = x * LEFT_SHIFT + y;
    const yOct16 = z * LEFT_SHIFT + w;
    return AttributeCompression.octDecodeInRange(xOct16, yOct16, 65535, result);
};

/**
 * Packs an oct encoded vector into a single floating-point number.
 *
 * @param {Cartesian2} encoded The oct encoded vector.
 * @returns {Number} The oct encoded vector packed into a single float.
 *
 */
const octPackFloat = function (encoded:Cartesian2): number {
    return 256.0 * encoded.x + encoded.y;
};

const scratchEncodeCart2 = new Cartesian2();

/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
 * stores those values in a single float-point number.
 *
 * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
 * @returns {Number} The 2 byte oct-encoded unit length vector.
 *
 * @exception {DeveloperError} vector must be normalized.
 */
const octEncodeFloat = function (vector:Cartesian3): number {
    AttributeCompression.octEncode(vector, scratchEncodeCart2);
    return AttributeCompression.octPackFloat(scratchEncodeCart2);
};

/**
 * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
 *
 * @param {Number} value The oct-encoded unit length vector stored as a single floating-point number.
 * @param {Cartesian3} result The decoded and normalized vector
 * @returns {Cartesian3} The decoded and normalized vector.
 *
 */
const octDecodeFloat = function (value: number, result:Cartesian3): Cartesian3 {
    const temp = value / 256.0;
    const x = Math.floor(temp);
    const y = (temp - x) * 256.0;

    return AttributeCompression.octDecode(x, y, result);
};

/**
 * Encodes three normalized vectors into 6 SNORM values in the range of [0-255] following the 'oct' encoding and
 * packs those into two floating-point numbers.
 *
 * @param {Cartesian3} v1 A normalized vector to be compressed.
 * @param {Cartesian3} v2 A normalized vector to be compressed.
 * @param {Cartesian3} v3 A normalized vector to be compressed.
 * @param {Cartesian2} result The 'oct' encoded vectors packed into two floating-point numbers.
 * @returns {Cartesian2} The 'oct' encoded vectors packed into two floating-point numbers.
 *
 */
const octPack = function (v1:Cartesian3, v2:Cartesian3, v3:Cartesian3, result:Cartesian2):Cartesian2 {
    const encoded1 = AttributeCompression.octEncodeFloat(v1);
    const encoded2 = AttributeCompression.octEncodeFloat(v2);

    const encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
    result.x = 65536.0 * encoded3.x + encoded1;
    result.y = 65536.0 * encoded3.y + encoded2;
    return result;
};

/**
 * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
 *
 * @param {Cartesian2} packed The three oct-encoded unit length vectors stored as two floating-point number.
 * @param {Cartesian3} v1 One decoded and normalized vector.
 * @param {Cartesian3} v2 One decoded and normalized vector.
 * @param {Cartesian3} v3 One decoded and normalized vector.
 */
const octUnpack = function (packed:Cartesian2, v1:Cartesian3, v2:Cartesian3, v3:Cartesian3):void {
    let temp = packed.x / 65536.0;
    const x = Math.floor(temp);
    const encodedFloat1 = (temp - x) * 65536.0;

    temp = packed.y / 65536.0;
    const y = Math.floor(temp);
    const encodedFloat2 = (temp - y) * 65536.0;

    AttributeCompression.octDecodeFloat(encodedFloat1, v1);
    AttributeCompression.octDecodeFloat(encodedFloat2, v2);
    AttributeCompression.octDecode(x, y, v3);
};

/**
 * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
 *
 * @param {Cartesian2} textureCoordinates The texture coordinates to compress.  Both coordinates must be in the range 0.0-1.0.
 * @returns {Number} The packed texture coordinates.
 *
 */
const compressTextureCoordinates = function (textureCoordinates:Cartesian2):number {
    const x = (textureCoordinates.x * 4095.0) | 0;
    const y = (textureCoordinates.y * 4095.0) | 0;
    return 4096.0 * x + y;
};

/**
 * Decompresses texture coordinates that were packed into a single float.
 *
 * @param {Number} compressed The compressed texture coordinates.
 * @param {Cartesian2} result The decompressed texture coordinates.
 * @returns {Cartesian2} The modified result parameter.
 *
 */
const decompressTextureCoordinates = function (compressed: number, result:Cartesian2):Cartesian2 {
    const temp = compressed / 4096.0;
    const xZeroTo4095 = Math.floor(temp);
    result.x = xZeroTo4095 / 4095.0;
    result.y = (compressed - xZeroTo4095 * 4096) / 4095;
    return result;
};

function zigZagDecode (value:number) {
    return (value >> 1) ^ -(value & 1);
}

/**
 * Decodes delta and ZigZag encoded vertices. This modifies the buffers in place.
 *
 * @param {Uint16Array} uBuffer The buffer view of u values.
 * @param {Uint16Array} vBuffer The buffer view of v values.
 * @param {Uint16Array} [heightBuffer] The buffer view of height values.
 *
 * @see {@link https://github.com/CesiumGS/quantized-mesh|quantized-mesh-1.0 terrain format}
 */
const zigZagDeltaDecode = function (uBuffer:Uint16Array, vBuffer:Uint16Array, heightBuffer?:Uint16Array) {
    const count = uBuffer.length;

    let u = 0;
    let v = 0;
    let height = 0;

    for (let i = 0; i < count; ++i) {
        u += zigZagDecode(uBuffer[i]);
        v += zigZagDecode(vBuffer[i]);

        uBuffer[i] = u;
        vBuffer[i] = v;

        if (defined((heightBuffer as Uint16Array))) {
            height += zigZagDecode((heightBuffer as Uint16Array)[i]);
            (heightBuffer as Uint16Array)[i] = height;
        }
    }
};

/**
 * Attribute compression and decompression functions.
 *
 * @namespace AttributeCompression
 *
 * @private
 */
const AttributeCompression = {
    octEncodeInRange,
    octEncode,
    octEncodeToCartesian4,
    octDecodeInRange,
    octDecode,
    octDecodeFromCartesian4,
    octPackFloat,
    octEncodeFloat,
    octDecodeFloat,
    octPack,
    octUnpack,
    compressTextureCoordinates,
    decompressTextureCoordinates,
    zigZagDeltaDecode
};

export { AttributeCompression };
