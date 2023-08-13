import { ClusterLightingBuffer, Engine3D, Matrix4, MeshRenderer, RendererPassState, RendererType, UniformGPUBuffer, Vector3, View3D } from "@orillusion/core";

export class TileMaterialMeshRenderer extends MeshRenderer {

    protected mVPMatrix_64: UniformGPUBuffer;

    constructor() {
        super();
        this.mVPMatrix_64 = new UniformGPUBuffer(96);
    }

    private cameraPos: Vector3 = new Vector3();
    private cameraPos_h: Vector3 = new Vector3();
    private cameraPos_l: Vector3 = new Vector3();
    private matrixMVP_RTE: Matrix4 = new Matrix4();
    public onUpdate(view: View3D) {

             
        this.mVPMatrix_64.setMatrix('matrixMVP_RTE', this.matrixMVP_RTE);
        this.mVPMatrix_64.apply();
    }
    public onCompute(view: View3D): void {
     console.log(11111111111,view)
    }

    public nodeUpdate(view: View3D, passType: RendererType, renderPassState: RendererPassState, clusterLightingBuffer: ClusterLightingBuffer) {

        for (let i = 0; i < this.materials.length; i++) {
            const material = this.materials[i];
            let passes = material.renderPasses.get(passType);
            if (passes) for (let i = 0; i < passes.length; i++) {
                const renderShader = passes[i].renderShader;
                if (!renderShader.pipeline) {
                    renderShader.setUniformBuffer('args', this.mVPMatrix_64);
                }
            }
        }
        super.nodeUpdate(view, passType, renderPassState, clusterLightingBuffer);
    }
}
