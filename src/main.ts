import { Engine3D, Scene3D, Object3D, Camera3D, LitMaterial, BoxGeometry, MeshRenderer, DirectLight, HoverCameraController, Color, Vector3, AtmosphericComponent, View3D, ComponentBase, SphereGeometry, InstanceDrawComponent, TAAPost, PostProcessingComponent, Matrix4 } from '@orillusion/core'
import { CesiumScene } from './ori_map/Scene/CesiumScene'
import { Stats } from "@orillusion/stats"
import { UrlTemplateImageryProvider } from './ori_map/Scene/UrlTemplateImageryProvider';
import { TileCoordinatesImageryProvider } from './ori_map/Scene/TileCoordinatesImageryProvider';
import { WebMapTileServiceImageryProvider } from './ori_map/Scene/WebMapTileServiceImageryProvider';
import { GeographicTilingScheme } from './ori_map/Core/GeographicTilingScheme';
// 引擎全局配置设置
//@ts-ignore
Engine3D.setting.render.postProcessing.taa.jitterSeedCount = 8;
//@ts-ignore
Engine3D.setting.render.postProcessing.taa.blendFactor = 0.1;
//@ts-ignore
Engine3D.setting.render.postProcessing.taa.sharpFactor = 0.6;
//@ts-ignore
Engine3D.setting.render.postProcessing.taa.sharpPreBlurFactor = 0.5;
//@ts-ignore
Engine3D.setting.render.postProcessing.taa.temporalJitterScale = 0.6;


Engine3D.setting.shadow.shadowSize = 2048
Engine3D.setting.shadow.shadowBound = 1000;
Engine3D.setting.shadow.shadowBias = 0.0005;


await Engine3D.init({canvasConfig:{

  devicePixelRatio: 1 // 渲染 DPR, 默认使用 window.devicePixelRatio
}});
//@ts-ignore
window.mat = new Matrix4();
//@ts-ignore
window.vm = new Matrix4();
//@ts-ignore

window.scaleAndBias = new Matrix4();


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
  }
}
scene3D._renderCollection.addComponent(InstanceDrawComponent);

scene3D.addComponent(ControllerUpdate);
const Sphere: Object3D = new Object3D()
// add MeshRenderer to the object
let mrs: MeshRenderer = Sphere.addComponent(MeshRenderer)
// set a box geometry
mrs.geometry = new SphereGeometry(6378137, 50, 50)
// set a pbr lit material
mrs.material = new LitMaterial();

// let texture = await Engine3D.res.loadTexture('http://127.0.0.1:5173/earth.jpg');
// mrs.material.baseMap = texture;
Sphere.transform.x = 0
Sphere.transform.y = 0
Sphere.transform.z = 0
Sphere.transform.rotationX += 180;

// Sphere.transform.rotationY += 90;
// Sphere.transform.rotationZ += 180;
// set location
const rencoll: Object3D = new Object3D();
rencoll.addChild(Sphere);

// const urlTemplateImageryProvide = new UrlTemplateImageryProvider({
//   // url: 'http://www.google.cn/maps/vt?lyrs=s@800&x={x}&y={y}&z={z}'
//   // tilingScheme: new WebMercatorTilingScheme({}),
//   // minimumLevel: 1,
//   // maximumLevel: 20
//   url: 'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}'
// });
// scene3D.imageryLayers.addImageryProvider(
//   urlTemplateImageryProvide
// );
const mapToken = '39d358c825ec7e59142958656c0a6864';// 盈嘉企业开发者秘钥

//https://t4.tianditu.gov.cn/img_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=75f0434f240669f4a2df6359275146d2
scene3D.imageryLayers.addImageryProvider(new WebMapTileServiceImageryProvider({
  // url: 'https://{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&tk=' + mapToken,
  url: 'https://t4.tianditu.gov.cn/img_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=' + mapToken,
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
  maximumLevel: 17, // 定义最大缩放级别
  layer: 'tdtImgLayer',
  style: 'default',
  format: 'image/jpeg',
  tilingScheme: new GeographicTilingScheme({
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 1
  }),
  tileMatrixSetID: "EPSG:4326", // 使用谷歌的瓦片切片方式
}));
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
let view = window.view = new View3D()
view.scene = scene3D
view.camera = scene3D.cameraObj._camera;
// start render
Engine3D.startRenderView(view);







// 添加后处理组件
let postProcessing = scene3D.addComponent(PostProcessingComponent);

// // 添加TAAPost
// let taaPost = postProcessing.addPost(TAAPost);

// // 通过 taaPost 对象设置（引擎全局配置和此处基于 taaPost 对象设置，结果是等价的）
// taaPost.jitterSeedCount = 8;
// taaPost.blendFactor = 0.1;
// taaPost.sharpFactor = 0.6;
// taaPost.sharpPreBlurFactor = 0.5;
// taaPost.temporalJitterScale = 0.6;