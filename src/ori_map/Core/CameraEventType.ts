/**
 * Enumerates the available input for interacting with the camera.
 */
enum CameraEventType {
    /**
     * A left mouse button press followed by moving the mouse and releasing the button.
     */
    LEFT_DRAG = 0,
    /**
     * A right mouse button press followed by moving the mouse and releasing the button.
     */
    RIGHT_DRAG = 1,
    /**
     * A middle mouse button press followed by moving the mouse and releasing the button.
     */
    MIDDLE_DRAG = 2,
    /**
     * Scrolling the middle mouse button.
     */
    WHEEL = 3,
    /**
     * A two-finger touch on a touch surface.
     */
    PINCH = 4
}
export { CameraEventType };
