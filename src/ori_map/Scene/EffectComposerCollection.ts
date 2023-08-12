// import { RGBShiftMaterial } from '../Material/Pass/RGBShiftMaterial';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
// import { Scene } from './CesiumScene';

class EffectComposerCollection {
    // readonly scene: Scene;
    // mainEffectComposer: EffectComposer;
    // constructor (scene: Scene) {
    //     this.scene = scene;
    //     const renderer = scene.renderer;
    //     this.mainEffectComposer = new EffectComposer(renderer, scene.context.sceneFrameBuffer as any);

    //     const renderPass: RenderPass = new RenderPass(scene, scene.activeCamera);
    //     this.mainEffectComposer.addPass(renderPass);

    //     const effect2 = new ShaderPass(new RGBShiftMaterial());
    //     effect2.uniforms.amount.value = 0.0015;
    //     // this.mainEffectComposer.addPass(effect2);
    // }

    // setSize (container: Element): void {
    //     this.mainEffectComposer.setSize(container.clientWidth, container.clientHeight);
    // }

    // render (): void {
    //     this.mainEffectComposer.render();
    // }
}

export { EffectComposerCollection };
