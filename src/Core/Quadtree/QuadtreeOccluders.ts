import { Cartesian3 } from '../../Math/Cartesian3';
import { Ellipsoid } from '../../Math/Ellipsoid/Ellipsoid';
import { EllipsoidalOccluder } from '../../Math/Ellipsoid/EllipsoidalOccluder';

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
