import { Matrix4 } from 'three';
import { AttributeCompression } from './AttributeCompression';
import { AxisAlignedBoundingBox } from './AxisAlignedBoundingBox';
import { Cartesian2 } from './Cartesian2';
import { Cartesian3 } from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import { CesiumMatrix4 } from './CesiumMatrix4';
import { ComponentDatatype } from './ComponentDatatype';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Ellipsoid } from './Ellipsoid';
import { TerrainExaggeration } from './TerrainExaggeration';
import { TerrainQuantization } from './TerrainQuantization';

const cartesian3Scratch = new Cartesian3();
const cartesian3DimScratch = new Cartesian3();
const cartesian2Scratch = new Cartesian2();
const matrix4Scratch = new CesiumMatrix4();
const matrix4Scratch2 = new CesiumMatrix4();

const SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

const scratchPosition = new Cartesian3();
const scratchGeodeticSurfaceNormal = new Cartesian3();

const attributesIndicesNone = {
    position3DAndHeight: 0,
    textureCoordAndEncodedNormals: 1,
    geodeticSurfaceNormal: 2
};
const attributesIndicesBits12 = {
    compressed0: 0,
    compressed1: 1,
    geodeticSurfaceNormal: 2
};
/**
 * Data used to quantize and pack the terrain mesh. The position can be unpacked for picking and all attributes
 * are unpacked in the vertex shader.
 *
 * @alias TerrainEncoding
 * @constructor
 *
 * @param {Cartesian3} center The center point of the vertices.
 * @param {AxisAlignedBoundingBox} axisAlignedBoundingBox The bounds of the tile in the east-north-up coordinates at the tiles center.
 * @param {Number} minimumHeight The minimum height.
 * @param {Number} maximumHeight The maximum height.
 * @param {Matrix4} fromENU The east-north-up to fixed frame matrix at the center of the terrain mesh.
 * @param {Boolean} hasVertexNormals If the mesh has vertex normals.
 * @param {Boolean} [hasWebMercatorT=false] true if the terrain data includes a Web Mercator texture coordinate; otherwise, false.
 * @param {Boolean} [hasGeodeticSurfaceNormals=false] true if the terrain data includes geodetic surface normals; otherwise, false.
 * @param {Number} [exaggeration=1.0] A scalar used to exaggerate terrain.
 * @param {Number} [exaggerationRelativeHeight=0.0] The relative height from which terrain is exaggerated.
 *
 * @private
 */
class TerrainEncoding {
    quantization: TerrainQuantization;
    minimumHeight?: number;
    maximumHeight?: number;
    center?: Cartesian3;
    toScaledENU?: CesiumMatrix4;
    fromScaledENU?: CesiumMatrix4;
    matrix: CesiumMatrix4;
    hasVertexNormals: boolean;
    hasWebMercatorT = false;
    hasGeodeticSurfaceNormals = false;
    exaggeration = 1.0;
    exaggerationRelativeHeight = 0.0;
    /**
     * The number of components in each vertex. This value can differ with different quantizations.
     * @type {Number}
     */
    stride = 0;

    _offsetGeodeticSurfaceNormal = 0;
    _offsetVertexNormal = 0;
    _threeMatrix4 = new Matrix4();
    constructor (
        center?: Cartesian3,
        axisAlignedBoundingBox?: AxisAlignedBoundingBox,
        minimumHeight?: number,
        maximumHeight?: number,
        fromENU?: CesiumMatrix4,
        hasVertexNormals?: boolean,
        hasWebMercatorT = false,
        hasGeodeticSurfaceNormals = false,
        exaggeration = 1.0,
        exaggerationRelativeHeight = 0.0
    ) {
        let quantization = TerrainQuantization.NONE;
        let toENU;
        let matrix;

        if (
            defined(axisAlignedBoundingBox) &&
            defined(minimumHeight) &&
            defined(maximumHeight) &&
            defined(fromENU)
        ) {
            const minimum = (axisAlignedBoundingBox as AxisAlignedBoundingBox).minimum;
            const maximum = (axisAlignedBoundingBox as AxisAlignedBoundingBox).maximum;

            const dimensions = Cartesian3.subtract(
                maximum,
                minimum,
                cartesian3DimScratch
            );
            const hDim = (maximumHeight as number) - (minimumHeight as number);
            const maxDim = Math.max(Cartesian3.maximumComponent(dimensions), hDim);

            if (maxDim < SHIFT_LEFT_12 - 1.0) {
                quantization = TerrainQuantization.BITS12;
            } else {
                quantization = TerrainQuantization.NONE;
            }

            toENU = CesiumMatrix4.inverseTransformation((fromENU as CesiumMatrix4), new CesiumMatrix4());

            const translation = Cartesian3.negate(minimum, cartesian3Scratch);
            CesiumMatrix4.multiply(
                CesiumMatrix4.fromTranslation(translation, matrix4Scratch),
                toENU,
                toENU
            );

            const scale = cartesian3Scratch;
            scale.x = 1.0 / dimensions.x;
            scale.y = 1.0 / dimensions.y;
            scale.z = 1.0 / dimensions.z;
            CesiumMatrix4.multiply(CesiumMatrix4.fromScale(scale, matrix4Scratch), toENU, toENU);

            matrix = CesiumMatrix4.clone((fromENU as CesiumMatrix4));
            CesiumMatrix4.setTranslation(matrix, Cartesian3.ZERO, matrix);

            fromENU = CesiumMatrix4.clone((fromENU as CesiumMatrix4), new CesiumMatrix4()) as CesiumMatrix4;

            const translationMatrix = CesiumMatrix4.fromTranslation(minimum, matrix4Scratch);
            const scaleMatrix = CesiumMatrix4.fromScale(dimensions, matrix4Scratch2);
            const st = CesiumMatrix4.multiply(translationMatrix, scaleMatrix, matrix4Scratch);

            CesiumMatrix4.multiply(fromENU, st, fromENU);
            CesiumMatrix4.multiply(matrix, st, matrix);
        }

        /**
         * How the vertices of the mesh were compressed.
         * @type {TerrainQuantization}
         */
        this.quantization = quantization;

        /**
         * The minimum height of the tile including the skirts.
         * @type {Number}
         */
        this.minimumHeight = minimumHeight;

        /**
         * The maximum height of the tile.
         * @type {Number}
         */
        this.maximumHeight = maximumHeight;

        /**
         * The center of the tile.
         * @type {Cartesian3}
         */
        this.center = Cartesian3.clone(center) as Cartesian3;

        /**
         * A matrix that takes a vertex from the tile, transforms it to east-north-up at the center and scales
         * it so each component is in the [0, 1] range.
         * @type {Matrix4}
         */
        this.toScaledENU = toENU as CesiumMatrix4;

        /**
         * A matrix that restores a vertex transformed with toScaledENU back to the earth fixed reference frame
         * @type {Matrix4}
         */
        this.fromScaledENU = fromENU;

        /**
         * The matrix used to decompress the terrain vertices in the shader for RTE rendering.
         * @type {Matrix4}
         */
        this.matrix = matrix;

        /**
         * The terrain mesh contains normals.
         * @type {Boolean}
         */
        this.hasVertexNormals = hasVertexNormals as boolean;

        /**
         * The terrain mesh contains a vertical texture coordinate following the Web Mercator projection.
         * @type {Boolean}
         */
        this.hasWebMercatorT = defaultValue(hasWebMercatorT, false);

        /**
         * The terrain mesh contains geodetic surface normals, used for terrain exaggeration.
         * @type {Boolean}
         */
        this.hasGeodeticSurfaceNormals = defaultValue(
            hasGeodeticSurfaceNormals,
            false
        );

        /**
         * A scalar used to exaggerate terrain.
         * @type {Number}
         */
        this.exaggeration = defaultValue(exaggeration, 1.0);

        /**
         * The relative height from which terrain is exaggerated.
         */
        this.exaggerationRelativeHeight = defaultValue(
            exaggerationRelativeHeight,
            0.0
        );

        this._offsetGeodeticSurfaceNormal = 0;
        this._offsetVertexNormal = 0;

        // Calculate the stride and offsets declared above
        this._calculateStrideAndOffsets();
    }

    get threeMatrix4 (): Matrix4 {
        if (!defined(this.matrix)) {
            return this._threeMatrix4;
        }
        return CesiumMatrix4.transformToThreeMatrix4(this.matrix, this._threeMatrix4);
    }

    encode (
        vertexBuffer: any,
        bufferIndex: any,
        position: any,
        uv: any,
        height: any,
        normalToPack: any,
        webMercatorT: any,
        geodeticSurfaceNormal: any
    ) {
        const u = uv.x;
        const v = uv.y;

        if (this.quantization === TerrainQuantization.BITS12) {
            position = CesiumMatrix4.multiplyByPoint(
               this.toScaledENU as CesiumMatrix4,
               position,
               cartesian3Scratch
            );

            position.x = CesiumMath.clamp(position.x, 0.0, 1.0);
            position.y = CesiumMath.clamp(position.y, 0.0, 1.0);
            position.z = CesiumMath.clamp(position.z, 0.0, 1.0);

            const hDim = this.maximumHeight as number - (this.minimumHeight as number);
            const h = CesiumMath.clamp((height - (this.minimumHeight as number)) / hDim, 0.0, 1.0);

            Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
            const compressed0 = AttributeCompression.compressTextureCoordinates(
                cartesian2Scratch
            );

            Cartesian2.fromElements(position.z, h, cartesian2Scratch);
            const compressed1 = AttributeCompression.compressTextureCoordinates(
                cartesian2Scratch
            );

            Cartesian2.fromElements(u, v, cartesian2Scratch);
            const compressed2 = AttributeCompression.compressTextureCoordinates(
                cartesian2Scratch
            );

            vertexBuffer[bufferIndex++] = compressed0;
            vertexBuffer[bufferIndex++] = compressed1;
            vertexBuffer[bufferIndex++] = compressed2;

            if (this.hasWebMercatorT) {
                Cartesian2.fromElements(webMercatorT, 0.0, cartesian2Scratch);
                const compressed3 = AttributeCompression.compressTextureCoordinates(
                    cartesian2Scratch
                );
                vertexBuffer[bufferIndex++] = compressed3;
            }
        } else {
            Cartesian3.subtract(position, (this.center as Cartesian3), cartesian3Scratch);

            vertexBuffer[bufferIndex++] = cartesian3Scratch.x;
            vertexBuffer[bufferIndex++] = cartesian3Scratch.y;
            vertexBuffer[bufferIndex++] = cartesian3Scratch.z;
            vertexBuffer[bufferIndex++] = height;
            vertexBuffer[bufferIndex++] = u;
            vertexBuffer[bufferIndex++] = v;

            if (this.hasWebMercatorT) {
                vertexBuffer[bufferIndex++] = webMercatorT;
            }
        }

        if (this.hasVertexNormals) {
            vertexBuffer[bufferIndex++] = AttributeCompression.octPackFloat(
                normalToPack
            );
        }

        if (this.hasGeodeticSurfaceNormals) {
            vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.x;
            vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.y;
            vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.z;
        }

        return bufferIndex;
    }

    addGeodeticSurfaceNormals (
        oldBuffer: any,
        newBuffer: any,
        ellipsoid: Ellipsoid
    ) {
        if (this.hasGeodeticSurfaceNormals) {
            return;
        }

        const oldStride = this.stride;
        const vertexCount = oldBuffer.length / oldStride;
        this.hasGeodeticSurfaceNormals = true;
        this._calculateStrideAndOffsets();
        const newStride = this.stride;

        for (let index = 0; index < vertexCount; index++) {
            for (let offset = 0; offset < oldStride; offset++) {
                const oldIndex = index * oldStride + offset;
                const newIndex = index * newStride + offset;
                newBuffer[newIndex] = oldBuffer[oldIndex];
            }
            const position = this.decodePosition(newBuffer, index, scratchPosition);
            const geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
                position,
                scratchGeodeticSurfaceNormal
            ) as Cartesian3;

            const bufferIndex = index * newStride + this._offsetGeodeticSurfaceNormal;
            newBuffer[bufferIndex] = geodeticSurfaceNormal.x;
            newBuffer[bufferIndex + 1] = geodeticSurfaceNormal.y;
            newBuffer[bufferIndex + 2] = geodeticSurfaceNormal.z;
        }
    }

    removeGeodeticSurfaceNormals (
        oldBuffer: any,
        newBuffer: any
    ) {
        if (!this.hasGeodeticSurfaceNormals) {
            return;
        }

        const oldStride = this.stride;
        const vertexCount = oldBuffer.length / oldStride;
        this.hasGeodeticSurfaceNormals = false;
        this._calculateStrideAndOffsets();
        const newStride = this.stride;

        for (let index = 0; index < vertexCount; index++) {
            for (let offset = 0; offset < newStride; offset++) {
                const oldIndex = index * oldStride + offset;
                const newIndex = index * newStride + offset;
                newBuffer[newIndex] = oldBuffer[oldIndex];
            }
        }
    }

    decodePosition (buffer: ArrayBuffer, index: number, result: Cartesian3): Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        index *= this.stride;

        if (this.quantization === TerrainQuantization.BITS12) {
            const xy = AttributeCompression.decompressTextureCoordinates(
                buffer[index],
                cartesian2Scratch
            );
            result.x = xy.x;
            result.y = xy.y;

            const zh = AttributeCompression.decompressTextureCoordinates(
                buffer[index + 1],
                cartesian2Scratch
            );
            result.z = zh.x;

            return CesiumMatrix4.multiplyByPoint((this.fromScaledENU as CesiumMatrix4), result, result);
        }

        result.x = buffer[index];
        result.y = buffer[index + 1];
        result.z = buffer[index + 2];
        return Cartesian3.add(result, (this.center as Cartesian3), result);
    }

    getExaggeratedPosition (
        buffer:ArrayBuffer,
        index: number,
        result: Cartesian3
    ): Cartesian3 {
        result = this.decodePosition(buffer, index, result);

        const exaggeration = this.exaggeration;
        const exaggerationRelativeHeight = this.exaggerationRelativeHeight;
        const hasExaggeration = exaggeration !== 1.0;
        if (hasExaggeration && this.hasGeodeticSurfaceNormals) {
            const geodeticSurfaceNormal = this.decodeGeodeticSurfaceNormal(
                buffer,
                index,
                scratchGeodeticSurfaceNormal
            );
            const rawHeight = this.decodeHeight(buffer, index);
            const heightDifference =
      TerrainExaggeration.getHeight(
          rawHeight,
          exaggeration,
          exaggerationRelativeHeight
      ) - rawHeight;

            // some math is unrolled for better performance
            result.x += geodeticSurfaceNormal.x * heightDifference;
            result.y += geodeticSurfaceNormal.y * heightDifference;
            result.z += geodeticSurfaceNormal.z * heightDifference;
        }

        return result;
    }

    decodeTextureCoordinates (
        buffer: any,
        index: any,
        result: any
    ) {
        if (!defined(result)) {
            result = new Cartesian2();
        }

        index *= this.stride;

        if (this.quantization === TerrainQuantization.BITS12) {
            return AttributeCompression.decompressTextureCoordinates(
                buffer[index + 2],
                result
            );
        }

        return Cartesian2.fromElements(buffer[index + 4], buffer[index + 5], result);
    }

    decodeHeight (buffer: any, index: any) {
        index *= this.stride;

        if (this.quantization === TerrainQuantization.BITS12) {
            const zh = AttributeCompression.decompressTextureCoordinates(
                buffer[index + 1],
                cartesian2Scratch
            );
            return (
                zh.y * ((this.maximumHeight as number) - (this.minimumHeight as number)) + (this.minimumHeight as number)
            );
        }

        return buffer[index + 3];
    }

    decodeWebMercatorT (buffer: any, index: any) {
        index *= this.stride;

        if (this.quantization === TerrainQuantization.BITS12) {
            return AttributeCompression.decompressTextureCoordinates(
                buffer[index + 3],
                cartesian2Scratch
            ).x;
        }

        return buffer[index + 6];
    }

    getOctEncodedNormal (
        buffer: any,
        index: any,
        result: any
    ) {
        index = index * this.stride + this._offsetVertexNormal;

        const temp = buffer[index] / 256.0;
        const x = Math.floor(temp);
        const y = (temp - x) * 256.0;

        return Cartesian2.fromElements(x, y, result);
    }

    decodeGeodeticSurfaceNormal (
        buffer: any,
        index: any,
        result: any
    ) {
        index = index * this.stride + this._offsetGeodeticSurfaceNormal;

        result.x = buffer[index];
        result.y = buffer[index + 1];
        result.z = buffer[index + 2];
        return result;
    }

    _calculateStrideAndOffsets (): void {
        let vertexStride = 0;

        switch (this.quantization) {
        case TerrainQuantization.BITS12:
            vertexStride += 3;
            break;
        default:
            vertexStride += 6;
        }
        if (this.hasWebMercatorT) {
            vertexStride += 1;
        }
        if (this.hasVertexNormals) {
            this._offsetVertexNormal = vertexStride;
            vertexStride += 1;
        }
        if (this.hasGeodeticSurfaceNormals) {
            this._offsetGeodeticSurfaceNormal = vertexStride;
            vertexStride += 3;
        }

        this.stride = vertexStride;
    }

    getAttributes (buffer: any) {
        const datatype = ComponentDatatype.FLOAT;
        const sizeInBytes = ComponentDatatype.getSizeInBytes(datatype);
        const strideInBytes = this.stride * sizeInBytes;
        let offsetInBytes = 0;

        const attributes: any = [];
        function addAttribute (index: any, componentsPerAttribute: any) {
            attributes.push({
                index: index,
                vertexBuffer: buffer,
                componentDatatype: datatype,
                componentsPerAttribute: componentsPerAttribute,
                offsetInBytes: offsetInBytes,
                strideInBytes: strideInBytes
            });
            offsetInBytes += componentsPerAttribute * sizeInBytes;
        }

        if (this.quantization === TerrainQuantization.NONE) {
            addAttribute(attributesIndicesNone.position3DAndHeight, 4);

            let componentsTexCoordAndNormals = 2;
            componentsTexCoordAndNormals += this.hasWebMercatorT ? 1 : 0;
            componentsTexCoordAndNormals += this.hasVertexNormals ? 1 : 0;
            addAttribute(
                attributesIndicesNone.textureCoordAndEncodedNormals,
                componentsTexCoordAndNormals
            );

            if (this.hasGeodeticSurfaceNormals) {
                addAttribute(attributesIndicesNone.geodeticSurfaceNormal, 3);
            }
        } else {
            // When there is no webMercatorT or vertex normals, the attribute only needs 3 components: x/y, z/h, u/v.
            // WebMercatorT and vertex normals each take up one component, so if only one of them is present the first
            // attribute gets a 4th component. If both are present, we need an additional attribute that has 1 component.
            const usingAttribute0Component4 =
          this.hasWebMercatorT || this.hasVertexNormals;
            const usingAttribute1Component1 =
          this.hasWebMercatorT && this.hasVertexNormals;
            addAttribute(
                attributesIndicesBits12.compressed0,
                usingAttribute0Component4 ? 4 : 3
            );

            if (usingAttribute1Component1) {
                addAttribute(attributesIndicesBits12.compressed1, 1);
            }

            if (this.hasGeodeticSurfaceNormals) {
                addAttribute(attributesIndicesBits12.geodeticSurfaceNormal, 3);
            }
        }

        return attributes;
    }

    getAttributeLocations () {
        if (this.quantization === TerrainQuantization.NONE) {
            return attributesIndicesNone;
        }
        return attributesIndicesBits12;
    }

    static clone (encoding: any, result = new TerrainEncoding()): TerrainEncoding | undefined {
        if (!defined(encoding)) {
            return undefined;
        }

        result.quantization = encoding.quantization;
        result.minimumHeight = encoding.minimumHeight;
        result.maximumHeight = encoding.maximumHeight;
        result.center = Cartesian3.clone(encoding.center);
        result.toScaledENU = CesiumMatrix4.clone(encoding.toScaledENU);
        result.fromScaledENU = CesiumMatrix4.clone(encoding.fromScaledENU);
        result.matrix = CesiumMatrix4.clone(encoding.matrix);
        result.hasVertexNormals = encoding.hasVertexNormals;
        result.hasWebMercatorT = encoding.hasWebMercatorT;
        result.hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;
        result.exaggeration = encoding.exaggeration;
        result.exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;

        result._calculateStrideAndOffsets();

        return result;
    }
}

export { TerrainEncoding };
