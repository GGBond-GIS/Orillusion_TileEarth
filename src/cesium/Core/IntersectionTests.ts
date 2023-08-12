import { Vector3 } from 'three';
import { BoundingSphere } from './BoundingSphere';
import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { CesiumMatrix3 } from './CesiumMatrix3';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Ellipsoid } from './Ellipsoid';
import { Interval } from './Interval';
import { Plane } from './Plane';
import { QuadraticRealPolynomial } from './QuadraticRealPolynomial';
import QuarticRealPolynomial from './QuarticRealPolynomial';
import { Ray } from './Ray';

/**
 * Functions for computing the intersection between geometries such as rays, planes, triangles, and ellipsoids.
 *
 * @namespace IntersectionTests
 */
const IntersectionTests: {
    // raySphere?: (ray: Ray, sphere: BoundingSphere, result?: Interval) => Interval | undefined,
    [name: string]: any
} = {};

/**
 * Computes the intersection of a ray and a plane.
 *
 * @param {Ray} ray The ray.
 * @param {Plane} plane The plane.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
 */
IntersectionTests.rayPlane = function (ray:Ray, plane:Plane, result?:Cartesian3):Cartesian3 |undefined {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(ray)) {
        throw new DeveloperError('ray is required.');
    }
    if (!defined(plane)) {
        throw new DeveloperError('plane is required.');
    }
    // >>includeEnd('debug');

    if (!defined(result)) {
        result = new Cartesian3();
    }

    const origin = ray.origin;
    const direction = ray.direction;
    const normal = plane.normal;
    const denominator = Cartesian3.dot(normal, direction);

    if (Math.abs(denominator) < CesiumMath.EPSILON15) {
        // Ray is parallel to plane.  The ray may be in the polygon's plane.
        return undefined;
    }

    const t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator;

    if (t < 0) {
        return undefined;
    }

    result = Cartesian3.multiplyByScalar(direction, t, result as Cartesian3);
    return Cartesian3.add(origin, result, result);
};

const scratchEdge0 = new Cartesian3();
const scratchEdge1 = new Cartesian3();
const scratchPVec = new Cartesian3();
const scratchTVec = new Cartesian3();
const scratchQVec = new Cartesian3();

/**
 * Computes the intersection of a ray and a triangle as a parametric distance along the input ray. The result is negative when the triangle is behind the ray.
 *
 * Implements {@link https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf|
 * Fast Minimum Storage Ray/Triangle Intersection} by Tomas Moller and Ben Trumbore.
 *
 * @memberof IntersectionTests
 *
 * @param {Ray} ray The ray.
 * @param {Cartesian3} p0 The first vertex of the triangle.
 * @param {Cartesian3} p1 The second vertex of the triangle.
 * @param {Cartesian3} p2 The third vertex of the triangle.
 * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
 *                  and return undefined for intersections with the back face.
 * @returns {Number} The intersection as a parametric distance along the ray, or undefined if there is no intersection.
 */
IntersectionTests.rayTriangleParametric = function (
    ray: any,
    p0: any,
    p1: any,
    p2: any,
    cullBackFaces = false
) {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(ray)) {
        throw new DeveloperError('ray is required.');
    }
    if (!defined(p0)) {
        throw new DeveloperError('p0 is required.');
    }
    if (!defined(p1)) {
        throw new DeveloperError('p1 is required.');
    }
    if (!defined(p2)) {
        throw new DeveloperError('p2 is required.');
    }
    // >>includeEnd('debug');

    cullBackFaces = defaultValue(cullBackFaces, false);

    const origin = ray.origin;
    const direction = ray.direction;

    const edge0 = Cartesian3.subtract(p1, p0, scratchEdge0);
    const edge1 = Cartesian3.subtract(p2, p0, scratchEdge1);

    const p = Cartesian3.cross(direction, edge1, scratchPVec);
    const det = Cartesian3.dot(edge0, p);

    let tvec;
    let q;

    let u;
    let v;
    let t;

    if (cullBackFaces) {
        if (det < CesiumMath.EPSILON6) {
            return undefined;
        }

        tvec = Cartesian3.subtract(origin, p0, scratchTVec);
        u = Cartesian3.dot(tvec, p);
        if (u < 0.0 || u > det) {
            return undefined;
        }

        q = Cartesian3.cross(tvec, edge0, scratchQVec);

        v = Cartesian3.dot(direction, q);
        if (v < 0.0 || u + v > det) {
            return undefined;
        }

        t = Cartesian3.dot(edge1, q) / det;
    } else {
        if (Math.abs(det) < CesiumMath.EPSILON6) {
            return undefined;
        }
        const invDet = 1.0 / det;

        tvec = Cartesian3.subtract(origin, p0, scratchTVec);
        u = Cartesian3.dot(tvec, p) * invDet;
        if (u < 0.0 || u > 1.0) {
            return undefined;
        }

        q = Cartesian3.cross(tvec, edge0, scratchQVec);

        v = Cartesian3.dot(direction, q) * invDet;
        if (v < 0.0 || u + v > 1.0) {
            return undefined;
        }

        t = Cartesian3.dot(edge1, q) * invDet;
    }

    return t;
};
const raySphereRoots = {
    root0: 0.0,
    root1: 0.0
};

function solveQuadratic (a: number, b: number, c: number, result: any) {
    const det = b * b - 4.0 * a * c;
    if (det < 0.0) {
        return undefined;
    } else if (det > 0.0) {
        const denom = 1.0 / (2.0 * a);
        const disc = Math.sqrt(det);
        const root0 = (-b + disc) * denom;
        const root1 = (-b - disc) * denom;

        if (root0 < root1) {
            result.root0 = root0;
            result.root1 = root1;
        } else {
            result.root0 = root1;
            result.root1 = root0;
        }

        return result;
    }

    const root = -b / (2.0 * a);
    if (root === 0.0) {
        return undefined;
    }

    result.root0 = result.root1 = root;
    return result;
}

function raySphere (ray: Ray, sphere: BoundingSphere, result?: Interval): Interval | undefined {
    if (!defined(result)) {
        result = new Interval();
    }

    const origin = ray.origin;
    const direction = ray.direction;

    const center = sphere.center;
    const radiusSquared = sphere.radius * sphere.radius;

    const diff = Cartesian3.subtract(origin, center, scratchPVec);

    const a = Cartesian3.dot(direction, direction);
    const b = 2.0 * Cartesian3.dot(direction, diff);
    const c = Cartesian3.magnitudeSquared(diff) - radiusSquared;

    const roots = solveQuadratic(a, b, c, raySphereRoots);
    if (!defined(roots)) {
        return undefined;
    }

    (result as Interval).start = roots.root0;
    (result as Interval).stop = roots.root1;
    return result;
}

/**
 * Computes the intersection points of a ray with a sphere.
 * @memberof IntersectionTests
 *
 * @param {Ray} ray The ray.
 * @param {BoundingSphere} sphere The sphere.
 * @param {Interval} [result] The result onto which to store the result.
 * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
 */
IntersectionTests.raySphere = function (ray: Ray, sphere: BoundingSphere, result?: Interval): Interval | undefined {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(ray)) {
        throw new DeveloperError('ray is required.');
    }
    if (!defined(sphere)) {
        throw new DeveloperError('sphere is required.');
    }
    // >>includeEnd('debug');

    result = raySphere(ray, sphere, result);
    if (!defined(result) || (result as Interval).stop < 0.0) {
        return undefined;
    }

    (result as Interval).start = Math.max((result as Interval).start, 0.0);
    return (result as Interval);
};

const _vector = new Cartesian3();
IntersectionTests.intersectSphere = function (ray: Ray, sphere: BoundingSphere, result: Cartesian3): Cartesian3 | null {
    // _vector.subVectors(sphere.center, this.origin);
    Cartesian3.subtract(sphere.center, ray.origin, _vector);
    const tca = Cartesian3.dot(_vector, ray.direction); // _vector.dot(this.direction);
    const d2 = Cartesian3.dot(_vector, _vector) - tca * tca;// _vector.dot(_vector) - tca * tca;
    const radius2 = sphere.radius * sphere.radius;

    if (d2 > radius2) return null;

    const thc = Math.sqrt(radius2 - d2);

    // t0 = first intersect point - entrance on front of sphere
    const t0 = tca - thc;

    // t1 = second intersect point - exit point on back of sphere
    const t1 = tca + thc;

    // test to see if both t0 and t1 are behind the ray - if so, return null
    if (t0 < 0 && t1 < 0) return null;

    // test to see if t0 is behind the ray:
    // if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
    // in order to always return an intersect point that is in front of the ray.

    // if (t0 < 0) return ray.at(t1, result);
    if (t0 < 0) return Ray.getPoint(ray, t1, result);

    // else t0 is in front of the ray, so return the first collision point scaled by t0
    // return ray.at(t0, result);
    return Ray.getPoint(ray, t0, result);
};

const scratchQ = new Cartesian3();
const scratchW = new Cartesian3();

/**
 * Computes the intersection points of a ray with an ellipsoid.
 *
 * @param {Ray} ray The ray.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
 */
IntersectionTests.rayEllipsoid = function (ray: Ray, ellipsoid: Ellipsoid): Interval | undefined {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(ray)) {
        throw new DeveloperError('ray is required.');
    }
    if (!defined(ellipsoid)) {
        throw new DeveloperError('ellipsoid is required.');
    }
    // >>includeEnd('debug');

    const inverseRadii = ellipsoid.oneOverRadii as Cartesian3;
    const q = Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ);
    const w = Cartesian3.multiplyComponents(inverseRadii, ray.direction, scratchW);

    const q2 = Cartesian3.magnitudeSquared(q);
    const qw = Cartesian3.dot(q, w);

    let difference, w2, product, discriminant, temp;

    if (q2 > 1.0) {
    // Outside ellipsoid.
        if (qw >= 0.0) {
            // Looking outward or tangent (0 intersections).
            return undefined;
        }

        // qw < 0.0.
        const qw2 = qw * qw;
        difference = q2 - 1.0; // Positively valued.
        w2 = Cartesian3.magnitudeSquared(w);
        product = w2 * difference;

        if (qw2 < product) {
            // Imaginary roots (0 intersections).
            return undefined;
        } else if (qw2 > product) {
            // Distinct roots (2 intersections).
            discriminant = qw * qw - product;
            temp = -qw + Math.sqrt(discriminant); // Avoid cancellation.
            const root0 = temp / w2;
            const root1 = difference / temp;
            if (root0 < root1) {
                return new Interval(root0, root1);
            }

            return {
                start: root1,
                stop: root0
            };
        }
        // qw2 == product.  Repeated roots (2 intersections).
        const root = Math.sqrt(difference / w2);
        return new Interval(root, root);
    } else if (q2 < 1.0) {
    // Inside ellipsoid (2 intersections).
        difference = q2 - 1.0; // Negatively valued.
        w2 = Cartesian3.magnitudeSquared(w);
        product = w2 * difference; // Negatively valued.

        discriminant = qw * qw - product;
        temp = -qw + Math.sqrt(discriminant); // Positively valued.
        return new Interval(0.0, temp / w2);
    }
    // q2 == 1.0. On ellipsoid.
    if (qw < 0.0) {
    // Looking inward.
        w2 = Cartesian3.magnitudeSquared(w);
        return new Interval(0.0, -qw / w2);
    }

    // qw >= 0.0.  Looking outward or tangent.
    return undefined;
};

function addWithCancellationCheck (left: number, right: number, tolerance?: number): number {
    const difference = left + right;
    if (
        CesiumMath.sign(left) !== CesiumMath.sign(right) &&
      Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < (tolerance as number)
    ) {
        return 0.0;
    }

    return difference;
}

function quadraticVectorExpression (A: any, b: Cartesian3, c: number, x: number, w: number): Cartesian3[] {
    const xSquared = x * x;
    const wSquared = w * w;

    const l2 = (A[CesiumMatrix3.COLUMN1ROW1] - A[CesiumMatrix3.COLUMN2ROW2]) * wSquared;
    const l1 =
      w *
      (x *
        addWithCancellationCheck(
            A[CesiumMatrix3.COLUMN1ROW0],
            A[CesiumMatrix3.COLUMN0ROW1],
            CesiumMath.EPSILON15
        ) +
        b.y);
    const l0 =
      A[CesiumMatrix3.COLUMN0ROW0] * xSquared +
      A[CesiumMatrix3.COLUMN2ROW2] * wSquared +
      x * b.x +
      c;

    const r1 =
      wSquared *
      addWithCancellationCheck(
          A[CesiumMatrix3.COLUMN2ROW1],
          A[CesiumMatrix3.COLUMN1ROW2],
          CesiumMath.EPSILON15
      );
    const r0 =
      w *
      (x *
        addWithCancellationCheck(A[CesiumMatrix3.COLUMN2ROW0], A[CesiumMatrix3.COLUMN0ROW2]) +
        b.z);

    let cosines;
    const solutions: Cartesian3[] = [];
    if (r0 === 0.0 && r1 === 0.0) {
        cosines = QuadraticRealPolynomial.computeRealRoots(l2, l1, l0);
        if (cosines.length === 0) {
            return solutions;
        }

        const cosine0 = cosines[0];
        const sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0));
        solutions.push(new Cartesian3(x, w * cosine0, w * -sine0));
        solutions.push(new Cartesian3(x, w * cosine0, w * sine0));

        if (cosines.length === 2) {
            const cosine1 = cosines[1];
            const sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0));
            solutions.push(new Cartesian3(x, w * cosine1, w * -sine1));
            solutions.push(new Cartesian3(x, w * cosine1, w * sine1));
        }

        return solutions;
    }

    const r0Squared = r0 * r0;
    const r1Squared = r1 * r1;
    const l2Squared = l2 * l2;
    const r0r1 = r0 * r1;

    const c4 = l2Squared + r1Squared;
    const c3 = 2.0 * (l1 * l2 + r0r1);
    const c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
    const c1 = 2.0 * (l0 * l1 - r0r1);
    const c0 = l0 * l0 - r0Squared;

    if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
        return solutions;
    }

    cosines = QuarticRealPolynomial.computeRealRoots(c4, c3, c2, c1, c0);
    const length = cosines.length;
    if (length === 0) {
        return solutions;
    }

    for (let i = 0; i < length; ++i) {
        const cosine = cosines[i];
        const cosineSquared = cosine * cosine;
        const sineSquared = Math.max(1.0 - cosineSquared, 0.0);
        const sine = Math.sqrt(sineSquared);

        // var left = l2 * cosineSquared + l1 * cosine + l0;
        let left;
        if (CesiumMath.sign(l2) === CesiumMath.sign(l0)) {
            left = addWithCancellationCheck(
                l2 * cosineSquared + l0,
                l1 * cosine,
                CesiumMath.EPSILON12
            );
        } else if (CesiumMath.sign(l0) === CesiumMath.sign(l1 * cosine)) {
            left = addWithCancellationCheck(
                l2 * cosineSquared,
                l1 * cosine + l0,
                CesiumMath.EPSILON12
            );
        } else {
            left = addWithCancellationCheck(
                l2 * cosineSquared + l1 * cosine,
                l0,
                CesiumMath.EPSILON12
            );
        }

        const right = addWithCancellationCheck(r1 * cosine, r0, CesiumMath.EPSILON15);
        const product = left * right;

        if (product < 0.0) {
            solutions.push(new Cartesian3(x, w * cosine, w * sine));
        } else if (product > 0.0) {
            solutions.push(new Cartesian3(x, w * cosine, w * -sine));
        } else if (sine !== 0.0) {
            solutions.push(new Cartesian3(x, w * cosine, w * -sine));
            solutions.push(new Cartesian3(x, w * cosine, w * sine));
            ++i;
        } else {
            solutions.push(new Cartesian3(x, w * cosine, w * sine));
        }
    }

    return solutions;
}

const firstAxisScratch = new Cartesian3();
const secondAxisScratch = new Cartesian3();
const thirdAxisScratch = new Cartesian3();
const referenceScratch = new Cartesian3();
const bCart = new Cartesian3();
const bScratch = new CesiumMatrix3();
const btScratch = new CesiumMatrix3();
const diScratch = new CesiumMatrix3();
const dScratch = new CesiumMatrix3();
const cScratch = new CesiumMatrix3();
const tempMatrix = new CesiumMatrix3();
const aScratch = new CesiumMatrix3();
const sScratch = new Cartesian3();
const closestScratch = new Cartesian3();
const surfPointScratch = new Cartographic();

/**
 * Provides the point along the ray which is nearest to the ellipsoid.
 *
 * @param {Ray} ray The ray.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Cartesian3} The nearest planetodetic point on the ray.
 */
IntersectionTests.grazingAltitudeLocation = function (ray: Ray, ellipsoid: Ellipsoid): Cartesian3 | undefined {
    const position = ray.origin;
    const direction = ray.direction;

    if (!Cartesian3.equals(position, Cartesian3.ZERO)) {
        const normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch) as Cartesian3;
        if (Cartesian3.dot(direction, normal) >= 0.0) {
            // The location provided is the closest point in altitude
            return position;
        }
    }

    const intersects = defined(this.rayEllipsoid(ray, ellipsoid));

    // Compute the scaled direction vector.
    const f = ellipsoid.transformPositionToScaledSpace(direction, firstAxisScratch);

    // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
    const firstAxis = Cartesian3.normalize(f, f);
    const reference = Cartesian3.mostOrthogonalAxis(f, referenceScratch);
    const secondAxis = Cartesian3.normalize(
        Cartesian3.cross(reference, firstAxis, secondAxisScratch),
        secondAxisScratch
    );
    const thirdAxis = Cartesian3.normalize(
        Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch),
        thirdAxisScratch
    );
    const B = bScratch;
    B[0] = firstAxis.x;
    B[1] = firstAxis.y;
    B[2] = firstAxis.z;
    B[3] = secondAxis.x;
    B[4] = secondAxis.y;
    B[5] = secondAxis.z;
    B[6] = thirdAxis.x;
    B[7] = thirdAxis.y;
    B[8] = thirdAxis.z;

    const B_T = CesiumMatrix3.transpose(B, btScratch);

    // Get the scaling matrix and its inverse.
    const D_I = CesiumMatrix3.fromScale(ellipsoid.radii, diScratch);
    const D = CesiumMatrix3.fromScale((ellipsoid.oneOverRadii as Cartesian3), dScratch);

    const C = cScratch;
    C[0] = 0.0;
    C[1] = -direction.z;
    C[2] = direction.y;
    C[3] = direction.z;
    C[4] = 0.0;
    C[5] = -direction.x;
    C[6] = -direction.y;
    C[7] = direction.x;
    C[8] = 0.0;

    const temp = CesiumMatrix3.multiply(
        CesiumMatrix3.multiply(B_T, D, tempMatrix),
        C,
        tempMatrix
    );
    const A = CesiumMatrix3.multiply(CesiumMatrix3.multiply(temp, D_I, aScratch), B, aScratch);
    const b = CesiumMatrix3.multiplyByVector(temp, position, bCart);

    // Solve for the solutions to the expression in standard form:
    const solutions = quadraticVectorExpression(
        A,
        Cartesian3.negate(b, firstAxisScratch),
        0.0,
        0.0,
        1.0
    );

    let s;
    let altitude;
    const length = solutions.length;
    if (length > 0) {
        let closest = Cartesian3.clone(Cartesian3.ZERO, closestScratch);
        let maximumValue = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < length; ++i) {
            s = CesiumMatrix3.multiplyByVector(
                D_I,
                CesiumMatrix3.multiplyByVector(B, solutions[i], sScratch),
                sScratch
            );
            const v = Cartesian3.normalize(
                Cartesian3.subtract(s, position, referenceScratch),
                referenceScratch
            );
            const dotProduct = Cartesian3.dot(v, direction);

            if (dotProduct > maximumValue) {
                maximumValue = dotProduct;
                closest = Cartesian3.clone(s, closest);
            }
        }

        const surfacePoint = ellipsoid.cartesianToCartographic(
            closest,
            surfPointScratch
        ) as Cartographic;
        maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
        altitude =
      Cartesian3.magnitude(
          Cartesian3.subtract(closest, position, referenceScratch)
      ) * Math.sqrt(1.0 - maximumValue * maximumValue);
        altitude = intersects ? -altitude : altitude;
        surfacePoint.height = altitude;
        return ellipsoid.cartographicToCartesian(surfacePoint, new Cartesian3());
    }

    return undefined;
};

export { IntersectionTests };
