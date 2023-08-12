import { LinearToneMapping, sRGBEncoding, Vector2, WebGLRenderer, WebGLRendererParameters } from 'three';

export interface RenderStateParameters extends WebGLRendererParameters{
    antialias?: true
}

const drawingBufferSize = new Vector2();

class MapRenderer extends WebGLRenderer {
    constructor (options?: WebGLRendererParameters) {
        super(options);

        // const { clientWidth, clientHeight } = container;

        // this.setSize(clientWidth, clientHeight);
        // this.setViewport(0, 0, clientWidth, clientHeight);
        this.autoClear = false;
        this.toneMapping = LinearToneMapping;
        this.toneMappingExposure = 1.0;
        this.outputEncoding = sRGBEncoding;

        this.setClearColor(0x128caa);

        // container.appendChild(this.domElement);
    }

    /**
     * 返回当前绘图缓冲区的尺寸
     *
     * @readonly
     * @type {Vector2}
     * @memberof MapRenderer
     */
    get drawingBufferSize (): Vector2 {
        return this.getDrawingBufferSize(drawingBufferSize);
    }
}

export { MapRenderer };
