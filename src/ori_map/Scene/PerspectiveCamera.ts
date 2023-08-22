import { Camera3D, Engine3D, HoverCameraController, Object3D } from "@orillusion/core";
import { PerspectiveFrustumCameraParameters } from "./PerspectiveFrustumCamera";

export class PerspectiveCamera extends Object3D{
    _cameraObj: Object3D;
    _camera: Camera3D;
    constructor(options:PerspectiveFrustumCameraParameters){
        super();

        this._cameraObj = new Object3D();
        this._camera = this._cameraObj.addComponent(Camera3D);
        //@ts-ignore
        this._camera.perspective(options.fov , options?.aspect || Engine3D.aspect, 0.1,  10000000000)
        let hc =  this._cameraObj.addComponent(HoverCameraController);
        hc.setCamera(0,0,1);
        setTimeout(()=>{
        hc.setCamera(0,0,0);
            hc.destroy();
            this._camera.transform.z = 0;
        },100);
        this._camera.frustum.update = ()=>{};
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