import { defaultValue } from './defaultValue';
import { defined } from './defined';

function swap (array: any, a:number, b:number) {
    const temp = array[a];
    array[a] = array[b];
    array[b] = temp;
}

class Heap {
    _comparator: any;
    _array: any[];
    _length: number;
    _maximumLength?: number;
    constructor (options: any) {
        this._comparator = options.comparator;
        this._array = [];
        this._length = 0;
        this._maximumLength = undefined;
    }

    get length (): number {
        return this._length;
    }

    get internalArray (): any[] {
        return this._array;
    }

    get maximumLength (): number {
        return this._maximumLength as number;
    }

    set maximumLength (value) {
        const originalLength = this._length;
        if (value < originalLength) {
            const array = this._array;
            // Remove trailing references
            for (let i = value; i < originalLength; ++i) {
                array[i] = undefined;
            }
            this._length = value;
            array.length = value;
        }
        this._maximumLength = value;
    }

    get comparator (): any {
        return this._comparator;
    }

    /**
 * Resizes the internal array of the heap.
 *
 * @param {Number} [length] The length to resize internal array to. Defaults to the current length of the heap.
 */
    reserve (length?: number): void {
        length = defaultValue(length, this._length) as number;
        this._array.length = length;
    }

    /**
   * Update the heap so that index and all descendants satisfy the heap property.
   *
   * @param {Number} [index=0] The starting index to heapify from.
   */
    heapify (index = 0): void {
        index = defaultValue(index, 0);
        const length = this._length;
        const comparator = this._comparator;
        const array = this._array;
        let candidate = -1;
        let inserting = true;

        while (inserting) {
            const right = 2 * (index + 1);
            const left = right - 1;

            if (left < length && comparator(array[left], array[index]) < 0) {
                candidate = left;
            } else {
                candidate = index;
            }

            if (right < length && comparator(array[right], array[candidate]) < 0) {
                candidate = right;
            }
            if (candidate !== index) {
                swap(array, candidate, index);
                index = candidate;
            } else {
                inserting = false;
            }
        }
    }

    /**
   * Resort the heap.
   */
    resort (): void {
        const length = this._length;
        for (let i = Math.ceil(length / 2); i >= 0; --i) {
            this.heapify(i);
        }
    }

    /**
   * Insert an element into the heap. If the length would grow greater than maximumLength
   * of the heap, extra elements are removed.
   *
   * @param {*} element The element to insert
   *
   * @return {*} The element that was removed from the heap if the heap is at full capacity.
   */
    insert (element: any): any {
        const array = this._array;
        const comparator = this._comparator;
        const maximumLength = this._maximumLength as number;

        let index = this._length++;
        if (index < array.length) {
            array[index] = element;
        } else {
            array.push(element);
        }

        while (index !== 0) {
            const parent = Math.floor((index - 1) / 2);
            if (comparator(array[index], array[parent]) < 0) {
                swap(array, index, parent);
                index = parent;
            } else {
                break;
            }
        }

        let removedElement;

        if (defined(maximumLength) && this._length > maximumLength) {
            removedElement = array[maximumLength];
            this._length = maximumLength;
        }

        return removedElement;
    }

    /**
   * Remove the element specified by index from the heap and return it.
   *
   * @param {Number} [index=0] The index to remove.
   * @returns {*} The specified element of the heap.
   */
    pop (index = 0): any {
        index = defaultValue(index, 0);
        if (this._length === 0) {
            return undefined;
        }

        const array = this._array;
        const root = array[index];
        swap(array, index, --this._length);
        this.heapify(index);
        array[this._length] = undefined; // Remove trailing reference
        return root;
    }
}

export { Heap };
