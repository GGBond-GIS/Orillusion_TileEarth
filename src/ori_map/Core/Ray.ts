
/**
 * Represents a ray that extends infinitely from the provided origin in the provided direction.
 * @alias Ray
 * @constructor
 *
 * @param {Cartesian3} [origin=Cartesian3.ZERO] The origin of the ray.
 * @param {Cartesian3} [direction=Cartesian3.ZERO] The direction of the ray.
 */

import { Cartesian3 } from './Cartesian3';
import { defaultValue } from './defaultValue';
import { defined } from './defined';

class Ray {
    origin: Cartesian3;
    direction: Cartesian3;
    constructor (origin?: Cartesian3, direction?: Cartesian3) {
        direction = Cartesian3.clone(defaultValue(direction, Cartesian3.ZERO) as Cartesian3) as Cartesian3;
        if (!Cartesian3.equals(direction, Cartesian3.ZERO)) {
            Cartesian3.normalize(direction, direction);
        }

        /**
         * The origin of the ray.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.origin = Cartesian3.clone(defaultValue(origin, Cartesian3.ZERO) as Cartesian3) as Cartesian3;

        /**
         * The direction of the ray.
         * @type {Cartesian3}
         */
        this.direction = direction;
    }

    at (t: number, target: Cartesian3): Cartesian3 {
        // return target.copy(this.direction).multiplyScalar(t).add(this.origin);

        Cartesian3.clone(this.direction, target);
        Cartesian3.multiplyByScalar(target, t, target);
        Cartesian3.add(target, this.origin, target);
        return target;
    }

    /**
     * Computes the point along the ray given by r(t) = o + t*d,
     * where o is the origin of the ray and d is the direction.
     *
     * @param {Ray} ray The ray.
     * @param {Number} t A scalar value.
     * @param {Cartesian3} [result] The object in which the result will be stored.
     * @returns {Cartesian3} The modified result parameter, or a new instance if none was provided.
     *
     * @example
     * //Get the first intersection point of a ray and an ellipsoid.
     * var intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);
     * var point = Cesium.Ray.getPoint(ray, intersection.start);
     */
    static getPoint (ray: Ray, t: number, result?: Cartesian3): Cartesian3 {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        result = Cartesian3.multiplyByScalar(ray.direction, t, (result as Cartesian3));
        return Cartesian3.add(ray.origin, result, result);
    }
}

export { Ray };
