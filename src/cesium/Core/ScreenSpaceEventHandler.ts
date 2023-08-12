import { Vector2 } from 'three';
import { AssociativeArray } from './AssociativeArray';
import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { destroyObject } from './destroyObject';
import { DeveloperError } from './DeveloperError';
import { FeatureDetection } from './FeatureDetection';
import { getTimestamp } from './getTimestamp';
import { KeyboardEventModifier } from './KeyboardEventModifier';
import { ScreenSpaceEventType } from './ScreenSpaceEventType';

const document: any = window.document;

function getPosition (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: any,
    result: Vector2
): Vector2 {
    const element = screenSpaceEventHandler._element;
    if (element === document) {
        result.x = event.clientX;
        result.y = event.clientY;
        return result;
    }

    const rect = element.getBoundingClientRect();
    result.x = event.clientX - rect.left;
    result.y = event.clientY - rect.top;
    return result;
}

function getInputEventKey (type: string | number, modifier?: number): any {
    let key = type;
    if (defined(modifier)) {
        key += '+' + modifier;
    }
    return key;
}

function getModifier (event: any): number | undefined {
    if (event.shiftKey) {
        return KeyboardEventModifier.SHIFT;
    } else if (event.ctrlKey) {
        return KeyboardEventModifier.CTRL;
    } else if (event.altKey) {
        return KeyboardEventModifier.ALT;
    }

    return undefined;
}

const MouseButton = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2
};

function registerListener (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    domType: any,
    element: HTMLCanvasElement,
    callback: any
) {
    function listener (e: PointerEvent) {
        callback(screenSpaceEventHandler, e);
    }

    element.addEventListener(domType, listener, {
        capture: false,
        passive: false
    });

    screenSpaceEventHandler._removalFunctions.push(function () {
        element.removeEventListener(domType, listener, false);
    });
}

function registerListeners (screenSpaceEventHandler: ScreenSpaceEventHandler) {
    const element = screenSpaceEventHandler._element;

    // some listeners may be registered on the document, so we still get events even after
    // leaving the bounds of element.
    // this is affected by the existence of an undocumented disableRootEvents property on element.
    const alternateElement = !defined(element.disableRootEvents)
        ? document
        : element;

    if (FeatureDetection.supportsPointerEvents()) {
        registerListener(
            screenSpaceEventHandler,
            'pointerdown',
            element,
            handlePointerDown
        );
        registerListener(
            screenSpaceEventHandler,
            'pointerup',
            element,
            handlePointerUp
        );
        registerListener(
            screenSpaceEventHandler,
            'pointermove',
            element,
            handlePointerMove
        );
        registerListener(
            screenSpaceEventHandler,
            'pointercancel',
            element,
            handlePointerUp
        );
    } else {
        registerListener(
            screenSpaceEventHandler,
            'mousedown',
            element,
            handleMouseDown
        );
        registerListener(
            screenSpaceEventHandler,
            'mouseup',
            alternateElement,
            handleMouseUp
        );
        registerListener(
            screenSpaceEventHandler,
            'mousemove',
            alternateElement,
            handleMouseMove
        );
        registerListener(
            screenSpaceEventHandler,
            'touchstart',
            element,
            handleTouchStart
        );
        registerListener(
            screenSpaceEventHandler,
            'touchend',
            alternateElement,
            handleTouchEnd
        );
        registerListener(
            screenSpaceEventHandler,
            'touchmove',
            alternateElement,
            handleTouchMove
        );
        registerListener(
            screenSpaceEventHandler,
            'touchcancel',
            alternateElement,
            handleTouchEnd
        );
    }

    registerListener(
        screenSpaceEventHandler,
        'dblclick',
        element,
        handleDblClick
    );

    // detect available wheel event
    let wheelEvent;
    if ('onwheel' in element) {
        // spec event type
        wheelEvent = 'wheel';
    } else if (document.onmousewheel !== undefined) {
        // legacy event type
        wheelEvent = 'mousewheel';
    } else {
        // older Firefox
        wheelEvent = 'DOMMouseScroll';
    }

    registerListener(screenSpaceEventHandler, wheelEvent, element, handleWheel);
}

function unregisterListeners (screenSpaceEventHandler: ScreenSpaceEventHandler) {
    const removalFunctions = screenSpaceEventHandler._removalFunctions;
    for (let i = 0; i < removalFunctions.length; ++i) {
        removalFunctions[i]();
    }
}

const mouseDownEvent = {
    position: new Vector2()
};

function gotTouchEvent (screenSpaceEventHandler: ScreenSpaceEventHandler) {
    screenSpaceEventHandler._lastSeenTouchEvent = getTimestamp();
}

function canProcessMouseEvent (
    screenSpaceEventHandler: ScreenSpaceEventHandler
) {
    return (
        getTimestamp() - screenSpaceEventHandler._lastSeenTouchEvent >
        ScreenSpaceEventHandler.mouseEmulationIgnoreMilliseconds
    );
}

function checkPixelTolerance (
    startPosition: Vector2,
    endPosition: Vector2,
    pixelTolerance: number
) {
    const xDiff = startPosition.x - endPosition.x;
    const yDiff = startPosition.y - endPosition.y;
    const totalPixels = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

    return totalPixels < pixelTolerance;
}

function handleMouseDown (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    if (!canProcessMouseEvent(screenSpaceEventHandler)) {
        return;
    }

    const button = event.button;
    screenSpaceEventHandler._buttonDown[button] = true;

    let screenSpaceEventType;
    if (button === MouseButton.LEFT) {
        screenSpaceEventType = ScreenSpaceEventType.LEFT_DOWN;
    } else if (button === MouseButton.MIDDLE) {
        screenSpaceEventType = ScreenSpaceEventType.MIDDLE_DOWN;
    } else if (button === MouseButton.RIGHT) {
        screenSpaceEventType = ScreenSpaceEventType.RIGHT_DOWN;
    } else {
        return;
    }

    const position: Vector2 = getPosition(
        screenSpaceEventHandler,
        event,
        screenSpaceEventHandler._primaryPosition
    );
    screenSpaceEventHandler._primaryStartPosition.copy(position);
    screenSpaceEventHandler._primaryPreviousPosition.copy(position);

    const modifier = getModifier(event);

    const action = screenSpaceEventHandler.getInputAction(
        screenSpaceEventType,
        (modifier as number)
    );

    if (defined(action)) {
        mouseDownEvent.position.copy(position);

        action(mouseDownEvent);

        event.preventDefault();
    }
}

const mouseUpEvent: {
    position: Vector2,
    [propName: string]: any
} = {
    position: new Vector2()
};
const mouseClickEvent: {
    position: Vector2
} = {
    position: new Vector2()
};

function cancelMouseEvent (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    screenSpaceEventType: number,
    clickScreenSpaceEventType: number,
    event: PointerEvent
) {
    const modifier = getModifier(event);

    const action = screenSpaceEventHandler.getInputAction(
        screenSpaceEventType,
        (modifier as number)
    );
    const clickAction = screenSpaceEventHandler.getInputAction(
        clickScreenSpaceEventType,
        (modifier as number)
    );

    if (defined(action) || defined(clickAction)) {
        const position = getPosition(
            screenSpaceEventHandler,
            event,
            screenSpaceEventHandler._primaryPosition
        );

        if (defined(action)) {
            mouseUpEvent.position.copy(position);

            action(mouseUpEvent);
        }

        if (defined(clickAction)) {
            const startPosition = screenSpaceEventHandler._primaryStartPosition;
            if (
                checkPixelTolerance(
                    startPosition,
                    position,
                    screenSpaceEventHandler._clickPixelTolerance
                )
            ) {
                mouseClickEvent.position.copy(position);

                clickAction(mouseClickEvent);
            }
        }
    }
}

function handleMouseUp (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    if (!canProcessMouseEvent(screenSpaceEventHandler)) {
        return;
    }

    const button = event.button;

    if (
        button !== MouseButton.LEFT &&
        button !== MouseButton.MIDDLE &&
        button !== MouseButton.RIGHT
    ) {
        return;
    }

    if (screenSpaceEventHandler._buttonDown[MouseButton.LEFT]) {
        cancelMouseEvent(
            screenSpaceEventHandler,
            ScreenSpaceEventType.LEFT_UP,
            ScreenSpaceEventType.LEFT_CLICK,
            event
        );
        screenSpaceEventHandler._buttonDown[MouseButton.LEFT] = false;
    }
    if (screenSpaceEventHandler._buttonDown[MouseButton.MIDDLE]) {
        cancelMouseEvent(
            screenSpaceEventHandler,
            ScreenSpaceEventType.MIDDLE_UP,
            ScreenSpaceEventType.MIDDLE_CLICK,
            event
        );
        screenSpaceEventHandler._buttonDown[MouseButton.MIDDLE] = false;
    }
    if (screenSpaceEventHandler._buttonDown[MouseButton.RIGHT]) {
        cancelMouseEvent(
            screenSpaceEventHandler,
            ScreenSpaceEventType.RIGHT_UP,
            ScreenSpaceEventType.RIGHT_CLICK,
            event
        );
        screenSpaceEventHandler._buttonDown[MouseButton.RIGHT] = false;
    }
}

const mouseMoveEvent = {
    startPosition: new Vector2(),
    endPosition: new Vector2()
};

function handleMouseMove (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    if (!canProcessMouseEvent(screenSpaceEventHandler)) {
        return;
    }

    const modifier = getModifier(event);

    const position = getPosition(
        screenSpaceEventHandler,
        event,
        screenSpaceEventHandler._primaryPosition
    );
    const previousPosition = screenSpaceEventHandler._primaryPreviousPosition;

    const action = screenSpaceEventHandler.getInputAction(
        ScreenSpaceEventType.MOUSE_MOVE,
        (modifier as number)
    );

    if (defined(action)) {
        mouseMoveEvent.startPosition.copy(previousPosition);
        mouseMoveEvent.endPosition.copy(position);

        action(mouseMoveEvent);
    }

    previousPosition.copy(position);

    if (
        screenSpaceEventHandler._buttonDown[MouseButton.LEFT] ||
        screenSpaceEventHandler._buttonDown[MouseButton.MIDDLE] ||
        screenSpaceEventHandler._buttonDown[MouseButton.RIGHT]
    ) {
        event.preventDefault();
    }
}

const mouseDblClickEvent = {
    position: new Vector2()
};

function handleDblClick (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    const button = event.button;

    let screenSpaceEventType;
    if (button === MouseButton.LEFT) {
        screenSpaceEventType = ScreenSpaceEventType.LEFT_DOUBLE_CLICK;
    } else {
        return;
    }

    const modifier = getModifier(event);

    const action = screenSpaceEventHandler.getInputAction(
        screenSpaceEventType,
        (modifier as number)
    );

    if (defined(action)) {
        getPosition(
            screenSpaceEventHandler,
            event,
            mouseDblClickEvent.position
        );

        action(mouseDblClickEvent);
    }
}

function handleWheel (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: any
) {
    // currently this event exposes the delta value in terms of
    // the obsolete mousewheel event type.  so, for now, we adapt the other
    // values to that scheme.
    let delta;

    // standard wheel event uses deltaY.  sign is opposite wheelDelta.
    // deltaMode indicates what unit it is in.
    if (defined(event.deltaY)) {
        const deltaMode = event.deltaMode;
        if (deltaMode === event.DOM_DELTA_PIXEL) {
            delta = -event.deltaY;
        } else if (deltaMode === event.DOM_DELTA_LINE) {
            delta = -event.deltaY * 40;
        } else {
            // DOM_DELTA_PAGE
            delta = -event.deltaY * 120;
        }
    } else if (event.detail > 0) {
        // old Firefox versions use event.detail to count the number of clicks. The sign
        // of the integer is the direction the wheel is scrolled.
        delta = event.detail * -120;
    } else {
        delta = event.wheelDelta;
    }

    if (!defined(delta)) {
        return;
    }

    const modifier = getModifier(event);
    const action = screenSpaceEventHandler.getInputAction(
        ScreenSpaceEventType.WHEEL,
        (modifier as number)
    );

    if (defined(action)) {
        action(delta);

        event.preventDefault();
    }
}

function handleTouchStart (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: TouchEvent
) {
    gotTouchEvent(screenSpaceEventHandler);

    const changedTouches = event.changedTouches;

    let i;
    const length = changedTouches.length;
    let touch;
    let identifier;
    const positions = screenSpaceEventHandler._positions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        positions.set(
            identifier,
            getPosition(screenSpaceEventHandler, touch, new Vector2())
        );
    }

    fireTouchEvents(screenSpaceEventHandler, event);

    const previousPositions = screenSpaceEventHandler._previousPositions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        previousPositions.set(identifier, positions.get(identifier).clone());
    }
}

function handleTouchEnd (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: TouchEvent
) {
    gotTouchEvent(screenSpaceEventHandler);

    const changedTouches = event.changedTouches;

    let i;
    const length = changedTouches.length;
    let touch;
    let identifier;
    const positions = screenSpaceEventHandler._positions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        positions.remove(identifier);
    }

    fireTouchEvents(screenSpaceEventHandler, event);

    const previousPositions = screenSpaceEventHandler._previousPositions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        previousPositions.remove(identifier);
    }
}

const touchStartEvent = {
    position: new Vector2()
};
const touch2StartEvent = {
    position1: new Vector2(),
    position2: new Vector2()
};
const touchEndEvent = {
    position: new Vector2()
};
const touchClickEvent = {
    position: new Vector2()
};
const touchHoldEvent = {
    position: new Vector2()
};

function fireTouchEvents (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: any
) {
    const modifier = getModifier(event);
    const positions = screenSpaceEventHandler._positions;
    const numberOfTouches = positions.length;
    let action;
    let clickAction;
    const pinching = screenSpaceEventHandler._isPinching;

    if (
        numberOfTouches !== 1 &&
        screenSpaceEventHandler._buttonDown[MouseButton.LEFT]
    ) {
        // transitioning from single touch, trigger UP and might trigger CLICK
        screenSpaceEventHandler._buttonDown[MouseButton.LEFT] = false;

        if (defined(screenSpaceEventHandler._touchHoldTimer)) {
            clearTimeout(screenSpaceEventHandler._touchHoldTimer);
            screenSpaceEventHandler._touchHoldTimer = undefined;
        }

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.LEFT_UP,
            (modifier as number)
        );

        if (defined(action)) {
            touchEndEvent.position.copy(
                screenSpaceEventHandler._primaryPosition
            );

            action(touchEndEvent);
        }

        if (numberOfTouches === 0 && !screenSpaceEventHandler._isTouchHolding) {
            // releasing single touch, check for CLICK
            clickAction = screenSpaceEventHandler.getInputAction(
                ScreenSpaceEventType.LEFT_CLICK,
                (modifier as number)
            );

            if (defined(clickAction)) {
                const startPosition =
                    screenSpaceEventHandler._primaryStartPosition;
                const endPosition =
                    screenSpaceEventHandler._previousPositions.values[0];
                if (
                    checkPixelTolerance(
                        startPosition,
                        endPosition,
                        screenSpaceEventHandler._clickPixelTolerance
                    )
                ) {
                    touchClickEvent.position.copy(
                        screenSpaceEventHandler._primaryPosition
                    );

                    clickAction(touchClickEvent);
                }
            }
        }

        screenSpaceEventHandler._isTouchHolding = false;

        // Otherwise don't trigger CLICK, because we are adding more touches.
    }

    if (numberOfTouches === 0 && pinching) {
        // transitioning from pinch, trigger PINCH_END
        screenSpaceEventHandler._isPinching = false;

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.PINCH_END,
            (modifier as number)
        );

        if (defined(action)) {
            action();
        }
    }

    if (numberOfTouches === 1 && !pinching) {
        // transitioning to single touch, trigger DOWN
        const position = positions.values[0];
        screenSpaceEventHandler._primaryPosition.copy(position);
        screenSpaceEventHandler._primaryStartPosition.copy(position);
        screenSpaceEventHandler._primaryPreviousPosition.copy(position);

        screenSpaceEventHandler._buttonDown[MouseButton.LEFT] = true;

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.LEFT_DOWN,
            (modifier as number)
        );

        if (defined(action)) {
            touchStartEvent.position.copy(position);

            action(touchStartEvent);
        }

        screenSpaceEventHandler._touchHoldTimer = setTimeout(function () {
            if (!screenSpaceEventHandler.isDestroyed()) {
                screenSpaceEventHandler._touchHoldTimer = undefined;
                screenSpaceEventHandler._isTouchHolding = true;

                clickAction = screenSpaceEventHandler.getInputAction(
                    ScreenSpaceEventType.RIGHT_CLICK,
                    (modifier as number)
                );

                if (defined(clickAction)) {
                    const startPosition =
                        screenSpaceEventHandler._primaryStartPosition;
                    const endPosition =
                        screenSpaceEventHandler._previousPositions.values[0];
                    if (
                        checkPixelTolerance(
                            startPosition,
                            endPosition,
                            screenSpaceEventHandler._holdPixelTolerance
                        )
                    ) {
                        touchHoldEvent.position.copy(
                            screenSpaceEventHandler._primaryPosition
                        );

                        clickAction(touchHoldEvent);
                    }
                }
            }
        }, ScreenSpaceEventHandler.touchHoldDelayMilliseconds);

        event.preventDefault();
    }

    if (numberOfTouches === 2 && !pinching) {
        // transitioning to pinch, trigger PINCH_START
        screenSpaceEventHandler._isPinching = true;

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.PINCH_START,
            (modifier as number)
        );

        if (defined(action)) {
            touch2StartEvent.position1.copy(positions.values[0]);
            touch2StartEvent.position2.copy(positions.values[1]);

            action(touch2StartEvent);

            // Touch-enabled devices, in particular iOS can have many default behaviours for
            // "pinch" events, which can still be executed unless we prevent them here.
            event.preventDefault();
        }
    }
}

function handleTouchMove (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: TouchEvent
) {
    gotTouchEvent(screenSpaceEventHandler);

    const changedTouches = event.changedTouches;

    let i;
    const length = changedTouches.length;
    let touch;
    let identifier;
    const positions = screenSpaceEventHandler._positions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        const position = positions.get(identifier);
        if (defined(position)) {
            getPosition(screenSpaceEventHandler, touch, position);
        }
    }

    fireTouchMoveEvents(screenSpaceEventHandler, event);

    const previousPositions = screenSpaceEventHandler._previousPositions;

    for (i = 0; i < length; ++i) {
        touch = changedTouches[i];
        identifier = touch.identifier;
        previousPositions.get(identifier).copy(positions.get(identifier));
    }
}

const touchMoveEvent = {
    startPosition: new Vector2(),
    endPosition: new Vector2()
};
const touchPinchMovementEvent = {
    distance: {
        startPosition: new Vector2(),
        endPosition: new Vector2()
    },
    angleAndHeight: {
        startPosition: new Vector2(),
        endPosition: new Vector2()
    }
};

function fireTouchMoveEvents (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: any
) {
    const modifier = getModifier(event);
    const positions = screenSpaceEventHandler._positions;
    const previousPositions = screenSpaceEventHandler._previousPositions;
    const numberOfTouches = positions.length;
    let action;

    if (
        numberOfTouches === 1 &&
        screenSpaceEventHandler._buttonDown[MouseButton.LEFT]
    ) {
        // moving single touch
        const position = positions.values[0];
        screenSpaceEventHandler._primaryPosition.copy(position);

        const previousPosition = screenSpaceEventHandler._primaryPreviousPosition;

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.MOUSE_MOVE,
            (modifier as number)
        );

        if (defined(action)) {
            touchMoveEvent.startPosition.copy(previousPosition);
            touchMoveEvent.endPosition.copy(position);

            action(touchMoveEvent);
        }

        previousPosition.copy(position);

        event.preventDefault();
    } else if (numberOfTouches === 2 && screenSpaceEventHandler._isPinching) {
        // moving pinch

        action = screenSpaceEventHandler.getInputAction(
            ScreenSpaceEventType.PINCH_MOVE,
            (modifier as number)
        );
        if (defined(action)) {
            const position1 = positions.values[0];
            const position2 = positions.values[1];
            const previousPosition1 = previousPositions.values[0];
            const previousPosition2 = previousPositions.values[1];

            const dX = position2.x - position1.x;
            const dY = position2.y - position1.y;
            const dist = Math.sqrt(dX * dX + dY * dY) * 0.25;

            const prevDX = previousPosition2.x - previousPosition1.x;
            const prevDY = previousPosition2.y - previousPosition1.y;
            const prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;

            const cY = (position2.y + position1.y) * 0.125;
            const prevCY = (previousPosition2.y + previousPosition1.y) * 0.125;
            const angle = Math.atan2(dY, dX);
            const prevAngle = Math.atan2(prevDY, prevDX);

            touchPinchMovementEvent.distance.startPosition.set(0.0, prevDist);
            touchPinchMovementEvent.distance.endPosition.set(0.0, dist);

            touchPinchMovementEvent.angleAndHeight.startPosition.set(
                prevAngle,
                prevCY
            );
            touchPinchMovementEvent.angleAndHeight.endPosition.set(angle, cY);

            action(touchPinchMovementEvent);
        }
    }
}

function handlePointerDown (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: any
) {
    event.target.setPointerCapture(event.pointerId);

    if (event.pointerType === 'touch') {
        const positions = screenSpaceEventHandler._positions;

        const identifier = event.pointerId;
        positions.set(
            identifier,
            getPosition(screenSpaceEventHandler, event, new Vector2())
        );

        fireTouchEvents(screenSpaceEventHandler, event);

        const previousPositions = screenSpaceEventHandler._previousPositions;
        previousPositions.set(identifier, positions.get(identifier).clone());
    } else {
        handleMouseDown(screenSpaceEventHandler, event);
    }
}

function handlePointerUp (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    if (event.pointerType === 'touch') {
        const positions = screenSpaceEventHandler._positions;

        const identifier = event.pointerId;
        positions.remove(identifier);

        fireTouchEvents(screenSpaceEventHandler, event);

        const previousPositions = screenSpaceEventHandler._previousPositions;
        previousPositions.remove(identifier);
    } else {
        handleMouseUp(screenSpaceEventHandler, event);
    }
}

function handlePointerMove (
    screenSpaceEventHandler: ScreenSpaceEventHandler,
    event: PointerEvent
) {
    if (event.pointerType === 'touch') {
        const positions = screenSpaceEventHandler._positions;

        const identifier = event.pointerId;
        const position = positions.get(identifier);
        if (!defined(position)) {
            return;
        }

        getPosition(screenSpaceEventHandler, event, position);
        fireTouchMoveEvents(screenSpaceEventHandler, event);

        const previousPositions = screenSpaceEventHandler._previousPositions;
        previousPositions.get(identifier).copy(positions.get(identifier));
    } else {
        handleMouseMove(screenSpaceEventHandler, event);
    }
}

/**
 * Handles user input events. Custom functions can be added to be executed on
 * when the user enters input.
 *
 * @alias ScreenSpaceEventHandler
 *
 * @param {HTMLCanvasElement} [element=document] The element to add events to.
 *
 * @constructor
 */
class ScreenSpaceEventHandler {
    _inputEvents: any;
    _buttonDown: any;
    _isPinching: boolean;
    _isTouchHolding: boolean;
    _lastSeenTouchEvent: number;
    _primaryStartPosition: Vector2;
    _primaryPosition: Vector2;
    _primaryPreviousPosition: Vector2;
    _positions: AssociativeArray;
    _previousPositions: AssociativeArray;
    _removalFunctions: any[];
    _touchHoldTimer: any;
    _clickPixelTolerance: number;
    _holdPixelTolerance: number;
    _element: any;

    constructor (element?: HTMLCanvasElement) {
        this._inputEvents = {};
        this._buttonDown = {
            LEFT: false,
            MIDDLE: false,
            RIGHT: false
        };
        this._isPinching = false;
        this._isTouchHolding = false;
        this._lastSeenTouchEvent = -ScreenSpaceEventHandler.mouseEmulationIgnoreMilliseconds;

        this._primaryStartPosition = new Vector2();
        this._primaryPosition = new Vector2();
        this._primaryPreviousPosition = new Vector2();

        this._positions = new AssociativeArray();
        this._previousPositions = new AssociativeArray();

        this._removalFunctions = [];

        this._touchHoldTimer = undefined;

        // TODO: Revisit when doing mobile development. May need to be configurable
        // or determined based on the platform?
        this._clickPixelTolerance = 5;
        this._holdPixelTolerance = 25;

        this._element = defaultValue(element, document);

        registerListeners(this);
    }

    /**
     * Set a function to be executed on an input event.
     *
     * @param {Function} action Function to be executed when the input event occurs.
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    setInputAction (action?: any, type?: number, modifier?: number) {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(action)) {
            throw new DeveloperError('action is required.');
        }
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getInputEventKey((type as number), modifier);
        this._inputEvents[key] = action;
    }

    /**
     * Returns the function to be executed on an input event.
     *
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @returns {Function} The function to be executed on an input event.
     *
     * @see ScreenSpaceEventHandler#setInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    getInputAction (type: number, modifier: number | undefined): any {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getInputEventKey(type, modifier);
        return this._inputEvents[key];
    }

    /**
     * Removes the function to be executed on an input event.
     *
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#setInputAction
     */
    removeInputAction (type: number, modifier: number): void {
        // >>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        // >>includeEnd('debug');

        const key = getInputEventKey(type, modifier);
        delete this._inputEvents[key];
    }

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ScreenSpaceEventHandler#destroy
     */
    isDestroyed (): boolean {
        return false;
    }

    /**
     * Removes listeners held by this object.
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
     * @see ScreenSpaceEventHandler#isDestroyed
     */

    destroy (): any {
        unregisterListeners(this);

        return destroyObject(this);
    }

    /**
     * The amount of time, in milliseconds, that mouse events will be disabled after
     * receiving any touch events, such that any emulated mouse events will be ignored.
     * @type {Number}
     * @default 800
     */
    static mouseEmulationIgnoreMilliseconds = 800;

    static touchHoldDelayMilliseconds = 1500;
}

export { ScreenSpaceEventHandler };
