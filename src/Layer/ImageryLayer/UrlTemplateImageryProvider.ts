/* eslint-disable no-prototype-builtins */
import { Cartesian2 } from '../../Math/Cartesian2';
import { Cartesian3 } from '../../Math/Cartesian3';
import { Cartographic } from '../../Math/Cartographic';
import { CesiumMath } from '../../Math/CesiumMath';
import { combine } from '../../Util/combine';
import { Credit } from '../../Util/Credit';
import { defaultValue } from '../../Util/defaultValue';
import { defined } from '../../Util/defined';
import { DeveloperError } from '../../Util/DeveloperError';
import { Event } from '../../Util/Event';
import { GeographicProjection } from '../../Core/Projection/GeographicProjection';
import { Rectangle } from '../../Math/Rectangle';
import { Request } from '../../Core/Request/Request';
import { Resource } from '../../Core/Request/Resource';
import { when } from '../../Core/ThirdParty/when';
import { ImageryProvider } from './ImageryProvider';
import { WebMercatorTilingScheme } from './WebMercatorTilingScheme';

const templateRegex = /{[^}]+}/g;

const tags = {
    x: xTag,
    y: yTag,
    z: zTag,
    s: sTag,
    reverseX: reverseXTag,
    reverseY: reverseYTag,
    reverseZ: reverseZTag,
    westDegrees: westDegreesTag,
    southDegrees: southDegreesTag,
    eastDegrees: eastDegreesTag,
    northDegrees: northDegreesTag,
    westProjected: westProjectedTag,
    southProjected: southProjectedTag,
    eastProjected: eastProjectedTag,
    northProjected: northProjectedTag,
    width: widthTag,
    height: heightTag
};

const pickFeaturesTags = combine(tags, {
    i: iTag,
    j: jTag,
    reverseI: reverseITag,
    reverseJ: reverseJTag,
    longitudeDegrees: longitudeDegreesTag,
    latitudeDegrees: latitudeDegreesTag,
    longitudeProjected: longitudeProjectedTag,
    latitudeProjected: latitudeProjectedTag,
    format: formatTag
});

/**
 * @typedef {Object} UrlTemplateImageryProvider.ConstructorOptions
 *
 * Initialization options for the UrlTemplateImageryProvider constructor
 *
 * @property {Promise.<Object>|Object} [options] Object with the following properties:
 * @property {Resource|String} url  The URL template to use to request tiles.  It has the following keywords:
 * <ul>
 *     <li><code>{z}</code>: The level of the tile in the tiling scheme.  Level zero is the root of the quadtree pyramid.</li>
 *     <li><code>{x}</code>: The tile X coordinate in the tiling scheme, where 0 is the Westernmost tile.</li>
 *     <li><code>{y}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Northernmost tile.</li>
 *     <li><code>{s}</code>: One of the available subdomains, used to overcome browser limits on the number of simultaneous requests per host.</li>
 *     <li><code>{reverseX}</code>: The tile X coordinate in the tiling scheme, where 0 is the Easternmost tile.</li>
 *     <li><code>{reverseY}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Southernmost tile.</li>
 *     <li><code>{reverseZ}</code>: The level of the tile in the tiling scheme, where level zero is the maximum level of the quadtree pyramid.  In order to use reverseZ, maximumLevel must be defined.</li>
 *     <li><code>{westDegrees}</code>: The Western edge of the tile in geodetic degrees.</li>
 *     <li><code>{southDegrees}</code>: The Southern edge of the tile in geodetic degrees.</li>
 *     <li><code>{eastDegrees}</code>: The Eastern edge of the tile in geodetic degrees.</li>
 *     <li><code>{northDegrees}</code>: The Northern edge of the tile in geodetic degrees.</li>
 *     <li><code>{westProjected}</code>: The Western edge of the tile in projected coordinates of the tiling scheme.</li>
 *     <li><code>{southProjected}</code>: The Southern edge of the tile in projected coordinates of the tiling scheme.</li>
 *     <li><code>{eastProjected}</code>: The Eastern edge of the tile in projected coordinates of the tiling scheme.</li>
 *     <li><code>{northProjected}</code>: The Northern edge of the tile in projected coordinates of the tiling scheme.</li>
 *     <li><code>{width}</code>: The width of each tile in pixels.</li>
 *     <li><code>{height}</code>: The height of each tile in pixels.</li>
 * </ul>
 * @property {Resource|String} [pickFeaturesUrl] The URL template to use to pick features.  If this property is not specified,
 *                 {@link UrlTemplateImageryProvider#pickFeatures} will immediately returned undefined, indicating no
 *                 features picked.  The URL template supports all of the keywords supported by the <code>url</code>
 *                 parameter, plus the following:
 * <ul>
 *     <li><code>{i}</code>: The pixel column (horizontal coordinate) of the picked position, where the Westernmost pixel is 0.</li>
 *     <li><code>{j}</code>: The pixel row (vertical coordinate) of the picked position, where the Northernmost pixel is 0.</li>
 *     <li><code>{reverseI}</code>: The pixel column (horizontal coordinate) of the picked position, where the Easternmost pixel is 0.</li>
 *     <li><code>{reverseJ}</code>: The pixel row (vertical coordinate) of the picked position, where the Southernmost pixel is 0.</li>
 *     <li><code>{longitudeDegrees}</code>: The longitude of the picked position in degrees.</li>
 *     <li><code>{latitudeDegrees}</code>: The latitude of the picked position in degrees.</li>
 *     <li><code>{longitudeProjected}</code>: The longitude of the picked position in the projected coordinates of the tiling scheme.</li>
 *     <li><code>{latitudeProjected}</code>: The latitude of the picked position in the projected coordinates of the tiling scheme.</li>
 *     <li><code>{format}</code>: The format in which to get feature information, as specified in the {@link GetFeatureInfoFormat}.</li>
 * </ul>
 * @property {Object} [urlSchemeZeroPadding] Gets the URL scheme zero padding for each tile coordinate. The format is '000' where
 * each coordinate will be padded on the left with zeros to match the width of the passed string of zeros. e.g. Setting:
 * urlSchemeZeroPadding : { '{x}' : '0000'}
 * will cause an 'x' value of 12 to return the string '0012' for {x} in the generated URL.
 * It the passed object has the following keywords:
 * <ul>
 *  <li> <code>{z}</code>: The zero padding for the level of the tile in the tiling scheme.</li>
 *  <li> <code>{x}</code>: The zero padding for the tile X coordinate in the tiling scheme.</li>
 *  <li> <code>{y}</code>: The zero padding for the the tile Y coordinate in the tiling scheme.</li>
 *  <li> <code>{reverseX}</code>: The zero padding for the tile reverseX coordinate in the tiling scheme.</li>
 *  <li> <code>{reverseY}</code>: The zero padding for the tile reverseY coordinate in the tiling scheme.</li>
 *  <li> <code>{reverseZ}</code>: The zero padding for the reverseZ coordinate of the tile in the tiling scheme.</li>
 * </ul>
 * @property {String|String[]} [subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
 *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
 *                          an array, each element in the array is a subdomain.
 * @property {Credit|String} [credit=''] A credit for the data source, which is displayed on the canvas.
 * @property {Number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
 *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
 *                 to result in rendering problems.
 * @property {Number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
 * @property {TilingScheme} [tilingScheme=WebMercatorTilingScheme] The tiling scheme specifying how the ellipsoidal
 * surface is broken into tiles.  If this parameter is not provided, a {@link WebMercatorTilingScheme}
 * is used.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
 *                    parameter is specified, the WGS84 ellipsoid is used.
 * @property {Number} [tileWidth=256] Pixel width of image tiles.
 * @property {Number} [tileHeight=256] Pixel height of image tiles.
 * @property {Boolean} [hasAlphaChannel=true] true if the images provided by this imagery provider
 *                  include an alpha channel; otherwise, false.  If this property is false, an alpha channel, if
 *                  present, will be ignored.  If this property is true, any images without an alpha channel will
 *                  be treated as if their alpha is 1.0 everywhere.  When this property is false, memory usage
 *                  and texture upload time are potentially reduced.
 * @property {GetFeatureInfoFormat[]} [getFeatureInfoFormats] The formats in which to get feature information at a
 *                                 specific location when {@link UrlTemplateImageryProvider#pickFeatures} is invoked.  If this
 *                                 parameter is not specified, feature picking is disabled.
 * @property {Boolean} [enablePickFeatures=true] If true, {@link UrlTemplateImageryProvider#pickFeatures} will
 *        request the <code>pickFeaturesUrl</code> and attempt to interpret the features included in the response.  If false,
 *        {@link UrlTemplateImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable
 *        features) without communicating with the server.  Set this property to false if you know your data
 *        source does not support picking features or if you don't want this provider's features to be pickable. Note
 *        that this can be dynamically overridden by modifying the {@link UriTemplateImageryProvider#enablePickFeatures}
 *        property.
 * @property {Object} [customTags] Allow to replace custom keywords in the URL template. The object must have strings as keys and functions as values.
 */

/**
 * Provides imagery by requesting tiles using a specified URL template.
 *
 * @alias UrlTemplateImageryProvider
 * @constructor
 *
 * @param {UrlTemplateImageryProvider.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Access Natural Earth II imagery, which uses a TMS tiling scheme and Geographic (EPSG:4326) project
 * var tms = new Cesium.UrlTemplateImageryProvider({
 *     url : Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII') + '/{z}/{x}/{reverseY}.jpg',
 *     credit : '© Analytical Graphics, Inc.',
 *     tilingScheme : new Cesium.GeographicTilingScheme(),
 *     maximumLevel : 5
 * });
 * // Access the CartoDB Positron basemap, which uses an OpenStreetMap-like tiling scheme.
 * var positron = new Cesium.UrlTemplateImageryProvider({
 *     url : 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
 *     credit : 'Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
 * });
 * // Access a Web Map Service (WMS) server.
 * var wms = new Cesium.UrlTemplateImageryProvider({
 *    url : 'https://programs.communications.gov.au/geoserver/ows?tiled=true&' +
 *          'transparent=true&format=image%2Fpng&exceptions=application%2Fvnd.ogc.se_xml&' +
 *          'styles=&service=WMS&version=1.1.1&request=GetMap&' +
 *          'layers=public%3AMyBroadband_Availability&srs=EPSG%3A3857&' +
 *          'bbox={westProjected}%2C{southProjected}%2C{eastProjected}%2C{northProjected}&' +
 *          'width=256&height=256',
 *    rectangle : Cesium.Rectangle.fromDegrees(96.799393, -43.598214999057824, 153.63925700000001, -9.2159219997013)
 * });
 * // Using custom tags in your template url.
 * var custom = new Cesium.UrlTemplateImageryProvider({
 *    url : 'https://yoururl/{Time}/{z}/{y}/{x}.png',
 *    customTags : {
 *        Time: function(imageryProvider, x, y, level) {
 *            return '20171231'
 *        }
 *    }
 * });
 *
 * @see ArcGisMapServerImageryProvider
 * @see BingMapsImageryProvider
 * @see GoogleEarthEnterpriseMapsProvider
 * @see OpenStreetMapImageryProvider
 * @see SingleTileImageryProvider
 * @see TileMapServiceImageryProvider
 * @see WebMapServiceImageryProvider
 * @see WebMapTileServiceImageryProvider
 */
class UrlTemplateImageryProvider {
    _errorEvent: Event;

    _resource: any;
    _urlSchemeZeroPadding: any;
    _pickFeaturesResource: any;
    _tileWidth: any;
    _tileHeight: any;
    _maximumLevel: any;
    _minimumLevel: any;
    _tilingScheme: any;
    _rectangle: any;
    _tileDiscardPolicy: any;
    _credit: any;
    _hasAlphaChannel: any;
    _readyPromise: any;
    _tags: any;
    _pickFeaturesTags: any;
    defaultAlpha: any;
    defaultNightAlpha: any;
    defaultDayAlpha: any;
    defaultBrightness: any;
    defaultContrast: any;
    defaultHue: any;
    defaultSaturation: any;
    defaultGamma: any;
    defaultMinificationFilter: any;
    /**
     * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link UrlTemplateImageryProvider#pickFeatures} will
     * request the <code>options.pickFeaturesUrl</code> and attempt to interpret the features included in the response.  If false,
     * {@link UrlTemplateImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable
     * features) without communicating with the server.  Set this property to false if you know your data
     * source does not support picking features or if you don't want this provider's features to be pickable.
     * @type {Boolean}
     * @default true
     */
    enablePickFeatures = true;
    defaultMagnificationFilter: any;
    _subdomains: any;
    _getFeatureInfoFormats: any;
    constructor (options: any) {
        this._errorEvent = new Event();

        this._resource = undefined;
        this._urlSchemeZeroPadding = undefined;
        this._pickFeaturesResource = undefined;
        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._minimumLevel = undefined;
        this._tilingScheme = undefined;
        this._rectangle = undefined;
        this._tileDiscardPolicy = undefined;
        this._credit = undefined;
        this._hasAlphaChannel = undefined;
        this._readyPromise = undefined;
        this._tags = undefined;
        this._pickFeaturesTags = undefined;

        /**
         * The default alpha blending value of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultAlpha = undefined;

        /**
         * The default alpha blending value on the night side of the globe of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultNightAlpha = undefined;

        /**
         * The default alpha blending value on the day side of the globe of this provider, with 0.0 representing fully transparent and
         * 1.0 representing fully opaque.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultDayAlpha = undefined;

        /**
         * The default brightness of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0
         * makes the imagery darker while greater than 1.0 makes it brighter.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultBrightness = undefined;

        /**
         * The default contrast of this provider.  1.0 uses the unmodified imagery color.  Less than 1.0 reduces
         * the contrast while greater than 1.0 increases it.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultContrast = undefined;

        /**
         * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultHue = undefined;

        /**
         * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
         * saturation while greater than 1.0 increases it.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultSaturation = undefined;

        /**
         * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.defaultGamma = undefined;

        /**
         * The default texture minification filter to apply to this provider.
         *
         * @type {TextureMinificationFilter}
         * @default undefined
         */
        this.defaultMinificationFilter = undefined;

        /**
         * The default texture magnification filter to apply to this provider.
         *
         * @type {TextureMagnificationFilter}
         * @default undefined
         */
        this.defaultMagnificationFilter = undefined;

        /**
         * Gets or sets a value indicating whether feature picking is enabled.  If true, {@link UrlTemplateImageryProvider#pickFeatures} will
         * request the <code>options.pickFeaturesUrl</code> and attempt to interpret the features included in the response.  If false,
         * {@link UrlTemplateImageryProvider#pickFeatures} will immediately return undefined (indicating no pickable
         * features) without communicating with the server.  Set this property to false if you know your data
         * source does not support picking features or if you don't want this provider's features to be pickable.
         * @type {Boolean}
         * @default true
         */
        this.enablePickFeatures = true;

        this.reinitialize(options);
    }

    get url (): string {
        return this._resource.url;
    }

    get urlSchemeZeroPadding (): any {
        return this._urlSchemeZeroPadding;
    }

    get pickFeaturesUrl (): string {
        return this._pickFeaturesResource.url;
    }

    get proxy (): any {
        return this._resource.proxy;
    }

    get tileWidth (): any {
        return this._tileWidth;
    }

    get tileHeight (): any {
        return this._tileHeight;
    }

    get maximumLevel (): any {
        return this._maximumLevel;
    }

    get minimumLevel (): any {
        return this._minimumLevel;
    }

    get tilingScheme (): any {
        return this._tilingScheme;
    }

    get rectangle (): any {
        return this._rectangle;
    }

    get tileDiscardPolicy (): any {
        return this._tileDiscardPolicy;
    }

    get errorEvent (): Event {
        return this._errorEvent;
    }

    get ready (): boolean {
        return defined(this._resource);
    }

    get readyPromise (): any {
        return this._readyPromise;
    }

    get credit (): any {
        return this._credit;
    }

    get hasAlphaChannel (): any {
        return this._hasAlphaChannel;
    }

    /**
     * Reinitializes this instance.  Reinitializing an instance already in use is supported, but it is not
     * recommended because existing tiles provided by the imagery provider will not be updated.
     *
     * @param {Promise.<Object>|Object} options Any of the options that may be passed to the {@link UrlTemplateImageryProvider} constructor.
     */
    reinitialize (options: any) {
        const that = this;
        that._readyPromise = when(options).then(function (properties: any) {
            // >>includeStart('debug', pragmas.debug);
            if (!defined(properties)) {
                throw new DeveloperError('options is required.');
            }
            if (!defined(properties.url)) {
                throw new DeveloperError('options.url is required.');
            }
            // >>includeEnd('debug');

            const customTags = properties.customTags;
            const allTags = combine(tags, customTags);
            const allPickFeaturesTags = combine(pickFeaturesTags, customTags);
            const resource = Resource.createIfNeeded(properties.url);
            const pickFeaturesResource = Resource.createIfNeeded(
                properties.pickFeaturesUrl
            );

            that.enablePickFeatures = defaultValue(
                properties.enablePickFeatures,
                that.enablePickFeatures
            );
            that._urlSchemeZeroPadding = defaultValue(
                properties.urlSchemeZeroPadding,
                that.urlSchemeZeroPadding
            );
            that._tileDiscardPolicy = properties.tileDiscardPolicy;
            that._getFeatureInfoFormats = properties.getFeatureInfoFormats;

            that._subdomains = properties.subdomains;
            if (Array.isArray(that._subdomains)) {
                that._subdomains = that._subdomains.slice();
            } else if (defined(that._subdomains) && that._subdomains.length > 0) {
                that._subdomains = that._subdomains.split('');
            } else {
                that._subdomains = ['a', 'b', 'c'];
            }

            that._tileWidth = defaultValue(properties.tileWidth, 256);
            that._tileHeight = defaultValue(properties.tileHeight, 256);
            that._minimumLevel = defaultValue(properties.minimumLevel, 0);
            that._maximumLevel = properties.maximumLevel;
            that._tilingScheme = defaultValue(
                properties.tilingScheme,
                new WebMercatorTilingScheme({ ellipsoid: properties.ellipsoid })
            );
            that._rectangle = defaultValue(
                properties.rectangle,
                that._tilingScheme.rectangle
            );
            that._rectangle = Rectangle.intersection(
                that._rectangle,
                that._tilingScheme.rectangle
            );
            that._hasAlphaChannel = defaultValue(properties.hasAlphaChannel, true);

            let credit = properties.credit;
            if (typeof credit === 'string') {
                credit = new Credit(credit);
            }
            that._credit = credit;

            that._resource = resource;
            that._tags = allTags;
            that._pickFeaturesResource = pickFeaturesResource;
            that._pickFeaturesTags = allPickFeaturesTags;

            return true;
        });
    }

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    requestImage (
        x: number,
        y: number,
        level: number,
        request: Request
    ): any {
    // >>includeStart('debug', pragmas.debug);
        if (!this.ready) {
            throw new DeveloperError(
                'requestImage must not be called before the imagery provider is ready.'
            );
        }
        // >>includeEnd('debug');
        return ImageryProvider.loadImage(
            this,
            buildImageResource(this, x, y, level, request)
        );
    }
}

let degreesScratchComputed = false;
const degreesScratch = new Rectangle();
let projectedScratchComputed = false;
const projectedScratch = new Rectangle();

function buildImageResource (imageryProvider: any, x: any, y: any, level: any, request: any) {
    degreesScratchComputed = false;
    projectedScratchComputed = false;

    const resource = imageryProvider._resource;
    const url = resource.getUrlComponent(true);
    const allTags = imageryProvider._tags;
    const templateValues = {};

    const match = url.match(templateRegex);
    if (defined(match)) {
        match.forEach(function (tag: any) {
            const key = tag.substring(1, tag.length - 1); // strip {}
            if (defined(allTags[key])) {
                templateValues[key] = allTags[key](imageryProvider, x, y, level);
            }
        });
    }

    return resource.getDerivedResource({
        request: request,
        templateValues: templateValues
    });
}

let ijScratchComputed = false;
const ijScratch = new Cartesian2();
let longitudeLatitudeProjectedScratchComputed = false;

function buildPickFeaturesResource (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format: any
) {
    degreesScratchComputed = false;
    projectedScratchComputed = false;
    ijScratchComputed = false;
    longitudeLatitudeProjectedScratchComputed = false;

    const resource = imageryProvider._pickFeaturesResource;
    const url = resource.getUrlComponent(true);
    const allTags = imageryProvider._pickFeaturesTags;
    const templateValues = {};
    const match = url.match(templateRegex);
    if (defined(match)) {
        match.forEach(function (tag: any) {
            const key = tag.substring(1, tag.length - 1); // strip {}
            if (defined(allTags[key])) {
                templateValues[key] = allTags[key](
                    imageryProvider,
                    x,
                    y,
                    level,
                    longitude,
                    latitude,
                    format
                );
            }
        });
    }

    return resource.getDerivedResource({
        templateValues: templateValues
    });
}

function padWithZerosIfNecessary (imageryProvider: any, key: any, value: any) {
    if (
        imageryProvider &&
    imageryProvider.urlSchemeZeroPadding &&
    imageryProvider.urlSchemeZeroPadding.hasOwnProperty(key)
    ) {
        const paddingTemplate = imageryProvider.urlSchemeZeroPadding[key];
        if (typeof paddingTemplate === 'string') {
            const paddingTemplateWidth = paddingTemplate.length;
            if (paddingTemplateWidth > 1) {
                value =
          value.length >= paddingTemplateWidth
              ? value
              : new Array(
                  paddingTemplateWidth - value.toString().length + 1
              ).join('0') + value;
            }
        }
    }
    return value;
}

function xTag (imageryProvider: any, x: any, y: any, level: any) {
    return padWithZerosIfNecessary(imageryProvider, '{x}', x);
}

function reverseXTag (imageryProvider: any, x: any, y: any, level: any) {
    const reverseX =
      imageryProvider.tilingScheme.getNumberOfXTilesAtLevel(level) - x - 1;
    return padWithZerosIfNecessary(imageryProvider, '{reverseX}', reverseX);
}

function yTag (imageryProvider: any, x: any, y: any, level: any) {
    return padWithZerosIfNecessary(imageryProvider, '{y}', y);
}

function reverseYTag (imageryProvider: any, x: any, y: any, level: any) {
    const reverseY =
      imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1;
    return padWithZerosIfNecessary(imageryProvider, '{reverseY}', reverseY);
}

function reverseZTag (imageryProvider: any, x: any, y: any, level: any) {
    const maximumLevel = imageryProvider.maximumLevel;
    const reverseZ =
      defined(maximumLevel) && level < maximumLevel
          ? maximumLevel - level - 1
          : level;
    return padWithZerosIfNecessary(imageryProvider, '{reverseZ}', reverseZ);
}

function zTag (imageryProvider: any, x: any, y: any, level: any) {
    return padWithZerosIfNecessary(imageryProvider, '{z}', level);
}

function sTag (imageryProvider: any, x: any, y: any, level: any) {
    const index = (x + y + level) % imageryProvider._subdomains.length;
    return imageryProvider._subdomains[index];
}

function computeDegrees (imageryProvider: any, x: any, y: any, level: any) {
    if (degreesScratchComputed) {
        return;
    }

    imageryProvider.tilingScheme.tileXYToRectangle(x, y, level, degreesScratch);
    degreesScratch.west = CesiumMath.toDegrees(degreesScratch.west);
    degreesScratch.south = CesiumMath.toDegrees(degreesScratch.south);
    degreesScratch.east = CesiumMath.toDegrees(degreesScratch.east);
    degreesScratch.north = CesiumMath.toDegrees(degreesScratch.north);

    degreesScratchComputed = true;
}

function westDegreesTag (imageryProvider: any, x: any, y: any, level: any) {
    computeDegrees(imageryProvider, x, y, level);
    return degreesScratch.west;
}

function southDegreesTag (imageryProvider: any, x: any, y: any, level: any) {
    computeDegrees(imageryProvider, x, y, level);
    return degreesScratch.south;
}

function eastDegreesTag (imageryProvider: any, x: any, y: any, level: any) {
    computeDegrees(imageryProvider, x, y, level);
    return degreesScratch.east;
}

function northDegreesTag (imageryProvider: any, x: any, y: any, level: any) {
    computeDegrees(imageryProvider, x, y, level);
    return degreesScratch.north;
}

function computeProjected (imageryProvider: any, x: any, y: any, level: any) {
    if (projectedScratchComputed) {
        return;
    }

    imageryProvider.tilingScheme.tileXYToNativeRectangle(
        x,
        y,
        level,
        projectedScratch
    );

    projectedScratchComputed = true;
}

function westProjectedTag (imageryProvider: any, x: any, y: any, level: any) {
    computeProjected(imageryProvider, x, y, level);
    return projectedScratch.west;
}

function southProjectedTag (imageryProvider: any, x: any, y: any, level: any) {
    computeProjected(imageryProvider, x, y, level);
    return projectedScratch.south;
}

function eastProjectedTag (imageryProvider: any, x: any, y: any, level: any) {
    computeProjected(imageryProvider, x, y, level);
    return projectedScratch.east;
}

function northProjectedTag (imageryProvider: any, x: any, y: any, level: any) {
    computeProjected(imageryProvider, x, y, level);
    return projectedScratch.north;
}

function widthTag (imageryProvider: any, x: any, y: any, level: any) {
    return imageryProvider.tileWidth;
}

function heightTag (imageryProvider: any, x: any, y: any, level: any) {
    return imageryProvider.tileHeight;
}

function iTag (imageryProvider: any, x: any, y: any, level: any, longitude: any, latitude: any, format: any) {
    computeIJ(imageryProvider, x, y, level, longitude, latitude);
    return ijScratch.x;
}

function jTag (imageryProvider: any, x: any, y: any, level: any, longitude: any, latitude: any, format: any) {
    computeIJ(imageryProvider, x, y, level, longitude, latitude);
    return ijScratch.y;
}

function reverseITag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    computeIJ(imageryProvider, x, y, level, longitude, latitude);
    return imageryProvider.tileWidth - ijScratch.x - 1;
}

function reverseJTag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    computeIJ(imageryProvider, x, y, level, longitude, latitude);
    return imageryProvider.tileHeight - ijScratch.y - 1;
}

const rectangleScratch = new Rectangle();
const longitudeLatitudeProjectedScratch = new Cartesian3();

function computeIJ (imageryProvider: any, x: number, y: number, level: number, longitude: number, latitude: number, format?: any) {
    if (ijScratchComputed) {
        return;
    }

    computeLongitudeLatitudeProjected(
        imageryProvider,
        x,
        y,
        level,
        longitude,
        latitude
    );
    const projected = longitudeLatitudeProjectedScratch;

    const rectangle = imageryProvider.tilingScheme.tileXYToNativeRectangle(
        x,
        y,
        level,
        rectangleScratch
    );
    ijScratch.x =
      ((imageryProvider.tileWidth * (projected.x - rectangle.west)) /
        rectangle.width) |
      0;
    ijScratch.y =
      ((imageryProvider.tileHeight * (rectangle.north - projected.y)) /
        rectangle.height) |
      0;
    ijScratchComputed = true;
}

function longitudeDegreesTag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    return CesiumMath.toDegrees(longitude);
}

function latitudeDegreesTag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    return CesiumMath.toDegrees(latitude);
}

function longitudeProjectedTag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    computeLongitudeLatitudeProjected(
        imageryProvider,
        x,
        y,
        level,
        longitude,
        latitude
    );
    return longitudeLatitudeProjectedScratch.x;
}

function latitudeProjectedTag (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    computeLongitudeLatitudeProjected(
        imageryProvider,
        x,
        y,
        level,
        longitude,
        latitude
    );
    return longitudeLatitudeProjectedScratch.y;
}

const cartographicScratch = new Cartographic();

function computeLongitudeLatitudeProjected (
    imageryProvider: any,
    x: any,
    y: any,
    level: any,
    longitude: any,
    latitude: any,
    format?: any
) {
    if (longitudeLatitudeProjectedScratchComputed) {
        return;
    }

    if (imageryProvider.tilingScheme.projection instanceof GeographicProjection) {
        longitudeLatitudeProjectedScratch.x = CesiumMath.toDegrees(longitude);
        longitudeLatitudeProjectedScratch.y = CesiumMath.toDegrees(latitude);
    } else {
        const cartographic = cartographicScratch;
        cartographic.longitude = longitude;
        cartographic.latitude = latitude;
        imageryProvider.tilingScheme.projection.project(
            cartographic,
            longitudeLatitudeProjectedScratch
        );
    }

    longitudeLatitudeProjectedScratchComputed = true;
}

function formatTag (imageryProvider: any, x: any, y: any, level: any, longitude: any, latitude: any, format: any) {
    return format;
}

export { UrlTemplateImageryProvider };
