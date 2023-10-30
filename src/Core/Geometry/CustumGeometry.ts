import { GeometryBase, Object3D } from "@orillusion/core";
import { DrawMeshCommand } from "../../ori_map/Renderer/DrawMeshCommand";

/**
 * Plane geometry
 * @group CustumGeometry
 */
export class CustumGeometry extends GeometryBase {
    _Object3D:DrawMeshCommand|undefined;
    constructor() {
        super();

    }
    get Object3D():DrawMeshCommand | undefined{
        return this._Object3D;
    }
    set Object3D(obj:DrawMeshCommand | undefined){
         this._Object3D = obj;

    }
}