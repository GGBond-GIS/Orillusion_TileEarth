import { Vector3 } from 'three';

// declare module 'three/src/math/Vector3' {
//     export interface Vector3 {
//          UNIT_X: Vector3
//     }
// }

/**
 * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
 *
 * @type {Cartesian3}
 * @constant
 */
(Vector3 as any).ZERO = Object.freeze(new Vector3(0.0, 0.0, 0.0));

/**
  * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
  *
  * @type {Cartesian3}
  * @constant
  */
(Vector3 as any).UNIT_X = Object.freeze(new Vector3(1.0, 0.0, 0.0));

/**
  * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
  *
  * @type {Cartesian3}
  * @constant
  */
(Vector3 as any).UNIT_Y = Object.freeze(new Vector3(0.0, 1.0, 0.0));

/**
  * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
  *
  * @type {Cartesian3}
  * @constant
  */
(Vector3 as any).UNIT_Z = Object.freeze(new Vector3(0.0, 0.0, 1.0));

export { Vector3 };
