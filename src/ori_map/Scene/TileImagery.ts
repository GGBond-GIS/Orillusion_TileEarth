/* eslint-disable no-mixed-operators */

import { defined } from '../Core/defined';
import { Vector4 } from 'three';
import { Cartesian4 } from './../Core/Cartesian4';

import { FrameState } from './FrameState';
import { Imagery } from './Imagery';
import { ImageryState } from './ImageryState';
import { QuadtreeTile } from './QuadtreeTile';

class TileImagery {
    readyImagery: Imagery | undefined;
    loadingImagery: Imagery | undefined;
    textureCoordinateRectangle: Cartesian4 | undefined;
    textureTranslationAndScale: Cartesian4 | undefined;
    useWebMercatorT: boolean | undefined;

    _textureCoordinateRectangle_vector4 = new Vector4();
    _textureTranslationAndScale_vector4 = new Vector4();
    constructor (imagery:Imagery, textureCoordinateRectangle?: Cartesian4, useWebMercatorT?: boolean) {
        this.readyImagery = undefined;
        this.loadingImagery = imagery;
        this.textureCoordinateRectangle = textureCoordinateRectangle;

        this.textureTranslationAndScale = undefined;
        this.useWebMercatorT = useWebMercatorT;
    }

    get textureCoordinateRectangle_vector4 (): Vector4 {
        const textureCoordinateRectangle = this.textureCoordinateRectangle as Cartesian4;
        this._textureCoordinateRectangle_vector4.set(
            textureCoordinateRectangle.x,
            textureCoordinateRectangle.y,
            textureCoordinateRectangle.z,
            textureCoordinateRectangle.w
        );

        return this._textureCoordinateRectangle_vector4;
    }

    get textureTranslationAndScale_vector4 (): Vector4 {
        const textureTranslationAndScale = this.textureTranslationAndScale as Cartesian4;
        this._textureTranslationAndScale_vector4.set(
            textureTranslationAndScale.x,
            textureTranslationAndScale.y,
            textureTranslationAndScale.z,
            textureTranslationAndScale.w
        );

        return this._textureTranslationAndScale_vector4;
    }

    /**
     * Frees the resources held by this instance.
     */
    freeResources (): void {
        if (defined(this.readyImagery)) {
            (this.readyImagery as Imagery).releaseReference();
        }

        if (defined(this.loadingImagery)) {
            (this.loadingImagery as Imagery).releaseReference();
        }
    }

    /**
 * Processes the load state machine for this instance.
 *
 * @param {Tile} tile The tile to which this instance belongs.
 * @param {FrameState} frameState The frameState.
 * @param {Boolean} skipLoading True to skip loading, e.g. new requests, creating textures. This function will
 *                  still synchronously process imagery that's already mostly ready to go, e.g. use textures
 *                  already loaded on ancestor tiles.
 * @returns {Boolean} True if this instance is done loading; otherwise, false.
 */
    processStateMachine (
        tile: QuadtreeTile,
        frameState: FrameState,
        skipLoading?: boolean |undefined
    ): boolean {
        const loadingImagery = this.loadingImagery as Imagery;
        const imageryLayer = loadingImagery.imageryLayer;

        loadingImagery.processStateMachine(
            frameState,
            !this.useWebMercatorT,
            skipLoading
        );

        if (loadingImagery.state === ImageryState.READY) {
            if (defined(this.readyImagery)) {
                (this.readyImagery as Imagery).releaseReference();
            }
            this.readyImagery = this.loadingImagery;
            this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(
                tile,
                this
            );
            // return true; // done loading
        }

        // Find some ancestor imagery we can use while this imagery is still loading.
        let ancestor = loadingImagery.parent;
        let closestAncestorThatNeedsLoading;
        while (
            defined(ancestor) &&
            (ancestor.state !== ImageryState.READY ||
            (!this.useWebMercatorT && !defined(ancestor.texture)))
        ) {
            if (
                ancestor.state !== ImageryState.FAILED &&
                ancestor.state !== ImageryState.INVALID
            ) {
                // ancestor is still loading
                closestAncestorThatNeedsLoading = closestAncestorThatNeedsLoading || ancestor;
            }
            ancestor = ancestor.parent;
        }

        if (this.readyImagery !== ancestor) {
            if (defined(this.readyImagery)) {
                (this.readyImagery as Imagery).releaseReference();
            }

            this.readyImagery = ancestor;

            if (defined(ancestor)) {
                ancestor.addReference();
                this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(
                    tile,
                    this
                );
            }
        }

        if (
            loadingImagery.state === ImageryState.FAILED ||
            loadingImagery.state === ImageryState.INVALID
        ) {
            // The imagery tile is failed or invalid, so we'd like to use an ancestor instead.
            if (defined(closestAncestorThatNeedsLoading)) {
                // Push the ancestor's load process along a bit.  This is necessary because some ancestor imagery
                // tiles may not be attached directly to a terrain tile.  Such tiles will never load if
                // we don't do it here.
                closestAncestorThatNeedsLoading.processStateMachine(
                    frameState,
                    !this.useWebMercatorT,
                    skipLoading
                );
                return false; // not done loading
            }
            // This imagery tile is failed or invalid, and we have the "best available" substitute.
            return true; // done loading
        }

        return false; // not done loading
    }
}

export { TileImagery };
