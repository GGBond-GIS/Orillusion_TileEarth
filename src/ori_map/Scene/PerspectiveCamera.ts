import { Camera3D, Engine3D, HoverCameraController, Object3D } from "@orillusion/core";
import { PerspectiveFrustumCameraParameters } from "./PerspectiveFrustumCamera";

export class PerspectiveCamera extends Object3D{
    _cameraObj: Object3D;
    _camera: Camera3D;
    constructor(options:PerspectiveFrustumCameraParameters){
        super();

        this._cameraObj = new Object3D();
        this._camera = this._cameraObj.addComponent(Camera3D);
        this._camera.perspective(options?.fov || 60, options?.aspect || Engine3D.aspect, options?.near || 1, options?.far || 100000000)
        let hc =  this._cameraObj.addComponent(HoverCameraController);
        hc.setCamera(0,0,1);
        setTimeout(()=>{
            hc.destroy();
            this._camera.transform.z = 0;
        },1000);
        this.addChild(this._cameraObj);

    }
    get position(){
        return this.localPosition;
    }
    get fov(){
        return this._camera.fov;
    }
    set fov(fov:number){
        this._camera.fov = fov;
    }
    get near(){
        return this._camera.near;
    }
    get far(){
        return this._camera.far;
    }
    get aspect(){
        return this._camera.aspect;
    }
    set aspect(aspect:number){
        this._camera.aspect =aspect;
    }
    get projectionMatrix(){
        return this._camera.projectionMatrix;
    }
}