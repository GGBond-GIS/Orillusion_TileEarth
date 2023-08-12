import { CameraEventType } from '../Core/CameraEventType';
import { Cartesian2 } from '../Core/Cartesian2';
import { CesiumMath } from '../Core/CesiumMath';
import { defined } from '../Core/defined';
import { destroyObject } from '../Core/destroyObject';
import { DeveloperError } from '../Core/DeveloperError';
import { KeyboardEventModifier } from '../Core/KeyboardEventModifier';
import { ScreenSpaceEventHandler } from '../Core/ScreenSpaceEventHandler';
import { ScreenSpaceEventType } from '../Core/ScreenSpaceEventType';

function getKey (type: number | string, modifier?: number | undefined) {
    let key = type.toString();
    if (defined(modifier)) {
        key += '+' + modifier;
    }
    return key;
}

interface PinchMovementInterface {
    distance: {
        startPosition: Cartesian2,
        endPosition: Cartesian2
    },
    angleAndHeight: {
        startPosition: Cartesian2,
        endPosition:Cartesian2
    }
}

function clonePinchMovement (pinchMovement: PinchMovementInterface, result: PinchMovementInterface) {
    Cartesian2.clone(
        pinchMovement.distance.startPosition,
        result.distance.startPosition
    );
    Cartesian2.clone(
        pinchMovement.distance.endPosition,
        result.distance.endPosition
    );

    Cartesian2.clone(
        pinchMovement.angleAndHeight.startPosition,
        result.angleAndHeight.startPosition
    );
    Cartesian2.clone(
        pinchMovement.angleAndHeight.endPosition,
        result.angleAndHeight.endPosition
    );
}

function listenToPinch (aggregator: any, modifier: number | undefined, canvas:HTMLCanvasElement) {
    const key = getKey(CameraEventType.PINCH, modifier);

    const update = aggregator._update;
    const isDown = aggregator._isDown;
    const eventStartPosition = aggregator._eventStartPosition;
    const pressTime = aggregator._pressTime;
    const releaseTime = aggregator._releaseTime;

    update[key] = true;
    isDown[key] = false;
    eventStartPosition[key] = new Cartesian2();

    let movement = aggregator._movement[key];
    if (!defined(movement)) {
        movement = aggregator._movement[key] = {};
    }

    movement.distance = {
        startPosition: new Cartesian2(),
        endPosition: new Cartesian2()
    };
    movement.angleAndHeight = {
        startPosition: new Cartesian2(),
        endPosition: new Cartesian2()
    };
    movement.prevAngle = 0.0;

    aggregator._eventHandler.setInputAction(
        function (event: any) {
            aggregator._buttonsDown++;
            isDown[key] = true;
            pressTime[key] = new Date();
            // Compute center position and store as start point.
            Cartesian2.lerp(
                event.position1,
                event.position2,
                0.5,
                eventStartPosition[key]
            );
        },
        ScreenSpaceEventType.PINCH_START,
        modifier
    );

    aggregator._eventHandler.setInputAction(
        function () {
            aggregator._buttonsDown = Math.max(aggregator._buttonsDown - 1, 0);
            isDown[key] = false;
            releaseTime[key] = new Date();
        },
        ScreenSpaceEventType.PINCH_END,
        modifier
    );

    aggregator._eventHandler.setInputAction(
        function (mouseMovement: PinchMovementInterface) {
            if (isDown[key]) {
                // Aggregate several input events into a single animation frame.
                if (!update[key]) {
                    Cartesian2.clone(
                        mouseMovement.distance.endPosition,
                        movement.distance.endPosition
                    );
                    Cartesian2.clone(
                        mouseMovement.angleAndHeight.endPosition,
                        movement.angleAndHeight.endPosition
                    );
                } else {
                    clonePinchMovement(mouseMovement, movement);
                    update[key] = false;
                    movement.prevAngle = movement.angleAndHeight.startPosition.x;
                }
                // Make sure our aggregation of angles does not "flip" over 360 degrees.
                let angle = movement.angleAndHeight.endPosition.x;
                const prevAngle = movement.prevAngle;
                const TwoPI = Math.PI * 2;
                while (angle >= prevAngle + Math.PI) {
                    angle -= TwoPI;
                }
                while (angle < prevAngle - Math.PI) {
                    angle += TwoPI;
                }
                movement.angleAndHeight.endPosition.x =
          (-angle * canvas.clientWidth) / 12;
                movement.angleAndHeight.startPosition.x =
          (-prevAngle * canvas.clientWidth) / 12;
            }
        },
        ScreenSpaceEventType.PINCH_MOVE,
        modifier
    );
}

function listenToWheel (aggregator: any, modifier: number | undefined) {
    const key = getKey(CameraEventType.WHEEL, modifier);

    const update = aggregator._update;
    update[key] = true;

    let movement = aggregator._movement[key];
    if (!defined(movement)) {
        movement = aggregator._movement[key] = {};
    }

    movement.startPosition = new Cartesian2();
    movement.endPosition = new Cartesian2();

    aggregator._eventHandler.setInputAction(
        function (delta: number) {
            // TODO: magic numbers
            const arcLength = 15.0 * CesiumMath.toRadians(delta);
            if (!update[key]) {
                movement.endPosition.y = movement.endPosition.y + arcLength;
            } else {
                Cartesian2.clone(Cartesian2.ZERO, movement.startPosition);
                movement.endPosition.x = 0.0;
                movement.endPosition.y = arcLength;
                update[key] = false;
            }
        },
        ScreenSpaceEventType.WHEEL,
        modifier
    );
}

function listenMouseButtonDownUp (aggregator: any, modifier: number | undefined, type: number) {
    const key = getKey(type, modifier);

    const isDown = aggregator._isDown;
    const eventStartPosition = aggregator._eventStartPosition;
    const pressTime = aggregator._pressTime;
    const releaseTime = aggregator._releaseTime;

    isDown[key] = false;
    eventStartPosition[key] = new Cartesian2();

    let lastMovement = aggregator._lastMovement[key];
    if (!defined(lastMovement)) {
        lastMovement = aggregator._lastMovement[key] = {
            startPosition: new Cartesian2(),
            endPosition: new Cartesian2(),
            valid: false
        };
    }

    let down;
    let up;
    if (type === CameraEventType.LEFT_DRAG) {
        down = ScreenSpaceEventType.LEFT_DOWN;
        up = ScreenSpaceEventType.LEFT_UP;
    } else if (type === CameraEventType.RIGHT_DRAG) {
        down = ScreenSpaceEventType.RIGHT_DOWN;
        up = ScreenSpaceEventType.RIGHT_UP;
    } else if (type === CameraEventType.MIDDLE_DRAG) {
        down = ScreenSpaceEventType.MIDDLE_DOWN;
        up = ScreenSpaceEventType.MIDDLE_UP;
    }

    aggregator._eventHandler.setInputAction(
        function (event: any) {
            aggregator._buttonsDown++;
            lastMovement.valid = false;
            isDown[key] = true;
            pressTime[key] = new Date();
            Cartesian2.clone(event.position, eventStartPosition[key]);
        },
        down,
        modifier
    );

    aggregator._eventHandler.setInputAction(
        function () {
            aggregator._buttonsDown = Math.max(aggregator._buttonsDown - 1, 0);
            isDown[key] = false;
            releaseTime[key] = new Date();
        },
        up,
        modifier
    );
}

interface MovementInterface {
    startPosition?: Cartesian2,
    endPosition?: Cartesian2,
    [name: string]: any
}

function cloneMouseMovement (mouseMovement:MovementInterface, result: MovementInterface) {
    Cartesian2.clone(mouseMovement.startPosition, result.startPosition);
    Cartesian2.clone(mouseMovement.endPosition, result.endPosition);
}

function listenMouseMove (aggregator: any, modifier: number | undefined) {
    const update = aggregator._update;
    const movement = aggregator._movement;
    const lastMovement = aggregator._lastMovement;
    const isDown = aggregator._isDown;

    for (const typeName in CameraEventType) {
        // if (CameraEventType.hasOwnProperty(typeName)) {
        if (Object.prototype.hasOwnProperty.call(CameraEventType, typeName)) {
            const type = CameraEventType[typeName];
            if (defined(type)) {
                const key = getKey(type, modifier);
                update[key] = true;

                if (!defined(aggregator._lastMovement[key])) {
                    aggregator._lastMovement[key] = {
                        startPosition: new Cartesian2(),
                        endPosition: new Cartesian2(),
                        valid: false
                    };
                }

                if (!defined(aggregator._movement[key])) {
                    aggregator._movement[key] = {
                        startPosition: new Cartesian2(),
                        endPosition: new Cartesian2()
                    };
                }
            }
        }
    }

    aggregator._eventHandler.setInputAction(
        function (mouseMovement: any) {
            for (const typeName in CameraEventType) {
                // if (CameraEventType.hasOwnProperty(typeName)) {
                if (Object.prototype.hasOwnProperty.call(CameraEventType, typeName)) {
                    const type = CameraEventType[typeName];
                    if (defined(type)) {
                        const key = getKey(type, modifier);
                        if (isDown[key]) {
                            if (!update[key]) {
                                Cartesian2.clone(
                                    mouseMovement.endPosition,
                                    movement[key].endPosition
                                );
                            } else {
                                cloneMouseMovement(movement[key], lastMovement[key]);
                                lastMovement[key].valid = true;
                                cloneMouseMovement(mouseMovement, movement[key]);
                                update[key] = false;
                            }
                        }
                    }
                }
            }

            Cartesian2.clone(
                mouseMovement.endPosition,
                aggregator._currentMousePosition
            );
        },
        ScreenSpaceEventType.MOUSE_MOVE,
        modifier
    );
}

/**
 * Aggregates input events. For example, suppose the following inputs are received between frames:
 * left mouse button down, mouse move, mouse move, left mouse button up. These events will be aggregated into
 * one event with a start and end position of the mouse.
 *
 * @alias CameraEventAggregator
 * @constructor
 *
 * @param {HTMLCanvasElement} [canvas=document] The element to handle events for.
 *
 * @see ScreenSpaceEventHandler
 */

class CameraEventAggregator {
    _eventHandler: ScreenSpaceEventHandler;

    _update: {[name: string]: any};
    _movement: {[name: string]: any};
    _lastMovement: {[name: string]: any};
    _isDown: {[name: string]: any};
    _eventStartPosition: { [name: string]: any };
    _pressTime: { [name: string]: any };
    _releaseTime: {[name: string]: any};

    _buttonsDown: number;
    _currentMousePosition: Cartesian2;
    constructor (canvas: HTMLCanvasElement) {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(canvas)) {
            throw new DeveloperError('canvas is required.');
        }
        // >>includeEnd('debug');

        this._eventHandler = new ScreenSpaceEventHandler(canvas);

        this._update = {};
        this._movement = {};
        this._lastMovement = {};
        this._isDown = {};
        this._eventStartPosition = {};
        this._pressTime = {};
        this._releaseTime = {};

        this._buttonsDown = 0;

        this._currentMousePosition = new Cartesian2();

        listenToWheel(this, undefined);
        listenToPinch(this, undefined, canvas);
        listenMouseButtonDownUp(this, undefined, CameraEventType.LEFT_DRAG);
        listenMouseButtonDownUp(this, undefined, CameraEventType.RIGHT_DRAG);
        listenMouseButtonDownUp(this, undefined, CameraEventType.MIDDLE_DRAG);
        listenMouseMove(this, undefined);

        for (const modifierName in KeyboardEventModifier) {
            if (Object.prototype.hasOwnProperty.call(KeyboardEventModifier, modifierName)) {
                const modifier = KeyboardEventModifier[(modifierName as string)];
                if (defined(modifier)) {
                    listenToWheel(this, modifier);
                    listenToPinch(this, modifier, canvas);
                    listenMouseButtonDownUp(this, modifier, CameraEventType.LEFT_DRAG);
                    listenMouseButtonDownUp(this, modifier, CameraEventType.RIGHT_DRAG);
                    listenMouseButtonDownUp(this, modifier, CameraEventType.MIDDLE_DRAG);
                    listenMouseMove(this, modifier);
                }
            }
        }
    }

    get currentMousePosition (): Cartesian2 {
        return this._currentMousePosition;
    }

    get anyButtonDown (): boolean {
        const wheelMoved =
        !this._update[getKey(CameraEventType.WHEEL)] ||
        !this._update[
            getKey(CameraEventType.WHEEL, KeyboardEventModifier.SHIFT)
        ] ||
        !this._update[
            getKey(CameraEventType.WHEEL, KeyboardEventModifier.CTRL)
        ] ||
        !this._update[getKey(CameraEventType.WHEEL, KeyboardEventModifier.ALT)];
        return this._buttonsDown > 0 || wheelMoved;
    }

    /**
     * Gets if a mouse button down or touch has started and has been moved.
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Boolean} Returns <code>true</code> if a mouse button down or touch has started and has been moved; otherwise, <code>false</code>
     */
    isMoving (type:CameraEventType, modifier:KeyboardEventModifier):boolean {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        return !this._update[key];
    }

    /**
     * Gets the aggregated start and end position of the current event.
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Object} An object with two {@link Cartesian2} properties: <code>startPosition</code> and <code>endPosition</code>.
     */
    getMovement (type:CameraEventType, modifier:KeyboardEventModifier): {[name: string]: any} {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        const movement = this._movement[key];
        return movement;
    }

    /**
     * Gets the start and end position of the last move event (not the aggregated event).
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Object|undefined} An object with two {@link Cartesian2} properties: <code>startPosition</code> and <code>endPosition</code> or <code>undefined</code>.
     */
    getLastMovement (type:CameraEventType, modifier:KeyboardEventModifier): {[name: string]: any} | undefined {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        const lastMovement = this._lastMovement[key];
        if (lastMovement.valid) {
            return lastMovement;
        }

        return undefined;
    }

    /**
     * Gets whether the mouse button is down or a touch has started.
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Boolean} Whether the mouse button is down or a touch has started.
     */
    isButtonDown (type:CameraEventType, modifier:KeyboardEventModifier):boolean {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        return this._isDown[key];
    }

    /**
     * Gets the mouse position that started the aggregation.
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Cartesian2} The mouse position.
     */
    getStartMousePosition (type: CameraEventType, modifier: KeyboardEventModifier):Cartesian2 {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        if (type === CameraEventType.WHEEL) {
            return this._currentMousePosition;
        }

        const key = getKey(type, modifier);
        return this._eventStartPosition[key];
    }

    /**
   * Gets the time the button was pressed or the touch was started.
   *
   * @param {CameraEventType} type The camera event type.
   * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
   * @returns {Date} The time the button was pressed or the touch was started.
   */
    getButtonPressTime (type:CameraEventType, modifier:KeyboardEventModifier):Date {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        return this._pressTime[key];
    }

    /**
   * Gets the time the button was released or the touch was ended.
   *
   * @param {CameraEventType} type The camera event type.
   * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
   * @returns {Date} The time the button was released or the touch was ended.
   */
    getButtonReleaseTime (type:CameraEventType, modifier:KeyboardEventModifier):Date {
    // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getKey(type, modifier);
        return this._releaseTime[key];
    }

    /**
   * Signals that all of the events have been handled and the aggregator should be reset to handle new events.
   */
    reset ():void {
        for (const name in this._update) {
            // if (this._update.hasOwnProperty(name)) {
            //     this._update[name] = true;
            // }
            if (Object.prototype.hasOwnProperty.call(this._update, name)) {
                this._update[name] = true;
            }
        }
    }

    /**
   * Returns true if this object was destroyed; otherwise, false.
   * <br /><br />
   * If this object was destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
   *
   * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   *
   * @see CameraEventAggregator#destroy
   */
    isDestroyed ():boolean {
        return false;
    }

    /**
   * Removes mouse listeners held by this object.
   * <br /><br />
   * Once an object is destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
   * assign the return value (<code>undefined</code>) to the object as done in the example.
   *
   * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
   *
   *
   * @example
   * handler = handler && handler.destroy();
   *
   * @see CameraEventAggregator#isDestroyed
   */
    destroy ():void {
        this._eventHandler = this._eventHandler && this._eventHandler.destroy();
        return destroyObject(this);
    }
}

export default CameraEventAggregator;
