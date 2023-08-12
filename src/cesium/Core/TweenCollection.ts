
import * as TweenJS from '@tweenjs/tween.js';
import { clone } from './clone';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';
import { EasingFunction } from './EasingFunction';
import { getTimestamp } from './getTimestamp';
import { TimeConstants } from './TimeConstants';

/**
 * A tween is an animation that interpolates the properties of two objects using an {@link EasingFunction}.  Create
 * one using {@link Scene#tweens} and {@link TweenCollection#add} and related add functions.
 *
 * @alias Tween
 * @constructor
 *
 * @private
 */

class Tween {
    _tweens: any;
    _tweenjs: any;
    _startObject: any;
    _stopObject: any;
    _duration: number | undefined;
    _delay: number | undefined;
    _easingFunction: any;
    _update: any;
    _complete: any;
    cancel: any;
    needsStart: boolean;
    constructor (tweens: any, tweenjs?: any, startObject?: any, stopObject?: any, duration?: number, delay?: number, easingFunction?: any, update?: any, complete?: any, cancel?: any) {
        this._tweens = tweens;
        this._tweenjs = tweenjs;

        this._startObject = clone(startObject);
        this._stopObject = clone(stopObject);

        this._duration = duration;
        this._delay = delay;
        this._easingFunction = easingFunction;

        this._update = update;
        this._complete = complete;

        /**
         * The callback to call if the tween is canceled either because {@link Tween#cancelTween}
         * was called or because the tween was removed from the collection.
         *
         * @type {TweenCollection.TweenCancelledCallback}
         */
        this.cancel = cancel;

        /**
         * @private
         */
        this.needsStart = true;
    }

    get startObject () {
        return this._startObject;
    }

    get stopObject () {
        return this._stopObject;
    }

    get duration () {
        return this._duration;
    }

    get delay () {
        return this._delay;
    }

    get easingFunction () {
        return this._easingFunction;
    }

    get update () {
        return this._update;
    }

    get complete () {
        return this._complete;
    }

    get tweenjs () {
        return this._tweenjs;
    }

    /**
     * Cancels the tween calling the {@link Tween#cancel} callback if one exists.  This
     * has no effect if the tween finished or was already canceled.
     */
    cancelTween ():void {
        this._tweens.remove(this);
    }
}

export { Tween };

class TweenCollection {
    _tweens: any[];
    constructor () {
        this._tweens = [];
    }

    /**
     * The number of tweens in the collection.
     * @memberof TweenCollection.prototype
     *
     * @type {Number}
     * @readonly
     */
    get length (): number {
        return this._tweens.length;
    }

    /**
     * Creates a tween for animating between two sets of properties.  The tween starts animating at the next call to {@link TweenCollection#update}, which
     * is implicit when {@link Viewer} or {@link CesiumWidget} render the scene.
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Object} options.startObject An object with properties for initial values of the tween.  The properties of this object are changed during the tween's animation.
     * @param {Object} options.stopObject An object with properties for the final values of the tween.
     * @param {Number} options.duration The duration, in seconds, for the tween.  The tween is automatically removed from the collection when it stops.
     * @param {Number} [options.delay=0.0] The delay, in seconds, before the tween starts animating.
     * @param {EasingFunction} [options.easingFunction=EasingFunction.LINEAR_NONE] Determines the curve for animtion.
     * @param {TweenCollection.TweenUpdateCallback} [options.update] The callback to call at each animation update (usually tied to the a rendered frame).
     * @param {TweenCollection.TweenCompleteCallback} [options.complete] The callback to call when the tween finishes animating.
     * @param {TweenCollection.TweenCancelledCallback} [options.cancel] The callback to call if the tween is canceled either because {@link Tween#cancelTween} was called or because the tween was removed from the collection.
     * @returns {Tween} The tween.
     *
     * @exception {DeveloperError} options.duration must be positive.
     */
    add (options: {
        startObject?: unknown,
        stopObject?: { [name: string]: any },
        duration?: number,
        delay?: number,
        easingFunction?: number,
        update?:any,
        complete?: any,
        cancel?:any
        _repeat?: number
    }):Tween {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        // >>includeStart('debug', pragmas.debug);
        if (!defined(options.startObject) || !defined(options.stopObject)) {
            throw new DeveloperError(
                'options.startObject and options.stopObject are required.'
            );
        }

        if (!defined(options.duration) || (options.duration as number) < 0.0) {
            throw new DeveloperError(
                'options.duration is required and must be positive.'
            );
        }
        // >>includeEnd('debug');

        if (options.duration === 0.0) {
            if (defined(options.complete)) {
                options.complete();
            }
            return new Tween(this);
        }

        const duration = (options.duration as number) / TimeConstants.SECONDS_PER_MILLISECOND;
        const delayInSeconds = defaultValue(options.delay, 0.0) as number;
        const delay = delayInSeconds / TimeConstants.SECONDS_PER_MILLISECOND;
        const easingFunction = defaultValue(
            options.easingFunction,
            (EasingFunction.LINEAR_NONE as unknown)
        ) as any;

        const value:any = options.startObject;
        const tweenjs = new TweenJS.Tween(value);
        tweenjs.to(clone(options.stopObject), duration);
        tweenjs.delay(delay);
        tweenjs.easing(easingFunction);
        if (defined(options.update)) {
            tweenjs.onUpdate(function () {
                options.update(value);
            });
        }
        tweenjs.onComplete(defaultValue(options.complete, null));
        tweenjs.repeat(defaultValue(options._repeat, 0.0) as number);

        const tween = new Tween(
            this,
            tweenjs,
            options.startObject,
            options.stopObject,
            options.duration,
            delayInSeconds,
            easingFunction,
            options.update,
            options.complete,
            options.cancel
        );
        this._tweens.push(tween);
        return tween;
    }

    /**
   * Removes a tween from the collection.
   * <p>
   * This calls the {@link Tween#cancel} callback if the tween has one.
   * </p>
   *
   * @param {Tween} tween The tween to remove.
   * @returns {Boolean} <code>true</code> if the tween was removed; <code>false</code> if the tween was not found in the collection.
   */
    remove (tween: Tween):boolean {
        if (!defined(tween)) {
            return false;
        }

        const index = this._tweens.indexOf(tween);
        if (index !== -1) {
            tween.tweenjs.stop();
            if (defined(tween.cancel)) {
                tween.cancel();
            }
            this._tweens.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
   * Removes all tweens from the collection.
   * <p>
   * This calls the {@link Tween#cancel} callback for each tween that has one.
   * </p>
   */
    removeAll ():void {
        const tweens = this._tweens;

        for (let i = 0; i < tweens.length; ++i) {
            const tween = tweens[i];
            tween.tweenjs.stop();
            if (defined(tween.cancel)) {
                tween.cancel();
            }
        }
        tweens.length = 0;
    }

    /**
   * Determines whether this collection contains a given tween.
   *
   * @param {Tween} tween The tween to check for.
   * @returns {Boolean} <code>true</code> if this collection contains the tween, <code>false</code> otherwise.
   */
    contains (tween:Tween):boolean {
        return defined(tween) && this._tweens.indexOf(tween) !== -1;
    }

    /**
   * Returns the tween in the collection at the specified index.  Indices are zero-based
   * and increase as tweens are added.  Removing a tween shifts all tweens after
   * it to the left, changing their indices.  This function is commonly used to iterate over
   * all the tween in the collection.
   *
   * @param {Number} index The zero-based index of the tween.
   * @returns {Tween} The tween at the specified index.
   *
   * @example
   * // Output the duration of all the tweens in the collection.
   * var tweens = scene.tweens;
   * var length = tweens.length;
   * for (var i = 0; i < length; ++i) {
   *   console.log(tweens.get(i).duration);
   * }
   */
    get (index: number): any {
        return this._tweens[index];
    }

    /**
   * Updates the tweens in the collection to be at the provide time.  When a tween finishes, it is removed
   * from the collection.
   *
   * @param {Number} [time=getTimestamp()] The time in seconds.  By default tweens are synced to the system clock.
   */
    update (time?: number):void {
        const tweens = this._tweens;

        let i = 0;
        time = defined(time)
            ? (time as number) / TimeConstants.SECONDS_PER_MILLISECOND
            : getTimestamp();
        while (i < tweens.length) {
            const tween = tweens[i];
            const tweenjs = tween.tweenjs;

            if (tween.needsStart) {
                tween.needsStart = false;
                tweenjs.start(time);
            } else if (tweenjs.update(time)) {
                i++;
            } else {
                tweenjs.stop();
                tweens.splice(i, 1);
            }
        }
    }

    /**
   * A function that will execute when a tween completes.
   * @callback TweenCollection.TweenCompleteCallback
   */

    /**
   * A function that will execute when a tween updates.
   * @callback TweenCollection.TweenUpdateCallback
   */

    /**
   * A function that will execute when a tween is cancelled.
   * @callback TweenCollection.TweenCancelledCallback
   */
}

export { TweenCollection };
