import { defaultValue } from '../../Util/defaultValue';
import { defined } from '../../Util/defined';
import { destroyObject } from '../../Util/destroyObject';
import { IndexDatatype } from '../Geometry/IndexDatatype';
import { WebGLConstants } from '../../ori_map/Core/WebGLConstants';
import { Context } from './Context';

class Buffer {
    _gl: WebGLRenderingContext;
    _webgl2: boolean;
    _bufferTarget: any;
    _sizeInBytes: any;
    _usage: any;
    _buffer: any;
    vertexArrayDestroyable = true;
    constructor (options: {
        context: Context,
        bufferTarget?: any,
        typedArray: ArrayBuffer,
        sizeInBytes?: number,
        usage: number
    }) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as any;

        const gl = options.context._gl;
        const bufferTarget = options.bufferTarget;
        const typedArray = options.typedArray;
        let sizeInBytes = options.sizeInBytes;
        const usage = options.usage;
        const hasArray = defined(typedArray);

        if (hasArray) {
            sizeInBytes = typedArray.byteLength;
        }

        // const buffer = gl.createBuffer();
        // gl.bindBuffer(bufferTarget, buffer);
        // gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
        // gl.bindBuffer(bufferTarget, null);

        this._gl = gl;
        this._webgl2 = options.context.webgl2;
        this._bufferTarget = bufferTarget;
        this._sizeInBytes = sizeInBytes;
        this._usage = usage;
        // this._buffer = buffer;
        this.vertexArrayDestroyable = true;
    }

    get sizeInBytes (): number {
        return this._sizeInBytes;
    }

    get usage (): number {
        return this._usage;
    }

    /**
     * Creates a vertex buffer, which contains untyped vertex data in GPU-controlled memory.
     * <br /><br />
     * A vertex array defines the actual makeup of a vertex, e.g., positions, normals, texture coordinates,
     * etc., by interpreting the raw data in one or more vertex buffers.
     *
     * @param {Object} options An object containing the following properties:
     * @param {Context} options.context The context in which to create the buffer
     * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
     * @param {Number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
     * @param {BufferUsage} options.usage Specifies the expected usage pattern of the buffer. On some GL implementations, this can significantly affect performance. See {@link BufferUsage}.
     * @returns {VertexBuffer} The vertex buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} Must specify either <options.typedArray> or <options.sizeInBytes>, but not both.
     * @exception {DeveloperError} The buffer size must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     *
     *
     * @example
     * // Example 1. Create a dynamic vertex buffer 16 bytes in size.
     * var buffer = Buffer.createVertexBuffer({
     *     context : context,
     *     sizeInBytes : 16,
     *     usage : BufferUsage.DYNAMIC_DRAW
     * });
     *
     * @example
     * // Example 2. Create a dynamic vertex buffer from three floating-point values.
     * // The data copied to the vertex buffer is considered raw bytes until it is
     * // interpreted as vertices using a vertex array.
     * var positionBuffer = buffer.createVertexBuffer({
     *     context : context,
     *     typedArray : new Float32Array([0, 0, 0]),
     *     usage : BufferUsage.STATIC_DRAW
     * });
     *
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ARRAY_BUFFER</code>
     */
    static createVertexBuffer (options: any) {
        return new Buffer({
            context: options.context,
            bufferTarget: WebGLConstants.ARRAY_BUFFER,
            typedArray: options.typedArray,
            sizeInBytes: options.sizeInBytes,
            usage: options.usage
        });
    }

    /**
     * Creates an index buffer, which contains typed indices in GPU-controlled memory.
     * <br /><br />
     * An index buffer can be attached to a vertex array to select vertices for rendering.
     * <code>Context.draw</code> can render using the entire index buffer or a subset
     * of the index buffer defined by an offset and count.
     *
     * @param {Object} options An object containing the following properties:
     * @param {Context} options.context The context in which to create the buffer
     * @param {ArrayBufferView} [options.typedArray] A typed array containing the data to copy to the buffer.
     * @param {Number} [options.sizeInBytes] A <code>Number</code> defining the size of the buffer in bytes. Required if options.typedArray is not given.
     * @param {BufferUsage} options.usage Specifies the expected usage pattern of the buffer. On some GL implementations, this can significantly affect performance. See {@link BufferUsage}.
     * @param {IndexDatatype} options.indexDatatype The datatype of indices in the buffer.
     * @returns {IndexBuffer} The index buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} Must specify either <options.typedArray> or <options.sizeInBytes>, but not both.
     * @exception {DeveloperError} IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system. Check context.elementIndexUint.
     * @exception {DeveloperError} The size in bytes must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     * @exception {DeveloperError} Invalid <code>indexDatatype</code>.
     *
     *
     * @example
     * // Example 1. Create a stream index buffer of unsigned shorts that is
     * // 16 bytes in size.
     * var buffer = Buffer.createIndexBuffer({
     *     context : context,
     *     sizeInBytes : 16,
     *     usage : BufferUsage.STREAM_DRAW,
     *     indexDatatype : IndexDatatype.UNSIGNED_SHORT
     * });
     *
     * @example
     * // Example 2. Create a static index buffer containing three unsigned shorts.
     * var buffer = Buffer.createIndexBuffer({
     *     context : context,
     *     typedArray : new Uint16Array([0, 1, 2]),
     *     usage : BufferUsage.STATIC_DRAW,
     *     indexDatatype : IndexDatatype.UNSIGNED_SHORT
     * });
     *
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ELEMENT_ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ELEMENT_ARRAY_BUFFER</code>
     */
    static createIndexBuffer (options: any) {
        const context = options.context;
        const indexDatatype = options.indexDatatype;

        const bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype);
        const buffer = new Buffer({
            context: context,
            bufferTarget: WebGLConstants.ELEMENT_ARRAY_BUFFER,
            typedArray: options.typedArray,
            sizeInBytes: options.sizeInBytes,
            usage: options.usage
        });

        const numberOfIndices = buffer.sizeInBytes / bytesPerIndex;

        Object.defineProperties(buffer, {
            indexDatatype: {
                get: function () {
                    return indexDatatype;
                }
            },
            bytesPerIndex: {
                get: function () {
                    return bytesPerIndex;
                }
            },
            numberOfIndices: {
                get: function () {
                    return numberOfIndices;
                }
            }
        });

        return buffer;
    }

    isDestroyed (): boolean {
        return false;
    }

    destroy () {
        return destroyObject(this);
    }
}

export { Buffer };
