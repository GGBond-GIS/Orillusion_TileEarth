import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { destroyObject } from '../Core/destroyObject';
import { DeveloperError } from '../Core/DeveloperError';
import { Event } from '../Core/Event';
import { FrameState } from './FrameState';
import { ImageryLayer } from './ImageryLayer';

class ImageryLayerCollection {
    _layers: any[];
    layerAdded: Event;
    layerRemoved: Event;
    layerMoved: Event;
    layerShownOrHidden: Event;

    constructor () {
        this._layers = [];

        /**
         * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
         * was added and the index at which it was added.
         * @type {Event}
         * @default Event()
         */
        this.layerAdded = new Event();

        /**
         * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
         * was removed and the index from which it was removed.
         * @type {Event}
         * @default Event()
         */
        this.layerRemoved = new Event();

        /**
         * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
         * was moved, its new index after the move, and its old index prior to the move.
         * @type {Event}
         * @default Event()
         */
        this.layerMoved = new Event();

        /**
         * An event that is raised when a layer is shown or hidden by setting the
         * {@link ImageryLayer#show} property.  Event handlers are passed a reference to this layer,
         * the index of the layer in the collection, and a flag that is true if the layer is now
         * shown or false if it is now hidden.
         *
         * @type {Event}
         * @default Event()
         */
        this.layerShownOrHidden = new Event();
    }

    /**
   * Gets the number of layers in this collection.
   * @memberof ImageryLayerCollection.prototype
   * @type {Number}
   */
    get length (): number {
        return this._layers.length;
    }

    /**
 * Adds a layer to the collection.
 *
 * @param {ImageryLayer} layer the layer to add.
 * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
 *                         be added on top of all existing layers.
 *
 * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
 */
    add (layer: ImageryLayer, index?: number): void {
        const hasIndex = defined(index);

        // >>includeStart('debug', pragmas.debug);
        if (!defined(layer)) {
            throw new DeveloperError('layer is required.');
        }
        if (hasIndex) {
            if ((index as number) < 0) {
                throw new DeveloperError('index must be greater than or equal to zero.');
            } else if ((index as number) > this._layers.length) {
                throw new DeveloperError(
                    'index must be less than or equal to the number of layers.'
                );
            }
        }
        // >>includeEnd('debug');

        if (!hasIndex) {
            index = this._layers.length;
            this._layers.push(layer);
        } else {
            this._layers.splice((index as number), 0, layer);
        }

        this._update();
        this.layerAdded.raiseEvent(layer, index);
    }

    /**
   * Creates a new layer using the given ImageryProvider and adds it to the collection.
   *
   * @param {ImageryProvider} imageryProvider the imagery provider to create a new layer for.
   * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
   *                         added on top of all existing layers.
   * @returns {ImageryLayer} The newly created layer.
   */
    addImageryProvider (
        imageryProvider: any,
        index?: number
    ): ImageryLayer {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(imageryProvider)) {
            throw new DeveloperError('imageryProvider is required.');
        }
        // >>includeEnd('debug');

        const layer = new ImageryLayer(imageryProvider, {});
        this.add(layer, index);
        return layer;
    }

    /**
   * Removes a layer from this collection, if present.
   *
   * @param {ImageryLayer} layer The layer to remove.
   * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
   * @returns {Boolean} true if the layer was in the collection and was removed,
   *                    false if the layer was not in the collection.
   */
    remove (layer: ImageryLayer, destroy = true): boolean {
        destroy = defaultValue(destroy, true);

        const index = this._layers.indexOf(layer);
        if (index !== -1) {
            this._layers.splice(index, 1);

            this._update();

            this.layerRemoved.raiseEvent(layer, index);

            if (destroy) {
                layer.destroy();
            }

            return true;
        }

        return false;
    }

    /**
   * Removes all layers from this collection.
   *
   * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
   */
    removeAll (destroy = true): void {
        destroy = defaultValue(destroy, true);

        const layers = this._layers;
        for (let i = 0, len = layers.length; i < len; i++) {
            const layer = layers[i];
            this.layerRemoved.raiseEvent(layer, i);

            if (destroy) {
                layer.destroy();
            }
        }

        this._layers = [];
    }

    /**
   * Checks to see if the collection contains a given layer.
   *
   * @param {ImageryLayer} layer the layer to check for.
   *
   * @returns {Boolean} true if the collection contains the layer, false otherwise.
   */
    contains (layer: ImageryLayer): boolean {
        return this.indexOf(layer) !== -1;
    }

    /**
   * Determines the index of a given layer in the collection.
   *
   * @param {ImageryLayer} layer The layer to find the index of.
   *
   * @returns {Number} The index of the layer in the collection, or -1 if the layer does not exist in the collection.
   */
    indexOf (layer:ImageryLayer): number {
        return this._layers.indexOf(layer);
    }

    /**
   * Gets a layer by index from the collection.
   *
   * @param {Number} index the index to retrieve.
   *
   * @returns {ImageryLayer} The imagery layer at the given index.
   */
    get (index: number): ImageryLayer {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        // >>includeEnd('debug');

        return this._layers[index];
    }

    /**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} true if this object was destroyed; otherwise, false.
 *
 * @see ImageryLayerCollection#destroy
 */
    isDestroyed (): boolean {
        return false;
    }

    /**
   * Destroys the WebGL resources held by all layers in this collection.  Explicitly destroying this
   * object allows for deterministic release of WebGL resources, instead of relying on the garbage
   * collector.
   * <br /><br />
   * Once this object is destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
   * assign the return value (<code>undefined</code>) to the object as done in the example.
   *
   * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
   *
   *
   * @example
   * layerCollection = layerCollection && layerCollection.destroy();
   *
   * @see ImageryLayerCollection#isDestroyed
   */
    destroy () {
        this.removeAll(true);
        return destroyObject(this);
    }

    _update (): void {
        let isBaseLayer = true;
        const layers = this._layers;
        let layersShownOrHidden: [] | undefined;
        let layer;
        let i, len;
        for (i = 0, len = layers.length; i < len; ++i) {
            layer = layers[i];

            layer._layerIndex = i;

            if (layer.show) {
                layer._isBaseLayer = isBaseLayer;
                isBaseLayer = false;
            } else {
                layer._isBaseLayer = false;
            }

            if (layer.show !== layer._show) {
                if (defined(layer._show)) {
                    if (!defined(layersShownOrHidden)) {
                        layersShownOrHidden = [];
                    }
                    (layersShownOrHidden as ImageryLayer[]).push(layer);
                }
                layer._show = layer.show;
            }
        }

        if (defined(layersShownOrHidden)) {
            for (i = 0, len = (layersShownOrHidden as ImageryLayer[]).length; i < len; ++i) {
                layer = (layersShownOrHidden as ImageryLayer[])[i];
                this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
            }
        }
    }

    /**
     * Updates frame state to execute any queued texture re-projections.
     *
     * @private
     *
     * @param {FrameState} frameState The frameState.
     */
    queueReprojectionCommands (frameState: FrameState): void {
        const layers = this._layers;
        for (let i = 0, len = layers.length; i < len; ++i) {
            layers[i].queueReprojectionCommands(frameState);
        }
    }

    /**
     * Cancels re-projection commands queued for the next frame.
     *
     * @private
     */
    cancelReprojections (): void {
        const layers = this._layers;
        for (let i = 0, len = layers.length; i < len; ++i) {
            layers[i].cancelReprojections();
        }
    }
}

export { ImageryLayerCollection };
