import { defaultValue } from './defaultValue';

/**
 * Fill an array or a portion of an array with a given value.
 *
 * @param {Array} array The array to fill.
 * @param {*} value The value to fill the array with.
 * @param {Number} [start=0] The index to start filling at.
 * @param {Number} [end=array.length] The index to end stop at.
 *
 * @returns {Array} The resulting array.
 * @private
 */
function arrayFill (array: any[], value: any, start = 0, end?: number): any[] {
    if (typeof array.fill === 'function') {
        return array.fill(value, start, end);
    }

    const length = array.length >>> 0;
    const relativeStart = defaultValue(start, 0);
    // If negative, find wrap around position
    let k =
      relativeStart < 0
          ? Math.max(length + relativeStart, 0)
          : Math.min(relativeStart, length);
    const relativeEnd = defaultValue(end, length) as number;
    // If negative, find wrap around position
    const last =
      relativeEnd < 0
          ? Math.max(length + relativeEnd, 0)
          : Math.min(relativeEnd, length);

    // Fill array accordingly
    while (k < last) {
        array[k] = value;
        k++;
    }
    return array;
}
export default arrayFill;
