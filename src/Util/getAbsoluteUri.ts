import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { DeveloperError } from './DeveloperError';

import { URI as Uri } from '../Core/ThirdParty/Uri';

/**
 * Given a relative Uri and a base Uri, returns the absolute Uri of the relative Uri.
 * @function
 *
 * @param {String} relative The relative Uri.
 * @param {String} [base] The base Uri.
 * @returns {String} The absolute Uri of the given relative Uri.
 *
 * @example
 * //absolute Uri will be "https://test.com/awesome.png";
 * var absoluteUri = Cesium.getAbsoluteUri('awesome.png', 'https://test.com');
 */
function getAbsoluteUri (relative:string, base?: string): string {
    let documentObject;
    if (typeof document !== 'undefined') {
        documentObject = document;
    }

    return getAbsoluteUri._implementation(relative, base, documentObject);
}

getAbsoluteUri._implementation = function (relative: string, base?: string, documentObject?:any) {
    // >>includeStart('debug', pragmas.debug);
    if (!defined(relative)) {
        throw new DeveloperError('relative uri is required.');
    }
    // >>includeEnd('debug');

    if (!defined(base)) {
        if (typeof documentObject === 'undefined') {
            return relative;
        }
        base = defaultValue(documentObject.baseURI, documentObject.location.href);
    }

    const baseUri = new Uri(base);
    const relativeUri = new Uri(relative);
    return relativeUri.resolve(baseUri).toString();
};

export { getAbsoluteUri };
