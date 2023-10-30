import { DeveloperError } from '../../Util/DeveloperError';

class QuadtreeTileProvider {
    constructor () {
        DeveloperError.throwInstantiationError();
    }

    get quadtree ():void {
        return DeveloperError.throwInstantiationError();
    }

    set quadtree (value: any) {
        DeveloperError.throwInstantiationError();
    }

    get tilingScheme ():void {
        return DeveloperError.throwInstantiationError();
    }
}
export { QuadtreeTileProvider };
