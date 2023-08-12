import { Cartesian3 } from '../Core/Cartesian3';
import { Ellipsoid } from '../Core/Ellipsoid';
import { EllipsoidalOccluder } from '../Core/EllipsoidalOccluder';

class QuadtreeOccluders {
    _ellipsoid: EllipsoidalOccluder
    constructor (options = {
        ellipsoid: Ellipsoid.WGS84
    }) {
        this._ellipsoid = new EllipsoidalOccluder(options.ellipsoid, Cartesian3.ZERO);
    }

    get ellipsoid (): EllipsoidalOccluder {
        return this._ellipsoid;
    }
}

export { QuadtreeOccluders };
