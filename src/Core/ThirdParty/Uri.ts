/* eslint-disable no-useless-escape */
/* eslint-disable eqeqeq */
/**
 * @license
 *
 * Grauw URI utilities
 *
 * See: http://hg.grauw.nl/grauw-lib/file/tip/src/uri
 *
 * @author Laurens Holst (http://www.grauw.nl/)
 *
 *   Copyright 2012 Laurens Holst
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
     * Constructs a URI object.
     * @constructor
     * @class Implementation of URI parsing and base URI resolving algorithm in RFC 3986.
     * @param {string|URI} uri A string or URI object to create the object from.
     */

const parseRegex = new RegExp('^(?:([^:/?#]+):)?(?://([^/?#]*))?([^?#]*)(?:\\?([^#]*))?(?:#(.*))?$');

const caseRegex = /%[0-9a-z]{2}/gi;
const percentRegex = /[a-zA-Z0-9\-\._~]/;
const authorityRegex = /(.*@)?([^@:]*)(:.*)?/;

function replaceCase (str: any) {
    const dec = unescape(str);
    return percentRegex.test(dec) ? dec : str.toUpperCase();
}

function replaceAuthority (str:any, p1:any, p2:any, p3:any) {
    return (p1 || '') + p2.toLowerCase() + (p3 || '');
}

class URI {
    scheme: any;
    authority: any;
    path: any;
    query: any;
    fragment: any;

    constructor (uri?: string | URI) {
        this.scheme = null;
        this.authority = null;
        this.path = null;
        this.query = null;
        this.fragment = null;

        if (uri instanceof URI) { // copy constructor
            this.scheme = uri.scheme;
            this.authority = uri.authority;
            this.path = uri.path;
            this.query = uri.query;
            this.fragment = uri.fragment;
        } else if (uri) { // uri is URI string or cast to string
            const c = parseRegex.exec(uri) as any[];
            this.scheme = c[1];
            this.authority = c[2];
            this.path = c[3];
            this.query = c[4];
            this.fragment = c[5];
        }
    }

    /**
     * Returns the scheme part of the URI.
    * In "http://example.com:80/a/b?x#y" this is "http".
     */
    getScheme (): any {
        return this.scheme;
    }

    /**
     * Returns the authority part of the URI.
     * In "http://example.com:80/a/b?x#y" this is "example.com:80".
     */
    getAuthority (): any {
        return this.authority;
    }

    /**
     * Returns the path part of the URI.
     * In "http://example.com:80/a/b?x#y" this is "/a/b".
     * In "mailto:mike@example.com" this is "mike@example.com".
     */
    getPath (): any {
        return this.path;
    }

    /**
     * Returns the query part of the URI.
     * In "http://example.com:80/a/b?x#y" this is "x".
     */
    getQuery (): any {
        return this.query;
    }

    /**
     * Returns the fragment part of the URI.
     * In "http://example.com:80/a/b?x#y" this is "y".
     */
    getFragment (): any {
        return this.fragment;
    }

    /**
     * Tests whether the URI is an absolute URI.
     * See RFC 3986 section 4.3.
     */
    isAbsolute (): any {
        return !!this.scheme && !this.fragment;
    }

    /// **
    //* Extensive validation of the URI against the ABNF in RFC 3986
    //* /
    // validate

    /**
     * Tests whether the URI is a same-document reference.
     * See RFC 3986 section 4.4.
     *
     * To perform more thorough comparison, you can normalise the URI objects.
     */
    isSameDocumentAs (uri: any): any {
        return uri.scheme == this.scheme &&
            uri.authority == this.authority &&
                 uri.path == this.path &&
                uri.query == this.query;
    }

    /**
     * Simple String Comparison of two URIs.
     * See RFC 3986 section 6.2.1.
     *
     * To perform more thorough comparison, you can normalise the URI objects.
     */
    equals (uri: any): any {
        return this.isSameDocumentAs(uri) && uri.fragment == this.fragment;
    }

    /**
     * Normalizes the URI using syntax-based normalization.
     * This includes case normalization, percent-encoding normalization and path segment normalization.
     * XXX: Percent-encoding normalization does not escape characters that need to be escaped.
     *      (Although that would not be a valid URI in the first place. See validate().)
     * See RFC 3986 section 6.2.2.
     */
    normalize ():void {
        this.removeDotSegments();
        if (this.scheme) { this.scheme = this.scheme.toLowerCase(); }
        if (this.authority) {
            this.authority = this.authority.replace(authorityRegex, replaceAuthority)
                .replace(caseRegex, replaceCase);
        }
        if (this.path) { this.path = this.path.replace(caseRegex, replaceCase); }
        if (this.query) { this.query = this.query.replace(caseRegex, replaceCase); }
        if (this.fragment) { this.fragment = this.fragment.replace(caseRegex, replaceCase); }
    }

    /**
     * Resolve a relative URI (this) against a base URI.
     * The base URI must be an absolute URI.
     * See RFC 3986 section 5.2
     */
    resolve (baseURI: any) {
        const uri = new URI();
        if (this.scheme) {
            uri.scheme = this.scheme;
            uri.authority = this.authority;
            uri.path = this.path;
            uri.query = this.query;
        } else {
            uri.scheme = baseURI.scheme;
            if (this.authority) {
                uri.authority = this.authority;
                uri.path = this.path;
                uri.query = this.query;
            } else {
                uri.authority = baseURI.authority;
                if (this.path == '') {
                    uri.path = baseURI.path;
                    uri.query = this.query || baseURI.query;
                } else {
                    if (this.path.charAt(0) == '/') {
                        uri.path = this.path;
                        uri.removeDotSegments();
                    } else {
                        if (baseURI.authority && baseURI.path == '') {
                            uri.path = '/' + this.path;
                        } else {
                            uri.path = baseURI.path.substring(0, baseURI.path.lastIndexOf('/') + 1) + this.path;
                        }
                        uri.removeDotSegments();
                    }
                    uri.query = this.query;
                }
            }
        }
        uri.fragment = this.fragment;
        return uri;
    }

    /**
     * Remove dot segments from path.
     * See RFC 3986 section 5.2.4
     * @private
     */
    removeDotSegments (): any {
        const input = this.path.split('/');
        const output = [];
        let segment;
        const absPath = input[0] == '';
        if (absPath) { input.shift(); }
        const sFirst = input[0] == '' ? input.shift() : null;
        while (input.length) {
            segment = input.shift();
            if (segment == '..') {
                output.pop();
            } else if (segment != '.') {
                output.push(segment);
            }
        }
        if (segment == '.' || segment == '..') { output.push(''); }
        if (absPath) { output.unshift(''); }
        this.path = output.join('/');
    }

    // We don't like this function because it builds up a cache that is never cleared.
    //  /**
    //   * Resolves a relative URI against an absolute base URI.
    //   * Convenience method.
    //   * @param {String} uri the relative URI to resolve
    //   * @param {String} baseURI the base URI (must be absolute) to resolve against
    //   */
    //  URI.resolve (sURI, sBaseURI) {
    //      var uri = cache[sURI] || (cache[sURI] = new URI(sURI));
    //      var baseURI = cache[sBaseURI] || (cache[sBaseURI] = new URI(sBaseURI));
    //      return uri.resolve(baseURI).toString();
    //  };

    //  var cache = {};

    /**
     * Serialises the URI to a string.
     */
    toString ():any {
        let result = '';
        if (this.scheme) { result += this.scheme + ':'; }
        if (this.authority) { result += '//' + this.authority; }
        result += this.path;
        if (this.query) { result += '?' + this.query; }
        if (this.fragment) { result += '#' + this.fragment; }
        return result;
    }
}

export { URI };
