
const dataUriRegex = /^data:/i;

/**
 * Determines if the specified uri is a data uri.
 *
 * @function isDataUri
 *
 * @param {String} uri The uri to test.
 * @returns {Boolean} true when the uri is a data uri; otherwise, false.
 *
 * @private
 */
function isDataUri (uri: string): boolean {
    return dataUriRegex.test(uri);
}
export { isDataUri };
