import { defined } from '../Core/defined';
import { Object3DCollection } from '../Core/Object3DCollection';
import { FrameState } from './FrameState';

class PrimitiveCollection extends Object3DCollection {
    _primitives: any[];
    constructor () {
        super();
        this._primitives = [];
    }

    update (frameState: FrameState): void {
        if (!this.visible) {
            return;
        }

        const primitives = this._primitives;
        // Using primitives.length in the loop is a temporary workaround
        // to allow quadtree updates to add and remove primitives in
        // update().  This will be changed to manage added and removed lists.
        for (let i = 0; i < primitives.length; ++i) {
            primitives[i].update(frameState);
        }
    }

    /**
     * @private
     */
    prePassesUpdate (frameState: FrameState): void {
        const primitives = this._primitives;
        // Using primitives.length in the loop is a temporary workaround
        // to allow quadtree updates to add and remove primitives in
        // update().  This will be changed to manage added and removed lists.
        for (let i = 0; i < primitives.length; ++i) {
            const primitive = primitives[i];
            if (defined(primitive.prePassesUpdate)) {
                primitive.prePassesUpdate(frameState);
            }
        }
    }
}
export { PrimitiveCollection };
