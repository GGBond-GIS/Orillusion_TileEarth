
class HeadingPitchRoll {
    heading: number;
    pitch: number;
    roll: number;
    constructor (heading = 0.0, pitch = 0.0, roll = 0.0) {
        /**
         * Gets or sets the heading.
         * @type {Number}
         * @default 0.0
         */
        this.heading = heading;
        /**
        * Gets or sets the pitch.
        * @type {Number}
        * @default 0.0
        */
        this.pitch = pitch;
        /**
        * Gets or sets the roll.
        * @type {Number}
        * @default 0.0
        */
        this.roll = roll;
    }
}

export { HeadingPitchRoll };
