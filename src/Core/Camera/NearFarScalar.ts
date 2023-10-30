/**
 * Represents a scalar value's lower and upper bound at a near distance and far distance in eye space.
 * @alias NearFarScalar
 * @constructor
 *
 * @param {Number} [near=0.0] The lower bound of the camera range.
 * @param {Number} [nearValue=0.0] The value at the lower bound of the camera range.
 * @param {Number} [far=1.0] The upper bound of the camera range.
 * @param {Number} [farValue=0.0] The value at the upper bound of the camera range.
 *
 * @see Packable
 */

class NearFarScalar {
     near: number;
     nearValue: number;
     far: number;
     farValue: number;
     constructor (near = 0.0, nearValue = 0.0, far = 1.0, farValue = 0.0) {
         /**
          * The lower bound of the camera range.
          * @type {Number}
          * @default 0.0
          */
         this.near = near;
         /**
          * The value at the lower bound of the camera range.
          * @type {Number}
          * @default 0.0
          */
         this.nearValue = nearValue;
         /**
          * The upper bound of the camera range.
          * @type {Number}
          * @default 1.0
          */
         this.far = far;
         /**
          * The value at the upper bound of the camera range.
          * @type {Number}
          * @default 0.0
          */
         this.farValue = farValue;
     }
}

export { NearFarScalar };
