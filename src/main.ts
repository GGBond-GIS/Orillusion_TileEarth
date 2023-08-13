import { Engine3D, Scene3D, Object3D, Camera3D, LitMaterial, BoxGeometry, MeshRenderer, DirectLight, HoverCameraController, Color, Vector3, AtmosphericComponent, View3D, ComponentBase, SphereGeometry } from '@orillusion/core'
import { CesiumScene } from './ori_map/Scene/CesiumScene'
import { Stats } from "@orillusion/stats"
import { UrlTemplateImageryProvider } from './ori_map/Scene/UrlTemplateImageryProvider';
import { TileCoordinatesImageryProvider } from './ori_map/Scene/TileCoordinatesImageryProvider';
await Engine3D.init();
//@ts-ignore
let scene3D: CesiumScene = window.scene = new CesiumScene({})
// let cameraObj: Object3D = new Object3D()
// let camera = cameraObj.addComponent(Camera3D)
// camera.perspective(60, Engine3D.aspect, 1, 5000.0)
// let controller = camera.object3D.addComponent(HoverCameraController)
// controller.setCamera(0, 0, 15)
// scene3D.addChild(scene3D.cameraObj as Object3D);
scene3D.addComponent(Stats);
// create light
let light: Object3D = new Object3D()
// add direct light component
let component: DirectLight = light.addComponent(DirectLight)
// adjust lighting
light.rotationX = 45
light.rotationY = 70
component.intensity = 100
// add light object
scene3D.addChild(light)
// create new object  
class ControllerUpdate extends ComponentBase {
  public onUpdate() {
      // update lifecycle codes
      scene3D.render()
      scene3D.screenSpaceCameraController.update()
      // updateViewMatrix(cesium_camera)
  }
}
scene3D.addComponent(ControllerUpdate);
const Sphere: Object3D = new Object3D()
// add MeshRenderer to the object
let mrs: MeshRenderer = Sphere.addComponent(MeshRenderer)
// set a box geometry
mrs.geometry = new SphereGeometry(6378137, 50, 50)
// set a pbr lit material
mrs.material = new LitMaterial();

let texture = await Engine3D.res.loadTexture('http://127.0.0.1:5173/earth.jpg');
mrs.material.baseMap = texture;
Sphere.transform.x = 0
Sphere.transform.y = 0
Sphere.transform.z = 0
Sphere.transform.rotationX += 180;

// Sphere.transform.rotationY += 90;
// Sphere.transform.rotationZ += 180;
// set location
const rencoll:Object3D = new Object3D();
rencoll.addChild(Sphere);

const urlTemplateImageryProvide = new UrlTemplateImageryProvider({
  // url: 'http://www.google.cn/maps/vt?lyrs=s@800&x={x}&y={y}&z={z}'
  // tilingScheme: new WebMercatorTilingScheme({}),
  // minimumLevel: 1,
  // maximumLevel: 20
  url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}'
});
scene3D.imageryLayers.addImageryProvider(
  urlTemplateImageryProvide
);
// scene3D.imageryLayers.addImageryProvider(new (TileCoordinatesImageryProvider as any)());

// scene3D.addChild(rencoll)
// create a object
const obj: Object3D = new Object3D()
// add MeshRenderer to the object
let mr: MeshRenderer = obj.addComponent(MeshRenderer)
// set a box geometry
mr.geometry = new BoxGeometry(5, 2, 3)
// set a pbr lit material
mr.material = new LitMaterial()
// set location and rotation
obj.localPosition = new Vector3(0, 0, 0)
obj.localRotation = new Vector3(0, 45, 0)
scene3D.addChild(obj)

// add an Atmospheric sky enviroment
scene3D.addComponent(AtmosphericComponent).sunY = 0.6
// create a view with target scene and camera
//@ts-ignore
let view =window.view = new View3D()
view.scene = scene3D
view.camera = scene3D.cameraObj._camera;
// start render
Engine3D.startRenderView(view)