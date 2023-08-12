import arrayFill from './arrayFill';
import { Cartesian3 } from './Cartesian3';
import { CesiumMath } from './CesiumMath';
import { ComponentDatatype } from './ComponentDatatype';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Ellipsoid } from './Ellipsoid';
import { IndexDatatype } from './IndexDatatype';

const scratchPosition = new Cartesian3();
const scratchNormal = new Cartesian3();
const scratchTangent = new Cartesian3();
const scratchBitangent = new Cartesian3();
const scratchNormalST = new Cartesian3();
const defaultRadii = new Cartesian3(1.0, 1.0, 1.0);

const cos = Math.cos;
const sin = Math.sin;

class EllipsoidGeometry {
    _radii: Cartesian3;
    _innerRadii: Cartesian3;
    _minimumClock: number;
    _maximumClock: number;
    _minimumCone: number;
    _maximumCone: number;
    _stackPartitions: number;
    _slicePartitions: number;
    constructor (options: any) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        const radii = defaultValue(options.radii, defaultRadii);
        const innerRadii = defaultValue(options.innerRadii, radii);
        const minimumClock = defaultValue(options.minimumClock, 0.0);
        const maximumClock = defaultValue(options.maximumClock, CesiumMath.TWO_PI);
        const minimumCone = defaultValue(options.minimumCone, 0.0);
        const maximumCone = defaultValue(options.maximumCone, CesiumMath.PI);
        const stackPartitions = Math.round(defaultValue(options.stackPartitions, 64));
        const slicePartitions = Math.round(defaultValue(options.slicePartitions, 64));
        // const vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        this._radii = Cartesian3.clone(radii);
        this._innerRadii = Cartesian3.clone(innerRadii);
        this._minimumClock = minimumClock;
        this._maximumClock = maximumClock;
        this._minimumCone = minimumCone;
        this._maximumCone = maximumCone;
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        // this._vertexFormat = VertexFormat.clone(vertexFormat);
        // this._offsetAttribute = options.offsetAttribute;
        // this._workerName = 'createEllipsoidGeometry';
    }

    static createGeometry (ellipsoidGeometry: EllipsoidGeometry): any {
        const radii = ellipsoidGeometry._radii;
        if (radii.x <= 0 || radii.y <= 0 || radii.z <= 0) {
            return;
        }

        const innerRadii = ellipsoidGeometry._innerRadii;
        if (innerRadii.x <= 0 || innerRadii.y <= 0 || innerRadii.z <= 0) {
            return;
        }

        const minimumClock = ellipsoidGeometry._minimumClock;
        const maximumClock = ellipsoidGeometry._maximumClock;
        const minimumCone = ellipsoidGeometry._minimumCone;
        const maximumCone = ellipsoidGeometry._maximumCone;
        // const vertexFormat = ellipsoidGeometry._vertexFormat;
        const vertexFormat = {
            bitangent: false,
            color: false,
            normal: false,
            position: true,
            st: false,
            tangent: false
        };

        // Add an extra slice and stack so that the number of partitions is the
        // number of surfaces rather than the number of joints
        let slicePartitions = ellipsoidGeometry._slicePartitions + 1;
        let stackPartitions = ellipsoidGeometry._stackPartitions + 1;

        slicePartitions = Math.round(
            (slicePartitions * Math.abs(maximumClock - minimumClock)) /
            CesiumMath.TWO_PI
        );
        stackPartitions = Math.round(
            (stackPartitions * Math.abs(maximumCone - minimumCone)) / CesiumMath.PI
        );

        if (slicePartitions < 2) {
            slicePartitions = 2;
        }
        if (stackPartitions < 2) {
            stackPartitions = 2;
        }

        let i;
        let j;
        let index = 0;

        // Create arrays for theta and phi. Duplicate first and last angle to
        // allow different normals at the intersections.
        const phis = [minimumCone];
        const thetas = [minimumClock];
        for (i = 0; i < stackPartitions; i++) {
            phis.push(
                minimumCone + (i * (maximumCone - minimumCone)) / (stackPartitions - 1)
            );
        }
        phis.push(maximumCone);
        for (j = 0; j < slicePartitions; j++) {
            thetas.push(
                minimumClock + (j * (maximumClock - minimumClock)) / (slicePartitions - 1)
            );
        }
        thetas.push(maximumClock);
        const numPhis = phis.length;
        const numThetas = thetas.length;

        // Allow for extra indices if there is an inner surface and if we need
        // to close the sides if the clock range is not a full circle
        let extraIndices = 0;
        let vertexMultiplier = 1.0;
        const hasInnerSurface =
          innerRadii.x !== radii.x ||
          innerRadii.y !== radii.y ||
          innerRadii.z !== radii.z;
        let isTopOpen = false;
        let isBotOpen = false;
        let isClockOpen = false;
        if (hasInnerSurface) {
            vertexMultiplier = 2.0;
            if (minimumCone > 0.0) {
                isTopOpen = true;
                extraIndices += slicePartitions - 1;
            }
            if (maximumCone < Math.PI) {
                isBotOpen = true;
                extraIndices += slicePartitions - 1;
            }
            if ((maximumClock - minimumClock) % CesiumMath.TWO_PI) {
                isClockOpen = true;
                extraIndices += (stackPartitions - 1) * 2 + 1;
            } else {
                extraIndices += 1;
            }
        }

        const vertexCount = numThetas * numPhis * vertexMultiplier;
        const positions = new Float64Array(vertexCount * 3);
        const isInner = arrayFill(new Array(vertexCount), false);
        const negateNormal = arrayFill(new Array(vertexCount), false);

        // Multiply by 6 because there are two triangles per sector
        const indexCount = slicePartitions * stackPartitions * vertexMultiplier;
        const numIndices =
          6 *
          (indexCount +
            extraIndices +
            1 -
            (slicePartitions + stackPartitions) * vertexMultiplier);
        const indices = [];

        const normals = vertexFormat.normal
            ? new Float32Array(vertexCount * 3)
            : undefined;
        const tangents = vertexFormat.tangent
            ? new Float32Array(vertexCount * 3)
            : undefined;
        const bitangents = vertexFormat.bitangent
            ? new Float32Array(vertexCount * 3)
            : undefined;
        const st = vertexFormat.st ? new Float32Array(vertexCount * 2) : undefined;

        // Calculate sin/cos phi
        const sinPhi = new Array(numPhis);
        const cosPhi = new Array(numPhis);
        for (i = 0; i < numPhis; i++) {
            sinPhi[i] = sin(phis[i]);
            cosPhi[i] = cos(phis[i]);
        }

        // Calculate sin/cos theta
        const sinTheta = new Array(numThetas);
        const cosTheta = new Array(numThetas);
        for (j = 0; j < numThetas; j++) {
            cosTheta[j] = cos(thetas[j]);
            sinTheta[j] = sin(thetas[j]);
        }

        // Create outer surface
        for (i = 0; i < numPhis; i++) {
            for (j = 0; j < numThetas; j++) {
                positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
                positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
                positions[index++] = radii.z * cosPhi[i];
            }
        }

        // Create inner surface
        let vertexIndex = vertexCount / 2.0;
        if (hasInnerSurface) {
            for (i = 0; i < numPhis; i++) {
                for (j = 0; j < numThetas; j++) {
                    positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
                    positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
                    positions[index++] = innerRadii.z * cosPhi[i];

                    // Keep track of which vertices are the inner and which ones
                    // need the normal to be negated
                    isInner[vertexIndex] = true;
                    if (i > 0 && i !== numPhis - 1 && j !== 0 && j !== numThetas - 1) {
                        negateNormal[vertexIndex] = true;
                    }
                    vertexIndex++;
                }
            }
        }

        // Create indices for outer surface
        index = 0;
        let topOffset;
        let bottomOffset;
        for (i = 1; i < numPhis - 2; i++) {
            topOffset = i * numThetas;
            bottomOffset = (i + 1) * numThetas;

            for (j = 1; j < numThetas - 2; j++) {
                indices[index++] = bottomOffset + j;
                indices[index++] = bottomOffset + j + 1;
                indices[index++] = topOffset + j + 1;

                indices[index++] = bottomOffset + j;
                indices[index++] = topOffset + j + 1;
                indices[index++] = topOffset + j;
            }
        }

        // Create indices for inner surface
        if (hasInnerSurface) {
            const offset = numPhis * numThetas;
            for (i = 1; i < numPhis - 2; i++) {
                topOffset = offset + i * numThetas;
                bottomOffset = offset + (i + 1) * numThetas;

                for (j = 1; j < numThetas - 2; j++) {
                    indices[index++] = bottomOffset + j;
                    indices[index++] = topOffset + j;
                    indices[index++] = topOffset + j + 1;

                    indices[index++] = bottomOffset + j;
                    indices[index++] = topOffset + j + 1;
                    indices[index++] = bottomOffset + j + 1;
                }
            }
        }

        let outerOffset;
        let innerOffset;
        if (hasInnerSurface) {
            if (isTopOpen) {
            // Connect the top of the inner surface to the top of the outer surface
                innerOffset = numPhis * numThetas;
                for (i = 1; i < numThetas - 2; i++) {
                    indices[index++] = i;
                    indices[index++] = i + 1;
                    indices[index++] = innerOffset + i + 1;

                    indices[index++] = i;
                    indices[index++] = innerOffset + i + 1;
                    indices[index++] = innerOffset + i;
                }
            }

            if (isBotOpen) {
            // Connect the bottom of the inner surface to the bottom of the outer surface
                outerOffset = numPhis * numThetas - numThetas;
                innerOffset = numPhis * numThetas * vertexMultiplier - numThetas;
                for (i = 1; i < numThetas - 2; i++) {
                    indices[index++] = outerOffset + i + 1;
                    indices[index++] = outerOffset + i;
                    indices[index++] = innerOffset + i;

                    indices[index++] = outerOffset + i + 1;
                    indices[index++] = innerOffset + i;
                    indices[index++] = innerOffset + i + 1;
                }
            }
        }

        // Connect the edges if clock is not closed
        if (isClockOpen) {
            for (i = 1; i < numPhis - 2; i++) {
                innerOffset = numThetas * numPhis + numThetas * i;
                outerOffset = numThetas * i;
                indices[index++] = innerOffset;
                indices[index++] = outerOffset + numThetas;
                indices[index++] = outerOffset;

                indices[index++] = innerOffset;
                indices[index++] = innerOffset + numThetas;
                indices[index++] = outerOffset + numThetas;
            }

            for (i = 1; i < numPhis - 2; i++) {
                innerOffset = numThetas * numPhis + numThetas * (i + 1) - 1;
                outerOffset = numThetas * (i + 1) - 1;
                indices[index++] = outerOffset + numThetas;
                indices[index++] = innerOffset;
                indices[index++] = outerOffset;

                indices[index++] = outerOffset + numThetas;
                indices[index++] = innerOffset + numThetas;
                indices[index++] = innerOffset;
            }
        }

        const attributes: any = {};

        if (vertexFormat.position) {
            attributes.position = {
                componentDatatype: ComponentDatatype.DOUBLE,
                componentsPerAttribute: 3,
                values: positions
            };
        }

        const stIndex = 0;
        const normalIndex = 0;
        const tangentIndex = 0;
        const bitangentIndex = 0;
        const vertexCountHalf = vertexCount / 2.0;

        let ellipsoid;
        const ellipsoidOuter = Ellipsoid.fromCartesian3(radii);
        const ellipsoidInner = Ellipsoid.fromCartesian3(innerRadii);

        // if (defined(ellipsoidGeometry._offsetAttribute)) {
        //     const length = positions.length;
        //     const applyOffset = new Uint8Array(length / 3);
        //     const offsetValue =
        //     ellipsoidGeometry._offsetAttribute === GeometryOffsetAttribute.NONE
        //         ? 0
        //         : 1;
        //     arrayFill(applyOffset, offsetValue);
        //     attributes.applyOffset = new GeometryAttribute({
        //         componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        //         componentsPerAttribute: 1,
        //         values: applyOffset
        //     });
        // }

        // return new Geometry({
        //     attributes: attributes,
        //     indices: indices,
        //     primitiveType: PrimitiveType.TRIANGLES,
        //     boundingSphere: BoundingSphere.fromEllipsoid(ellipsoidOuter),
        //     offsetAttribute: ellipsoidGeometry._offsetAttribute
        // });
        return {
            attributes,
            indices
        };
    }
}

export { EllipsoidGeometry };
