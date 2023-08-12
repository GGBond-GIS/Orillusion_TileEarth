/* eslint-disable no-mixed-operators */

import { Cartesian3 } from './Cartesian3';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Intersect } from './Intersect';
import { Plane } from './Plane';

let intersectScratch = new Cartesian3();
/**
 * Creates an instance of an AxisAlignedBoundingBox from the minimum and maximum points along the x, y, and z axes.
 * @alias AxisAlignedBoundingBox
 * @constructor
 *
 * @param {Cartesian3} [minimum=Cartesian3.ZERO] The minimum point along the x, y, and z axes.
 * @param {Cartesian3} [maximum=Cartesian3.ZERO] The maximum point along the x, y, and z axes.
 * @param {Cartesian3} [center] The center of the box; automatically computed if not supplied.
 *
 * @see BoundingSphere
 * @see BoundingRectangle
 */
class AxisAlignedBoundingBox {
    minimum: Cartesian3;
    maximum: Cartesian3;
    center: Cartesian3;
    constructor (minimum = Cartesian3.ZERO, maximum = Cartesian3.ZERO, center = Cartesian3.ZERO) {
        /**
         * The minimum point defining the bounding box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.minimum = Cartesian3.clone(defaultValue(minimum, Cartesian3.ZERO));

        /**
         * The maximum point defining the bounding box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.maximum = Cartesian3.clone(defaultValue(maximum, Cartesian3.ZERO));

        // If center was not defined, compute it.
        if (!defined(center)) {
            center = Cartesian3.midpoint(this.minimum, this.maximum, new Cartesian3());
        } else {
            center = Cartesian3.clone(center);
        }

        /**
         * The center point of the bounding box.
         * @type {Cartesian3}
         */
        this.center = center;
    }

    /**
     * Duplicates a AxisAlignedBoundingBox instance.
     *
     * @param {AxisAlignedBoundingBox} box The bounding box to duplicate.
     * @param {AxisAlignedBoundingBox} [result] The object onto which to store the result.
     * @returns {AxisAlignedBoundingBox} The modified result parameter or a new AxisAlignedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
     */
    static clone (box: AxisAlignedBoundingBox, result?:AxisAlignedBoundingBox): AxisAlignedBoundingBox | undefined {
        if (!defined(box)) {
            return undefined;
        }

        if (!defined(result)) {
            return new AxisAlignedBoundingBox(box.minimum, box.maximum, box.center);
        }

        (result as AxisAlignedBoundingBox).minimum = Cartesian3.clone(box.minimum, (result as AxisAlignedBoundingBox).minimum);
        (result as AxisAlignedBoundingBox).maximum = Cartesian3.clone(box.maximum, (result as AxisAlignedBoundingBox).maximum);
        (result as AxisAlignedBoundingBox).center = Cartesian3.clone(box.center, (result as AxisAlignedBoundingBox).center);
        return result;
    }

    /**
     * Compares the provided AxisAlignedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {AxisAlignedBoundingBox} [left] The first AxisAlignedBoundingBox.
     * @param {AxisAlignedBoundingBox} [right] The second AxisAlignedBoundingBox.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    static equals (left?:AxisAlignedBoundingBox, right?:AxisAlignedBoundingBox): boolean {
        return left === right ||
               defined(left) &&
                defined(right) &&
                Cartesian3.equals((left as AxisAlignedBoundingBox).center, (right as AxisAlignedBoundingBox).center) &&
                Cartesian3.equals((left as AxisAlignedBoundingBox).minimum, (right as AxisAlignedBoundingBox).minimum) &&
                Cartesian3.equals((left as AxisAlignedBoundingBox).maximum, (right as AxisAlignedBoundingBox).maximum);
    }

    /**
     * Determines which side of a plane a box is located.
     *
     * @param {AxisAlignedBoundingBox} box The bounding box to test.
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
     *                      intersects the plane.
     */
    static intersectPlane (box:AxisAlignedBoundingBox, plane:Plane):Intersect {
        intersectScratch = Cartesian3.subtract(box.maximum, box.minimum, intersectScratch);
        const h = Cartesian3.multiplyByScalar(intersectScratch, 0.5, intersectScratch); // The positive half diagonal
        const normal = plane.normal;
        const e = h.x * Math.abs(normal.x) + h.y * Math.abs(normal.y) + h.z * Math.abs(normal.z);
        const s = Cartesian3.dot(box.center, normal) + plane.distance; // signed distance from center

        if (s - e > 0) {
            return Intersect.INSIDE;
        }

        if (s + e < 0) {
            // Not in front because normals point inward
            return Intersect.OUTSIDE;
        }

        return Intersect.INTERSECTING;
    }

    /**
     * Duplicates this AxisAlignedBoundingBox instance.
     *
     * @param {AxisAlignedBoundingBox} [result] The object onto which to store the result.
     * @returns {AxisAlignedBoundingBox} The modified result parameter or a new AxisAlignedBoundingBox instance if one was not provided.
     */
    clone (result?:AxisAlignedBoundingBox): AxisAlignedBoundingBox {
        return AxisAlignedBoundingBox.clone(this, result) as AxisAlignedBoundingBox;
    }

    /**
     * Determines which side of a plane this box is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
     *                      intersects the plane.
     */
    intersectPlane (plane:Plane):Intersect {
        return AxisAlignedBoundingBox.intersectPlane(this, plane);
    }

    /**
     * Compares this AxisAlignedBoundingBox against the provided AxisAlignedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {AxisAlignedBoundingBox} [right] The right hand side AxisAlignedBoundingBox.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    equals (right?:AxisAlignedBoundingBox):boolean {
        return AxisAlignedBoundingBox.equals(this, right);
    }
}

export { AxisAlignedBoundingBox };
