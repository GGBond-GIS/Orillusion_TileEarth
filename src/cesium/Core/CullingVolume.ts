import { Frustum } from 'three';
import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { Intersect } from './Intersect';
import { Plane } from './Plane';

const faces = [new Cartesian3(), new Cartesian3(), new Cartesian3()];
Cartesian3.clone(Cartesian3.UNIT_X, faces[0]);
Cartesian3.clone(Cartesian3.UNIT_Y, faces[1]);
Cartesian3.clone(Cartesian3.UNIT_Z, faces[2]);

const scratchPlaneCenter = new Cartesian3();
const scratchPlaneNormal = new Cartesian3();
const scratchPlane = new Plane(new Cartesian3(1.0, 0.0, 0.0), 0.0);

class CullingVolume {
    planes:Cartesian4[]
    constructor (planes?: Plane[]) {
        /**
         * Each plane is represented by a Cartesian4 object, where the x, y, and z components
         * define the unit vector normal to the plane, and the w component is the distance of the
         * plane from the origin.
         * @type {Cartesian4[]}
         * @default []
         */
        this.planes = defaultValue(planes, []) as unknown as Cartesian4[];
    }

    /**
     * Determines whether a bounding volume intersects the culling volume.
     *
     * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
     * @returns {Intersect}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
     */
    computeVisibility (boundingVolume: any): Intersect {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(boundingVolume)) {
            throw new DeveloperError('boundingVolume is required.');
        }
        // >>includeEnd('debug');

        const planes: any = this.planes;
        let intersecting = false;
        for (let k = 0, len = planes.length; k < len; ++k) {
            const result = boundingVolume.intersectPlane(
                Plane.fromCartesian4(planes[k], scratchPlane)
            );
            if (result === Intersect.OUTSIDE) {
                return Intersect.OUTSIDE;
            } else if (result === Intersect.INTERSECTING) {
                intersecting = true;
            }
        }

        return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
    }

    setFromThreeFrustum (frustum: Frustum): void {
        for (let i = 0; i < 6; i++) {
            const frustumPlane = frustum.planes[i];

            if (!defined(this.planes[i])) {
                this.planes[i] = new Cartesian4();
            }
            const plane = this.planes[i];
            plane.x = frustumPlane.normal.x;
            plane.y = frustumPlane.normal.y;
            plane.z = frustumPlane.normal.z;
            plane.w = frustumPlane.constant;
        }
    }
}

export { CullingVolume };
