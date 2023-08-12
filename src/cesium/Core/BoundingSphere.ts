/* eslint-disable max-lines */
import { defaultValue } from './defaultValue';
import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { defined } from './defined';
import { GeographicProjection } from './GeographicProjection';
import { Intersect } from './Intersect';
import { Plane } from './Plane';
import { Rectangle } from './Rectangle';
import { CesiumMatrix3 as Matrix3 } from './CesiumMatrix3';
import { OrientedBoundingBox } from './OrientedBoundingBox';

const fromOrientedBoundingBoxScratchU = new Cartesian3();
const fromOrientedBoundingBoxScratchV = new Cartesian3();
const fromOrientedBoundingBoxScratchW = new Cartesian3();

const fromPointsXMin = new Cartesian3();
const fromPointsYMin = new Cartesian3();
const fromPointsZMin = new Cartesian3();
const fromPointsXMax = new Cartesian3();
const fromPointsYMax = new Cartesian3();
const fromPointsZMax = new Cartesian3();
const fromPointsCurrentPos = new Cartesian3();
const fromPointsScratch = new Cartesian3();
const fromPointsRitterCenter = new Cartesian3();
const fromPointsMinBoxPt = new Cartesian3();
const fromPointsMaxBoxPt = new Cartesian3();
const fromPointsNaiveCenterScratch = new Cartesian3();
const volumeConstant = 4.0 / 3.0 * CesiumMath.PI;

const defaultProjection = new GeographicProjection();
const fromRectangle2DLowerLeft = new Cartesian3();
const fromRectangle2DUpperRight = new Cartesian3();
const fromRectangle2DSouthwest = new Cartographic();
const fromRectangle2DNortheast = new Cartographic();

const unionScratch = new Cartesian3();
const unionScratchCenter = new Cartesian3();
const distanceSquaredToScratch = new Cartesian3();

/**
     * A bounding sphere with a center and a radius.
     * @alias BoundingSphere
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
     * @param {Number} [radius=0.0] The radius of the bounding sphere.
     *
     * @see AxisAlignedBoundingBox
     * @see BoundingRectangle
     * @see Packable
     */
class BoundingSphere {
    center: Cartesian3;
    radius: number;
    constructor (center = Cartesian3.ZERO, radius = 0.0) {
        /**
         * The center point of the sphere.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));

        /**
                  * The radius of the sphere.
                  * @type {Number}
                  * @default 0.0
                  */
        this.radius = defaultValue(radius, 0.0);
    }

    /**
     * Duplicates a BoundingSphere instance.
     *
     * @param {BoundingSphere} sphere The bounding sphere to duplicate.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided. (Returns undefined if sphere is undefined)
     */
    static clone (sphere: BoundingSphere, result?: BoundingSphere):BoundingSphere | undefined {
        if (!defined(sphere)) {
            return undefined;
        }

        if (!defined(result)) {
            return new BoundingSphere(sphere.center, sphere.radius);
        }

        (result as BoundingSphere).center = Cartesian3.clone(sphere.center, (result as BoundingSphere).center);
        (result as BoundingSphere).radius = sphere.radius;
        return result;
    }

    /**
     * Computes a tight-fitting bounding sphere enclosing the provided oriented bounding box.
     *
     * @param {OrientedBoundingBox} orientedBoundingBox The oriented bounding box.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    static fromOrientedBoundingBox (orientedBoundingBox:OrientedBoundingBox, result = new BoundingSphere()):BoundingSphere {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        const halfAxes = orientedBoundingBox.halfAxes;
        const u = Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
        const v = Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
        const w = Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);

        Cartesian3.add(u, v, u);
        Cartesian3.add(u, w, u);

        result.center = Cartesian3.clone(orientedBoundingBox.center, result.center);
        result.radius = Cartesian3.magnitude(u);

        return result;
    }

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and
     * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
     *
     * @param {Cartesian3[]} [positions] An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
     *
     * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
     */
    static fromPoints (positions?:Cartesian3[], result = new BoundingSphere()):BoundingSphere {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(positions) || (positions as Cartesian3[]).length === 0) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        const currentPos = Cartesian3.clone((positions as Cartesian3[])[0], fromPointsCurrentPos);

        const xMin = Cartesian3.clone(currentPos, fromPointsXMin);
        const yMin = Cartesian3.clone(currentPos, fromPointsYMin);
        const zMin = Cartesian3.clone(currentPos, fromPointsZMin);

        const xMax = Cartesian3.clone(currentPos, fromPointsXMax);
        const yMax = Cartesian3.clone(currentPos, fromPointsYMax);
        const zMax = Cartesian3.clone(currentPos, fromPointsZMax);

        const numPositions = (positions as Cartesian3[]).length;
        let i;
        for (i = 1; i < numPositions; i++) {
            Cartesian3.clone((positions as Cartesian3[])[i], currentPos);

            const x = currentPos.x;
            const y = currentPos.y;
            const z = currentPos.z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                Cartesian3.clone(currentPos, xMin);
            }

            if (x > xMax.x) {
                Cartesian3.clone(currentPos, xMax);
            }

            if (y < yMin.y) {
                Cartesian3.clone(currentPos, yMin);
            }

            if (y > yMax.y) {
                Cartesian3.clone(currentPos, yMax);
            }

            if (z < zMin.z) {
                Cartesian3.clone(currentPos, zMin);
            }

            if (z > zMax.z) {
                Cartesian3.clone(currentPos, zMax);
            }
        }

        // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
        const xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch));
        const ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch));
        const zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch));

        // Set the diameter endpoints to the largest span.
        let diameter1 = xMin;
        let diameter2 = xMax;
        let maxSpan = xSpan;
        if (ySpan > maxSpan) {
            maxSpan = ySpan;
            diameter1 = yMin;
            diameter2 = yMax;
        }
        if (zSpan > maxSpan) {
            maxSpan = zSpan;
            diameter1 = zMin;
            diameter2 = zMax;
        }

        // Calculate the center of the initial sphere found by Ritter's algorithm
        const ritterCenter = fromPointsRitterCenter;
        ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
        ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
        ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

        // Calculate the radius of the initial sphere found by Ritter's algorithm
        let radiusSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch));
        let ritterRadius = Math.sqrt(radiusSquared);

        // Find the center of the sphere found using the Naive method.
        const minBoxPt = fromPointsMinBoxPt;
        minBoxPt.x = xMin.x;
        minBoxPt.y = yMin.y;
        minBoxPt.z = zMin.z;

        const maxBoxPt = fromPointsMaxBoxPt;
        maxBoxPt.x = xMax.x;
        maxBoxPt.y = yMax.y;
        maxBoxPt.z = zMax.z;

        const naiveCenter = Cartesian3.midpoint(minBoxPt, maxBoxPt, fromPointsNaiveCenterScratch);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        let naiveRadius = 0;
        for (i = 0; i < numPositions; i++) {
            Cartesian3.clone((positions as Cartesian3[])[i], currentPos);

            // Find the furthest point from the naive center to calculate the naive radius.
            const r = Cartesian3.magnitude(Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch));
            if (r > naiveRadius) {
                naiveRadius = r;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            const oldCenterToPointSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch));
            if (oldCenterToPointSquared > radiusSquared) {
                const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                radiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                const oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
                ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
                ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
            }
        }

        if (ritterRadius < naiveRadius) {
            Cartesian3.clone(ritterCenter, result.center);
            result.radius = ritterRadius;
        } else {
            Cartesian3.clone(naiveCenter, result.center);
            result.radius = naiveRadius;
        }

        return result;
    }

    /**
     * Computes a bounding sphere from a rectangle projected in 2D.  The bounding sphere accounts for the
     * object's minimum and maximum heights over the rectangle.
     *
     * @param {Rectangle} [rectangle] The rectangle around which to create a bounding sphere.
     * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
     * @param {Number} [minimumHeight=0.0] The minimum height over the rectangle.
     * @param {Number} [maximumHeight=0.0] The maximum height over the rectangle.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    static fromRectangleWithHeights2D (rectangle:Rectangle, projection = defaultProjection, minimumHeight = 0.0, maximumHeight = 0.0, result = new BoundingSphere()):BoundingSphere {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(rectangle)) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        projection = defaultValue(projection, defaultProjection);

        Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
        fromRectangle2DSouthwest.height = minimumHeight;
        Rectangle.northeast(rectangle, fromRectangle2DNortheast);
        fromRectangle2DNortheast.height = maximumHeight;

        const lowerLeft = projection.project(fromRectangle2DSouthwest, fromRectangle2DLowerLeft);
        const upperRight = projection.project(fromRectangle2DNortheast, fromRectangle2DUpperRight);

        const width = upperRight.x - lowerLeft.x;
        const height = upperRight.y - lowerLeft.y;
        const elevation = upperRight.z - lowerLeft.z;

        result.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
        const center = result.center;
        center.x = lowerLeft.x + width * 0.5;
        center.y = lowerLeft.y + height * 0.5;
        center.z = lowerLeft.z + elevation * 0.5;
        return result;
    }

    /**
     * Determines which side of a plane the sphere is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
     *                      intersects the plane.
     */
    intersectPlane (plane: Plane): Intersect {
        return BoundingSphere.intersectPlane(this, plane);
    }

    /**
     * Determines which side of a plane a sphere is located.
     *
     * @param {BoundingSphere} sphere The bounding sphere to test.
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
     *                      intersects the plane.
     */
    static intersectPlane (sphere:BoundingSphere, plane:Plane):Intersect {
        const center = sphere.center;
        const radius = sphere.radius;
        const normal = plane.normal;
        const distanceToPlane = Cartesian3.dot(normal, center) + plane.distance;

        if (distanceToPlane < -radius) {
            // The center point is negative side of the plane normal
            return Intersect.OUTSIDE;
        } else if (distanceToPlane < radius) {
            // The center point is positive side of the plane, but radius extends beyond it; partial overlap
            return Intersect.INTERSECTING;
        }
        return Intersect.INSIDE;
    }

    /**
 * Duplicates this BoundingSphere instance.
 *
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
    clone (result?: BoundingSphere): BoundingSphere | undefined {
        return BoundingSphere.clone(this, result);
    }

    /**
 * Computes a bounding sphere that contains both the left and right bounding spheres.
 *
 * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
 * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
    static union (left: BoundingSphere, right: BoundingSphere, result?: BoundingSphere):BoundingSphere {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        const leftCenter = left.center;
        const leftRadius = left.radius;
        const rightCenter = right.center;
        const rightRadius = right.radius;

        const toRightCenter = Cartesian3.subtract(
            rightCenter,
            leftCenter,
            unionScratch
        );
        const centerSeparation = Cartesian3.magnitude(toRightCenter);

        if (leftRadius >= centerSeparation + rightRadius) {
            // Left sphere wins.
            left.clone(result);
            return result as BoundingSphere;
        }

        if (rightRadius >= centerSeparation + leftRadius) {
            // Right sphere wins.
            right.clone(result);
            return result as BoundingSphere;
        }

        // There are two tangent points, one on far side of each sphere.
        const halfDistanceBetweenTangentPoints =
      (leftRadius + centerSeparation + rightRadius) * 0.5;

        // Compute the center point halfway between the two tangent points.
        const center = Cartesian3.multiplyByScalar(
            toRightCenter,
            (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
            unionScratchCenter
        );
        Cartesian3.add(center, leftCenter, center);
        Cartesian3.clone(center, (result as BoundingSphere).center);
        (result as BoundingSphere).radius = halfDistanceBetweenTangentPoints;

        return (result as BoundingSphere);
    }

    /**
     * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
     *
     * @param {BoundingSphere} sphere The sphere.
     * @param {Cartesian3} cartesian The point
     * @returns {Number} The estimated distance squared from the bounding sphere to the point.
     *
     * @example
     * // Sort bounding spheres from back to front
     * spheres.sort(function(a, b) {
     *     return Cesium.BoundingSphere.distanceSquaredTo(b, camera.positionWC) - Cesium.BoundingSphere.distanceSquaredTo(a, camera.positionWC);
     * });
     */
    static distanceSquaredTo (sphere: BoundingSphere, cartesian: Cartesian3): number {
        const diff = Cartesian3.subtract(
            sphere.center,
            cartesian,
            distanceSquaredToScratch
        );
        return Cartesian3.magnitudeSquared(diff) - sphere.radius * sphere.radius;
    }
}

export { BoundingSphere };
