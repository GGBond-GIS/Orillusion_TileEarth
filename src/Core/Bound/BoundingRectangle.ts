
class BoundingRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor (x = 0.0, y = 0.0, width = 0.0, height = 0.0) {
        /**
         * The x coordinate of the rectangle.
         * @type {Number}
         * @default 0.0
         */
        this.x = x;

        /**
        * The y coordinate of the rectangle.
        * @type {Number}
        * @default 0.0
        */
        this.y = y;

        /**
        * The width of the rectangle.
        * @type {Number}
        * @default 0.0
        */
        this.width = width;

        /**
        * The height of the rectangle.
        * @type {Number}
        * @default 0.0
        */
        this.height = height;
    }
}

export { BoundingRectangle };
