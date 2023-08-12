
class Queue {
    _array: any[];
    _offset: number;
    _length: number;
    constructor () {
        this._array = [];
        this._offset = 0;
        this._length = 0;
    }

    get length (): number {
        return this._length;
    }

    /**
 * Enqueues the specified item.
 *
 * @param {*} item The item to enqueue.
 */
    enqueue (item: any) {
        this._array.push(item);
        this._length++;
    }

    /**
   * Dequeues an item.  Returns undefined if the queue is empty.
   *
   * @returns {*} The the dequeued item.
   */
    dequeue (): any {
        if (this._length === 0) {
            return undefined;
        }

        const array = this._array;
        let offset = this._offset;
        const item = array[offset];
        array[offset] = undefined;

        offset++;
        if (offset > 10 && offset * 2 > array.length) {
            // compact array
            this._array = array.slice(offset);
            offset = 0;
        }

        this._offset = offset;
        this._length--;

        return item;
    }

    /**
   * Returns the item at the front of the queue.  Returns undefined if the queue is empty.
   *
   * @returns {*} The item at the front of the queue.
   */
    peek (): any {
        if (this._length === 0) {
            return undefined;
        }

        return this._array[this._offset];
    }

    /**
   * Check whether this queue contains the specified item.
   *
   * @param {*} item The item to search for.
   */
    contains (item: any): boolean {
        return this._array.indexOf(item) !== -1;
    }

    /**
   * Remove all items from the queue.
   */
    clear (): void {
        this._array.length = this._offset = this._length = 0;
    }

    /**
   * Sort the items in the queue in-place.
   *
   * @param {Queue.Comparator} compareFunction A function that defines the sort order.
   */
    sort (compareFunction: any): void {
        if (this._offset > 0) {
            // compact array
            this._array = this._array.slice(this._offset);
            this._offset = 0;
        }

        this._array.sort(compareFunction);
    }
}

export { Queue };
