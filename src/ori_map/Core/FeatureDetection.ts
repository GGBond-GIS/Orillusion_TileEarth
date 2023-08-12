/* eslint-disable no-useless-escape */
import { defined } from './defined';

let imageRenderingValueResult: string;
let supportsImageRenderingPixelatedResult: boolean;
function supportsImageRenderingPixelated (): boolean {
    if (!defined(supportsImageRenderingPixelatedResult)) {
        const canvas = document.createElement('canvas');
        canvas.setAttribute(
            'style',
            'image-rendering: -moz-crisp-edges;' + 'image-rendering: pixelated;'
        );
        // canvas.style.imageRendering will be undefined, null or an empty string on unsupported browsers.
        const tmp: string = canvas.style.imageRendering;
        supportsImageRenderingPixelatedResult = defined(tmp) && tmp !== '';
        if (supportsImageRenderingPixelatedResult) {
            imageRenderingValueResult = tmp;
        }
    }
    return supportsImageRenderingPixelatedResult;
}

function imageRenderingValue (): string | undefined {
    return supportsImageRenderingPixelated()
        ? imageRenderingValueResult
        : undefined;
}

let theNavigator: any;
if (typeof navigator !== 'undefined') {
    theNavigator = navigator;
} else {
    theNavigator = {};
}

function extractVersion (versionString: string): any {
    const parts: any = versionString.split('.');
    for (let i = 0, len = parts.length; i < len; ++i) {
        parts[i] = parseInt(parts[i], 10);
    }
    return parts;
}

let isFirefoxResult: boolean;
let firefoxVersionResult;
function isFirefox () {
    if (!defined(isFirefoxResult)) {
        isFirefoxResult = false;

        const fields = /Firefox\/([\.0-9]+)/.exec(theNavigator.userAgent);
        if (fields !== null) {
            isFirefoxResult = true;
            firefoxVersionResult = extractVersion(fields[1]);
        }
    }
    return isFirefoxResult;
}

let hasPointerEvents: boolean;
function supportsPointerEvents (): boolean {
    if (!defined(hasPointerEvents)) {
        // While navigator.pointerEnabled is deprecated in the W3C specification
        // we still need to use it if it exists in order to support browsers
        // that rely on it, such as the Windows WebBrowser control which defines
        // PointerEvent but sets navigator.pointerEnabled to false.

        // Firefox disabled because of https://github.com/CesiumGS/cesium/issues/6372
        hasPointerEvents =
            !isFirefox() &&
            typeof PointerEvent !== 'undefined' &&
            (!defined(theNavigator.pointerEnabled) ||
                theNavigator.pointerEnabled);
    }
    return hasPointerEvents;
}

const FeatureDetection = {
    imageRenderingValue,
    supportsImageRenderingPixelated,
    supportsPointerEvents
};

export { FeatureDetection };
