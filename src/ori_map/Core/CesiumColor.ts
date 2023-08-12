import { defaultValue } from './defaultValue';
import { defined } from './defined';

// #rgb
const rgbMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
// #rrggbb
const rrggbbMatcher = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
// rgb(), rgba(), or rgb%()
const rgbParenthesesMatcher = /^rgba?\(\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)(?:\s*,\s*([0-9.]+))?\s*\)$/i;
// hsl(), hsla(), or hsl%()
const hslParenthesesMatcher = /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+%)\s*,\s*([0-9.]+%)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

const hue2rgb = (m1: any, m2: any, h: any) => {
    if (h < 0) {
        h += 1;
    }
    if (h > 1) {
        h -= 1;
    }
    if (h * 6 < 1) {
        return m1 + (m2 - m1) * 6 * h;
    }
    if (h * 2 < 1) {
        return m2;
    }
    if (h * 3 < 2) {
        return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    }
    return m1;
};

class CesiumColor {
    red: number;
    green: number;
    blue: number;
    alpha: number;
    constructor (red = 0.0, green = 0.0, blue = 0.0, alpha = 0.0) {
        /**
         * The red component.
         * @type {Number}
         * @default 1.0
         */
        this.red = defaultValue(red, 1.0);
        /**
        * The green component.
        * @type {Number}
        * @default 1.0
        */
        this.green = defaultValue(green, 1.0);
        /**
        * The blue component.
        * @type {Number}
        * @default 1.0
        */
        this.blue = defaultValue(blue, 1.0);
        /**
        * The alpha component.
        * @type {Number}
        * @default 1.0
        */
        this.alpha = defaultValue(alpha, 1.0);
    }

    /**
     * An immutable Color instance initialized to CSS color #000000
     * <span class="colorSwath" style="background: #000000;"></span>
     *
     * @constant
     * @type {Color}
     */
    static BLACK = Object.freeze(CesiumColor.fromCssColorString('#000000')) as CesiumColor;

    static RED = CesiumColor.fromCssColorString('#FF0000')

    /**
     * An immutable Color instance initialized to CSS transparent.
     * <span class="colorSwath" style="background: transparent;"></span>
     *
     * @constant
     * @type {Color}
     */
    static TRANSPARENT = Object.freeze(new CesiumColor(0, 0, 0, 0));

    /**
     * Duplicates a Color.
     *
     * @param {Color} color The Color to duplicate.
     * @param {Color} [result] The object to store the result in, if undefined a new instance will be created.
     * @returns {Color} The modified result parameter or a new instance if result was undefined. (Returns undefined if color is undefined)
     */
    static clone (color: CesiumColor, result?: CesiumColor): CesiumColor | undefined {
        if (!defined(color)) {
            return undefined;
        }
        if (!defined(result)) {
            return new CesiumColor(color.red, color.green, color.blue, color.alpha);
        }
        (result as CesiumColor).red = color.red;
        (result as CesiumColor).green = color.green;
        (result as CesiumColor).blue = color.blue;
        (result as CesiumColor).alpha = color.alpha;
        return (result as CesiumColor);
    }

    /**
     * Creates a Color instance from hue, saturation, and lightness.
     *
     * @param {Number} [hue=0] The hue angle 0...1
     * @param {Number} [saturation=0] The saturation value 0...1
     * @param {Number} [lightness=0] The lightness value 0...1
     * @param {Number} [alpha=1.0] The alpha component 0...1
     * @param {Color} [result] The object to store the result in, if undefined a new instance will be created.
     * @returns {Color} The color object.
     *
     * @see {@link http://www.w3.org/TR/css3-color/#hsl-color|CSS color values}
     */
    static fromHsl (hue = 0, saturation = 0, lightness = 0, alpha = 1.0, result?: CesiumColor): CesiumColor {
        hue = defaultValue(hue, 0.0) % 1.0;
        saturation = defaultValue(saturation, 0.0);
        lightness = defaultValue(lightness, 0.0);
        alpha = defaultValue(alpha, 1.0);

        let red = lightness;
        let green = lightness;
        let blue = lightness;

        if (saturation !== 0) {
            let m2;
            if (lightness < 0.5) {
                m2 = lightness * (1 + saturation);
            } else {
                m2 = lightness + saturation - lightness * saturation;
            }

            const m1 = 2.0 * lightness - m2;
            red = hue2rgb(m1, m2, hue + 1 / 3);
            green = hue2rgb(m1, m2, hue);
            blue = hue2rgb(m1, m2, hue - 1 / 3);
        }

        if (!defined(result)) {
            return new CesiumColor(red, green, blue, alpha);
        }

        (result as CesiumColor).red = red;
        (result as CesiumColor).green = green;
        (result as CesiumColor).blue = blue;
        (result as CesiumColor).alpha = alpha;
        return (result as CesiumColor);
    }

    /**
     * Creates a Color instance from a CSS color value.
     *
     * @param {String} color The CSS color value in #rgb, #rrggbb, rgb(), rgba(), hsl(), or hsla() format.
     * @param {Color} [result] The object to store the result in, if undefined a new instance will be created.
     * @returns {Color} The color object, or undefined if the string was not a valid CSS color.
     *
     *
     * @example
     * var cesiumBlue = Cesium.Color.fromCssColorString('#67ADDF');
     * var green = Cesium.Color.fromCssColorString('green');
     *
     * @see {@link http://www.w3.org/TR/css3-color|CSS color values}
     */
    static fromCssColorString (color: string, result?: CesiumColor | undefined): CesiumColor | undefined {
        if (!defined(result)) {
            result = new CesiumColor();
        }

        const namedColor = CesiumColor[color.toUpperCase()];
        if (defined(namedColor)) {
            CesiumColor.clone(namedColor, result);
            return (result as CesiumColor);
        }

        let matches = rgbMatcher.exec(color);
        if (matches !== null) {
            (result as CesiumColor).red = parseInt(matches[1], 16) / 15;
            (result as CesiumColor).green = parseInt(matches[2], 16) / 15.0;
            (result as CesiumColor).blue = parseInt(matches[3], 16) / 15.0;
            (result as CesiumColor).alpha = 1.0;
            return (result as CesiumColor);
        }

        matches = rrggbbMatcher.exec(color);
        if (matches !== null) {
            (result as CesiumColor).red = parseInt(matches[1], 16) / 255.0;
            (result as CesiumColor).green = parseInt(matches[2], 16) / 255.0;
            (result as CesiumColor).blue = parseInt(matches[3], 16) / 255.0;
            (result as CesiumColor).alpha = 1.0;
            return (result as CesiumColor);
        }

        matches = rgbParenthesesMatcher.exec(color);
        if (matches !== null) {
            (result as CesiumColor).red = parseFloat(matches[1]) / (matches[1].substr(-1) === '%'
                ? 100.0
                : 255.0);
            (result as CesiumColor).green = parseFloat(matches[2]) / (matches[2].substr(-1) === '%'
                ? 100.0
                : 255.0);
            (result as CesiumColor).blue = parseFloat(matches[3]) / (matches[3].substr(-1) === '%'
                ? 100.0
                : 255.0);
            (result as CesiumColor).alpha = parseFloat(defaultValue(matches[4], '1.0'));
            return (result as CesiumColor);
        }

        matches = hslParenthesesMatcher.exec(color);
        if (matches !== null) {
            return CesiumColor.fromHsl(
                parseFloat(matches[1]) / 360.0,
                parseFloat(matches[2]) / 100.0,
                parseFloat(matches[3]) / 100.0,
                parseFloat(defaultValue(matches[4], '1.0')), result
            );
        }

        result = undefined;
        return (result as undefined);
    }

    /**
     * Converts a 'float' color component in the range of 0 to 1.0 into
     * a 'byte' color component in the range of 0 to 255.
     *
     * @param {Number} number The number to be converted.
     * @returns {Number} The converted number.
     */
    static floatToByte (number: number): number {
        return number === 1.0
            ? 255.0
        // eslint-disable-next-line no-bitwise
            : number * 256.0 | 0;
    }

    /**
     * Creates a string containing the CSS color value for this color.
     *
     * @returns {String} The CSS equivalent of this color.
     *
     * @see {@link http://www.w3.org/TR/css3-color/#rgba-color|CSS RGB or RGBA color values}
     */
    toCssColorString (): string {
        const red = CesiumColor.floatToByte(this.red);
        const green = CesiumColor.floatToByte(this.green);
        const blue = CesiumColor.floatToByte(this.blue);
        if (this.alpha === 1) {
            return 'rgb(' + red + ',' + green + ',' + blue + ')';
        }
        return 'rgba(' + red + ',' + green + ',' + blue + ',' + this.alpha + ')';
    }
}
export { CesiumColor };
