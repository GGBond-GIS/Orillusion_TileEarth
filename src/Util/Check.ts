import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

interface CheckInterface {
    defined: (name: string, test: any) => any;
    typeOf: {
        [name: string]: any
    }
}

/**
 * Contains functions for checking that supplied arguments are of a specified type
 * or meet specified conditions
 * @private
 */
const Check:any = {};

/**
  * Contains type checking functions, all using the typeof operator
  */
Check.typeOf = {};

function getUndefinedErrorMessage (name: string): string {
    return name + ' is required, actual value was undefined';
}

function getFailedTypeErrorMessage (actual: string, expected: string, name: string): string {
    return (
        'Expected ' +
      name +
      ' to be typeof ' +
      expected +
      ', actual typeof was ' +
      actual
    );
}

/**
   * Throws if test is not defined
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value that is to be checked
   * @exception {DeveloperError} test must be defined
   */
Check.defined = function (name: string, test:any): any {
    if (!defined(test)) {
        throw new DeveloperError(getUndefinedErrorMessage(name));
    }
};

/**
   * Throws if test is not typeof 'function'
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @exception {DeveloperError} test must be typeof 'function'
   */
Check.typeOf.func = function <T> (name: string, test:T) {
    if (typeof test !== 'function') {
        throw new DeveloperError(
            getFailedTypeErrorMessage(typeof test, 'function', name)
        );
    }
};

/**
   * Throws if test is not typeof 'string'
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @exception {DeveloperError} test must be typeof 'string'
   */
Check.typeOf.string = function <T> (name: string, test:T) {
    if (typeof test !== 'string') {
        throw new DeveloperError(
            getFailedTypeErrorMessage(typeof test, 'string', name)
        );
    }
};

/**
   * Throws if test is not typeof 'number'
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @exception {DeveloperError} test must be typeof 'number'
   */
Check.typeOf.number = function <T> (name: string, test:T) {
    if (typeof test !== 'number') {
        throw new DeveloperError(
            getFailedTypeErrorMessage(typeof test, 'number', name)
        );
    }
};

/**
   * Throws if test is not typeof 'number' and less than limit
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @param {Number} limit The limit value to compare against
   * @exception {DeveloperError} test must be typeof 'number' and less than limit
   */
Check.typeOf.number.lessThan = function <T> (name:string, test:T | number, limit:number) {
    Check.typeOf.number(name, test);
    if ((test as number) >= limit) {
        throw new DeveloperError(
            'Expected ' +
          name +
          ' to be less than ' +
          limit +
          ', actual value was ' +
          test
        );
    }
};

/**
   * Throws if test is not typeof 'number' and less than or equal to limit
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @param {Number} limit The limit value to compare against
   * @exception {DeveloperError} test must be typeof 'number' and less than or equal to limit
   */
Check.typeOf.number.lessThanOrEquals = function <T> (name:string, test:T | number, limit:number) {
    Check.typeOf.number(name, test);
    if (test > limit) {
        throw new DeveloperError(
            'Expected ' +
          name +
          ' to be less than or equal to ' +
          limit +
          ', actual value was ' +
          test
        );
    }
};

/**
   * Throws if test is not typeof 'number' and greater than limit
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @param {Number} limit The limit value to compare against
   * @exception {DeveloperError} test must be typeof 'number' and greater than limit
   */
Check.typeOf.number.greaterThan = function <T> (name:string, test:T | number, limit:number) {
    Check.typeOf.number(name, test);
    if (test <= limit) {
        throw new DeveloperError(
            'Expected ' +
          name +
          ' to be greater than ' +
          limit +
          ', actual value was ' +
          test
        );
    }
};

/**
   * Throws if test is not typeof 'number' and greater than or equal to limit
   *
   * @param {String} name The name of the variable being tested
   * @param {*} test The value to test
   * @param {Number} limit The limit value to compare against
   * @exception {DeveloperError} test must be typeof 'number' and greater than or equal to limit
   */
Check.typeOf.number.greaterThanOrEquals = function <T> (name:string, test:T | number, limit:number) {
    Check.typeOf.number(name, test);
    if (test < limit) {
        throw new DeveloperError(
            'Expected ' +
          name +
          ' to be greater than or equal to ' +
          limit +
          ', actual value was ' +
          test
        );
    }
};

export { Check };
