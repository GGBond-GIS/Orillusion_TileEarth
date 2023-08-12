/**
 * A plane in Hessian Normal Form defined by
 * <pre>
 * ax + by + cz + d = 0
 * </pre>
 * where (a, b, c) is the plane's <code>normal</code>, d is the signed
 * <code>distance</code> to the plane, and (x, y, z) is any point on
 * the plane.
 *
 * @alias Plane
 * @constructor
 *
 * @param {Cartesian3} normal The plane's normal (normalized).
 * @param {Number} distance The shortest distance from the origin to the plane.  The sign of
 * <code>distance</code> determines which side of the plane the origin
 * is on.  If <code>distance</code> is positive, the origin is in the half-space
 * in the direction of the normal; if negative, the origin is in the half-space
 * opposite to the normal; if zero, the plane passes through the origin.
 *
 * @example
 * // The plane x=0
 * var plane = new Cesium.Plane(Cesium.Cartesian3.UNIT_X, 0.0);
 *
 * @exception {DeveloperError} Normal must be normalized
 */

import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { CesiumMath } from './CesiumMath';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

const scratchCartesian = new Cartesian3();

const scratchNormal = new Cartesian3();
class Plane {
    normal: Cartesian3;
    distance: number;
    constructor (normal: Cartesian3, distance: number) {
        if (!CesiumMath.equalsEpsilon(Cartesian3.magnitude(normal), 1.0, CesiumMath.EPSILON6)) {
            throw new DeveloperError('normal must be normalized.');
        }

        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        this.normal = Cartesian3.clone(normal) as Cartesian3;

        /**
         * The shortest distance from the origin to the plane.  The sign of
         * <code>distance</code> determines which side of the plane the origin
         * is on.  If <code>distance</code> is positive, the origin is in the half-space
         * in the direction of the normal; if negative, the origin is in the half-space
         * opposite to the normal; if zero, the plane passes through the origin.
         *
         * @type {Number}
         */
        this.distance = distance;
    }

    /**
     * Computes the signed shortest distance of a point to a plane.
     * The sign of the distance determines which side of the plane the point
     * is on.  If the distance is positive, the point is in the half-space
     * in the direction of the normal; if negative, the point is in the half-space
     * opposite to the normal; if zero, the plane passes through the point.
     *
     * @param {Plane} plane The plane.
     * @param {Cartesian3} point The point.
     * @returns {Number} The signed shortest distance of the point to the plane.
     */
    static getPointDistance (plane: Plane, point: Cartesian3): number {
        return Cartesian3.dot(plane.normal, point) + plane.distance;
    }

    /**
     * Creates a plane from a normal and a point on the plane.
     *
     * @param {Cartesian3} point The point on the plane.
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @example
     * var point = Cesium.Cartesian3.fromDegrees(-72.0, 40.0);
     * var normal = ellipsoid.geodeticSurfaceNormal(point);
     * var tangentPlane = Cesium.Plane.fromPointNormal(point, normal);
     *
     * @exception {DeveloperError} Normal must be normalized
     */
    static fromPointNormal (point: Cartesian3, normal: Cartesian3, result?: Plane): Plane {
        if (!CesiumMath.equalsEpsilon(Cartesian3.magnitude(normal), 1.0, CesiumMath.EPSILON6)) {
            throw new DeveloperError('normal must be normalized.');
        }
        // >>includeEnd('debug');

        const distance = -Cartesian3.dot(normal, point);

        if (!defined(result)) {
            return new Plane(normal, distance);
        }

        Cartesian3.clone(normal, (result as Plane).normal);
        (result as Plane).distance = distance;
        return (result as Plane);
    }

    /**
     * Projects a point onto the plane.
     * @param {Plane} plane The plane to project the point onto
     * @param {Cartesian3} point The point to project onto the plane
     * @param {Cartesian3} [result] The result point.  If undefined, a new Cartesian3 will be created.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    static projectPointOntoPlane (plane: Plane, point: Cartesian3, result?:Cartesian3): Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        // projectedPoint = point - (normal.point + scale) * normal
        const pointDistance = Plane.getPointDistance(plane, point);
        const scaledNormal = Cartesian3.multiplyByScalar(
            plane.normal,
            pointDistance,
            scratchCartesian
        );

        return Cartesian3.subtract(point, scaledNormal, (result as Cartesian3));
    }

    /**
     * Creates a plane from the general equation
     *
     * @param {Cartesian4} coefficients The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @exception {DeveloperError} Normal must be normalized
     */
    static fromCartesian4 (coefficients:Cartesian4, result?: Plane): Plane {
        const normal = Cartesian3.fromCartesian4(coefficients, scratchNormal) as Cartesian3;
        const distance = coefficients.w;

        // >>includeStart('debug', pragmas.debug);
        if (
            !CesiumMath.equalsEpsilon(
                Cartesian3.magnitude(normal),
                1.0,
                CesiumMath.EPSILON6
            )
        ) {
            throw new DeveloperError('normal must be normalized.');
        }
        // >>includeEnd('debug');

        if (!defined(result)) {
            return new Plane(normal, distance);
        }
        Cartesian3.clone(normal, (result as Plane).normal);
        (result as Plane).distance = distance;
        return (result as Plane);
    }
}

export { Plane };
