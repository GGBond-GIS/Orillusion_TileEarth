import { MapRenderer } from '../Scene/MapRenderer';
import { cube } from '../Shader/CubeGlsl3Shader';
import { BackSide, BoxGeometry, cloneUniforms, Color, CubeUVReflectionMapping, FrontSide, Mesh, PlaneGeometry, ShaderLib, ShaderMaterial, WebGLState } from 'three';

console.log(cube);
class WebGLBackground {
    constructor (renderer: MapRenderer, cubemaps: any, state: WebGLState, objects: any, premultipliedAlpha: any) {
        const clearColor = new Color(0x000000);
        let clearAlpha = 0;

        let planeMesh: Mesh;
        let boxMesh: Mesh;

        let currentBackground: any = null;
        let currentBackgroundVersion = 0;
        let currentTonemapping: any = null;

        function render (renderList: any, scene: any) {
            let forceClear = false;
            let background = scene.isScene === true ? scene.background : null;

            if (background && background.isTexture) {
                background = cubemaps.get(background);
            }

            // Ignore background in AR
            // TODO: Reconsider this.

            const xr = renderer.xr;
            const session = xr.getSession && xr.getSession();

            if (session && session.environmentBlendMode === 'additive') {
                background = null;
            }

            if (background === null) {
                setClear(clearColor, clearAlpha);
            } else if (background && background.isColor) {
                setClear(background, 1);
                forceClear = true;
            }

            if (renderer.autoClear || forceClear) {
                renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
            }

            if (background && (background.isCubeTexture || background.mapping === CubeUVReflectionMapping)) {
                if (boxMesh === undefined) {
                    boxMesh = new Mesh(
                        new BoxGeometry(1, 1, 1),
                        new ShaderMaterial({
                            name: 'BackgroundCubeMaterial',
                            uniforms: {
                                envMap: { value: null },
                                flipEnvMap: { value: -1 },
                                ior: { value: 1.5 },
                                opacity: { value: 1 },
                                reflectivity: { value: 1 },
                                refractionRatio: { value: 0.98 }
                            },
                            vertexShader: ShaderLib.cube.vertexShader,
                            fragmentShader: ShaderLib.cube.fragmentShader,
                            side: BackSide,
                            depthTest: false,
                            depthWrite: false,
                            fog: false
                        })
                    );

                    boxMesh.geometry.deleteAttribute('normal');
                    boxMesh.geometry.deleteAttribute('uv');

                    boxMesh.onBeforeRender = function (renderer, scene, camera) {
                        this.matrixWorld.copyPosition(camera.matrixWorld);
                    };

                    // enable code injection for non-built-in material
                    Object.defineProperty(boxMesh.material, 'envMap', {

                        get: function () {
                            return this.uniforms.envMap.value;
                        }

                    });

                    objects.update(boxMesh);
                }

                (boxMesh.material as ShaderMaterial).uniforms.envMap.value = background;
                (boxMesh.material as ShaderMaterial).uniforms.flipEnvMap.value = (background.isCubeTexture && background.isRenderTargetTexture === false) ? -1 : 1;

                if (currentBackground !== background ||
                    currentBackgroundVersion !== background.version ||
                    currentTonemapping !== renderer.toneMapping) {
                    (boxMesh.material as ShaderMaterial).needsUpdate = true;

                    currentBackground = background;
                    currentBackgroundVersion = background.version;
                    currentTonemapping = renderer.toneMapping;
                }

                // push to the pre-sorted opaque render list
                renderList.unshift(boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null);
            } else if (background && background.isTexture) {
                if (planeMesh === undefined) {
                    planeMesh = new Mesh(
                        new PlaneGeometry(2, 2),
                        new ShaderMaterial({
                            name: 'BackgroundMaterial',
                            uniforms: cloneUniforms(ShaderLib.background.uniforms),
                            vertexShader: ShaderLib.background.vertexShader,
                            fragmentShader: ShaderLib.background.fragmentShader,
                            side: FrontSide,
                            depthTest: false,
                            depthWrite: false,
                            fog: false
                        })
                    );

                    planeMesh.geometry.deleteAttribute('normal');

                    // enable code injection for non-built-in material
                    Object.defineProperty(planeMesh.material, 'map', {

                        get: function () {
                            return this.uniforms.t2D.value;
                        }

                    });

                    objects.update(planeMesh);
                }

                (boxMesh.material as ShaderMaterial).uniforms.t2D.value = background;

                if (background.matrixAutoUpdate === true) {
                    background.updateMatrix();
                }

                (boxMesh.material as ShaderMaterial).uniforms.uvTransform.value.copy(background.matrix);

                if (currentBackground !== background ||
                    currentBackgroundVersion !== background.version ||
                    currentTonemapping !== renderer.toneMapping) {
                    (boxMesh.material as ShaderMaterial).needsUpdate = true;

                    currentBackground = background;
                    currentBackgroundVersion = background.version;
                    currentTonemapping = renderer.toneMapping;
                }

                // push to the pre-sorted opaque render list
                renderList.unshift(planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null);
            }
        }

        function setClear (color: any, alpha: any) {
            state.buffers.color.setClear(color.r, color.g, color.b, alpha, premultipliedAlpha);
        }

        return {

            getClearColor: function () {
                return clearColor;
            },
            setClearColor: function (color: any, alpha = 1) {
                clearColor.set(color);
                clearAlpha = alpha;
                setClear(clearColor, clearAlpha);
            },
            getClearAlpha: function () {
                return clearAlpha;
            },
            setClearAlpha: function (alpha: any) {
                clearAlpha = alpha;
                setClear(clearColor, clearAlpha);
            },
            render: render

        };
    }
}

export { WebGLBackground };
