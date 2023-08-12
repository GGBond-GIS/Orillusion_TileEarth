const blobUriRegex = /^blob:/i;

/**
 * Determines if the specified uri is a blob uri.
 *
 * @function isBlobUri
 *
 * @param {String} uri The uri to test.
 * @returns {Boolean} true when the uri is a blob uri; otherwise, false.
 *
 * @private
 */
function isBlobUri (uri: string): boolean {
    return blobUriRegex.test(uri);
}
export { isBlobUri };
