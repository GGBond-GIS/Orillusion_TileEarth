class HeadingPitchRange {
    heading: number;
    pitch: number;
    range: number;
    constructor (heading = 0.0, pitch = 0.0, range = 0.0) {
        /**
         * Heading is the rotation from the local north direction where a positive angle is increasing eastward.
         * @type {Number}
         * @default 0.0
         */
        this.heading = heading;

        /**
        * Pitch is the rotation from the local xy-plane. Positive pitch angles
        * are above the plane. Negative pitch angles are below the plane.
        * @type {Number}
        * @default 0.0
        */
        this.pitch = pitch;

        /**
        * Range is the distance from the center of the local frame.
        * @type {Number}
        * @default 0.0
        */
        this.range = range;
    }
}

export { HeadingPitchRange };
