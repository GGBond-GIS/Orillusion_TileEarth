import { defined } from '../Core/defined';
import { destroyObject } from '../Core/destroyObject';
import { Rectangle } from '../Core/Rectangle';
import { FrameState } from './FrameState';
import { ImageryLayer } from './ImageryLayer';
import { ImageryState } from './ImageryState';

class Imagery {
    state: ImageryState;
    imageryLayer: ImageryLayer;
    x: number;
    y: number;
    level: number;
    request: any;
    rectangle: Rectangle;
    referenceCount: number;
    imageUrl: any;
    image: any;
    texture: any;
    textureWebMercator: any;
    credits: any;
    parent: any;
    constructor (imageryLayer:ImageryLayer, x: number, y: number, level: number, rectangle?:Rectangle) {
        this.imageryLayer = imageryLayer;
        this.x = x;
        this.y = y;
        this.level = level;
        this.request = undefined;

        if (level !== 0) {
            const parentX = x / 2 | 0;
            const parentY = y / 2 | 0;
            const parentLevel = level - 1;
            this.parent = imageryLayer.getImageryFromCache(parentX, parentY, parentLevel);
        }

        this.state = ImageryState.UNLOADED;
        this.imageUrl = undefined;
        this.image = undefined;
        this.texture = undefined;
        this.textureWebMercator = undefined;
        this.credits = undefined;
        this.referenceCount = 0;

        if (!defined(rectangle) && imageryLayer.imageryProvider.ready) {
            const tilingScheme = imageryLayer.imageryProvider.tilingScheme;
            rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        }

        this.rectangle = (rectangle as Rectangle);
    }

    static createPlaceholder (imageryLayer:ImageryLayer):Imagery {
        const result = new Imagery(imageryLayer, 0, 0, 0);
        result.addReference();
        result.state = ImageryState.PLACEHOLDER;
        return result;
    }

    addReference (): void {
        ++this.referenceCount;
    }

    releaseReference (): number {
        --this.referenceCount;

        if (this.referenceCount === 0) {
            this.imageryLayer.removeImageryFromCache(this);

            if (defined(this.parent)) {
                this.parent.releaseReference();
            }

            if (defined(this.image) && defined(this.image.destroy)) {
                this.image.destroy();
            }

            if (defined(this.texture)) {
                this.texture.dispose();
                this.texture = null;
            }

            if (defined(this.textureWebMercator) && this.texture !== this.textureWebMercator) {
                this.textureWebMercator.dispose();
                this.textureWebMercator = null;
            }

            destroyObject(this);

            return 0;
        }

        return this.referenceCount;
    }

    processStateMachine (frameState:FrameState, needGeographicProjection:boolean, skipLoading:any): void {
        if (this.state === ImageryState.UNLOADED && !skipLoading) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._requestImagery(this);
        }

        if (this.state === ImageryState.RECEIVED) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._createTexture(frameState.context, this);
        }

        // If the imagery is already ready, but we need a geographic version and don't have it yet,
        // we still need to do the reprojection step. This can happen if the Web Mercator version
        // is fine initially, but the geographic one is needed later.
        const needsReprojection =
            this.state === ImageryState.READY &&
            needGeographicProjection &&
            !this.texture;

        if (this.state === ImageryState.TEXTURE_LOADED || needsReprojection) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._reprojectTexture(
                frameState,
                this,
                needGeographicProjection
            );
        }
    }
}

export { Imagery };
