import { Object3D } from 'three';
import { defaultValue } from './defaultValue';

class Object3DCollection extends Object3D {
    public destroyChildren: any;
    // boundingBox: Box3;
    // boundingSphere: Sphere;
    constructor (options?: { destroyChildren: true }) {
        super();

        this.destroyChildren = options?.destroyChildren;
        //  //这个集合整体的包围盒
        // this.boundingBox = new Box3();
        // this.boundingSphere = new Sphere();
    }

    // updateBoundingBox() {
    //     this.boundingBox.makeEmpty();
    //     this.boundingBox.expandByObject(this);
    //     this.boundingBox.getBoundingSphere(this.boundingSphere);
    // }
}

export { Object3DCollection };
