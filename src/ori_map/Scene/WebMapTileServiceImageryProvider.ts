import { combine } from '../Core/combine';
import { Request } from '../Core/Request';
import { Cartesian2 } from '../Core/Cartesian2';
import { Credit } from '../Core/Credit';
import { defaultValue } from '../Core/defaultValue';
import { defined } from '../Core/defined';
import { DeveloperError } from '../Core/DeveloperError';
import { Event } from '../Core/Event';
import { Rectangle } from '../Core/Rectangle';
import { Resource } from '../Core/Resource';
import { when } from '../ThirdParty/when';
import { ImageryProvider } from './ImageryProvider';
import { WebMercatorTilingScheme } from './WebMercatorTilingScheme';

const defaultParameters = {
    service: 'WMTS',
    version: '1.0.0',
    request: 'GetTile'
};

function requestImage (imageryProvider: WebMapTileServiceImageryProvider, col: number, row: number, level: number, request:Request, interval?: any) {
    const labels = imageryProvider._tileMatrixLabels;
    const tileMatrix = defined(labels) ? labels[level] : level.toString();
    const subdomains = imageryProvider._subdomains;
    const staticDimensions = imageryProvider._dimensions;
    const dynamicIntervalData = defined(interval) ? interval.data : undefined;

    let resource;
    let templateValues;
    if (!imageryProvider._useKvp) {
        templateValues = {
            TileMatrix: tileMatrix,
            TileRow: row.toString(),
            TileCol: col.toString(),
            s: subdomains[(col + row + level) % subdomains.length]
        };

        resource = imageryProvider._resource.getDerivedResource({
            request: request
        });
        resource.setTemplateValues(templateValues);

        if (defined(staticDimensions)) {
            resource.setTemplateValues(staticDimensions);
        }

        if (defined(dynamicIntervalData)) {
            resource.setTemplateValues(dynamicIntervalData);
        }
    } else {
        // build KVP request
        let query: any = {};
        query.tilematrix = tileMatrix;
        query.layer = imageryProvider._layer;
        query.style = imageryProvider._style;
        query.tilerow = row;
        query.tilecol = col;
        query.tilematrixset = imageryProvider._tileMatrixSetID;
        query.format = imageryProvider._format;

        if (defined(staticDimensions)) {
            query = combine(query, staticDimensions);
        }

        if (defined(dynamicIntervalData)) {
            query = combine(query, dynamicIntervalData);
        }

        templateValues = {
            s: subdomains[(col + row + level) % subdomains.length]
        };

        resource = imageryProvider._resource.getDerivedResource({
            queryParameters: query,
            request: request
        });
        resource.setTemplateValues(templateValues);
    }

    return ImageryProvider.loadImage(imageryProvider, resource);
}

class WebMapTileServiceImageryProvider {
    _tilingScheme: any;
    defaultAlpha?: number;
    defaultNightAlpha?: number;
    defaultDayAlpha?: number;
    defaultBrightness?: number;
    defaultContrast?: number;
    _useKvp: boolean;
    _resource: Resource;
    _layer: string;
    _style: string;
    _tileMatrixSetID: string;
    _tileWidth: number;
    _tileHeight: number;
    _tileMatrixLabels?: any;
    _format: string;
    _tileDiscardPolicy: any;
    _minimumLevel: number;
    _maximumLevel?: number;
    _rectangle: Rectangle;
    _dimensions?: Cartesian2;
    _reload: any;
    _readyPromise: any;
    _errorEvent: Event;
    _subdomains: any;
    _credit: any
    constructor (options: {
        url: string;
        layer: string;
        style: string;
        tileMatrixSetID: string;
        tileMatrixLabels?: any;
        format?: string;
        tileDiscardPolicy?: any;
        tilingScheme?: any;
        tileWidth?: number;
        tileHeight?: number;
        minimumLevel?: number;
        maximumLevel?: number;
        rectangle?: Rectangle;
        dimensions?: Cartesian2;
        times?: any;
        ellipsoid?: any;
        subdomains?: any;
        credit?: any;
    }) {
        // options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        // >>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.layer)) {
            throw new DeveloperError('options.layer is required.');
        }
        if (!defined(options.style)) {
            throw new DeveloperError('options.style is required.');
        }
        if (!defined(options.tileMatrixSetID)) {
            throw new DeveloperError('options.tileMatrixSetID is required.');
        }
        // if (defined(options.times) && !defined(options.clock)) {
        //     throw new DeveloperError(
        //         'options.times was specified, so options.clock is required.'
        //     );
        // }
        // >>includeEnd('debug');

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

        // /**
        //  * The default hue of this provider in radians. 0.0 uses the unmodified imagery color.
        //  *
        //  * @type {Number|undefined}
        //  * @default undefined
        //  */
        // this.defaultHue = undefined;

        // /**
        //  * The default saturation of this provider. 1.0 uses the unmodified imagery color. Less than 1.0 reduces the
        //  * saturation while greater than 1.0 increases it.
        //  *
        //  * @type {Number|undefined}
        //  * @default undefined
        //  */
        // this.defaultSaturation = undefined;

        // /**
        //  * The default gamma correction to apply to this provider.  1.0 uses the unmodified imagery color.
        //  *
        //  * @type {Number|undefined}
        //  * @default undefined
        //  */
        // this.defaultGamma = undefined;

        // /**
        //  * The default texture minification filter to apply to this provider.
        //  *
        //  * @type {TextureMinificationFilter}
        //  * @default undefined
        //  */
        // this.defaultMinificationFilter = undefined;

        // /**
        //  * The default texture magnification filter to apply to this provider.
        //  *
        //  * @type {TextureMagnificationFilter}
        //  * @default undefined
        //  */
        // this.defaultMagnificationFilter = undefined;

        const resource = Resource.createIfNeeded(options.url);

        const style = options.style;
        const tileMatrixSetID = options.tileMatrixSetID;
        const url = resource.url;

        const bracketMatch = url.match(/{/g) as any;
        if (
            !defined(bracketMatch) ||
          (bracketMatch.length === 1 && /{s}/.test(url))
        ) {
            resource.setQueryParameters(defaultParameters);
            this._useKvp = true;
        } else {
            const templateValues = {
                style: style,
                Style: style,
                TileMatrixSet: tileMatrixSetID
            };

            resource.setTemplateValues(templateValues);
            this._useKvp = false;
        }

        this._resource = resource;
        this._layer = options.layer;
        this._style = style;
        this._tileMatrixSetID = tileMatrixSetID;
        this._tileMatrixLabels = options.tileMatrixLabels;
        this._format = defaultValue(options.format, 'image/jpeg') as string;
        this._tileDiscardPolicy = options.tileDiscardPolicy;

        this._tilingScheme = defined(options.tilingScheme)
            ? options.tilingScheme
            : new WebMercatorTilingScheme({ ellipsoid: options.ellipsoid });
        this._tileWidth = defaultValue(options.tileWidth, 256) as number;
        this._tileHeight = defaultValue(options.tileHeight, 256) as number;

        this._minimumLevel = defaultValue(options.minimumLevel, 0) as number;
        this._maximumLevel = options.maximumLevel;

        this._rectangle = defaultValue(
            options.rectangle,
            this._tilingScheme.rectangle
        );
        this._dimensions = options.dimensions;

        const that = this;
        this._reload = undefined;
        // if (defined(options.times)) {
        //     this._timeDynamicImagery = new TimeDynamicImagery({
        //         clock: options.clock,
        //         times: options.times,
        //         requestImageFunction: function (x, y, level, request, interval) {
        //             return requestImage(that, x, y, level, request, interval);
        //         },
        //         reloadFunction: function () {
        //             if (defined(that._reload)) {
        //                 that._reload();
        //             }
        //         }
        //     });
        // }

        this._readyPromise = when.resolve(true);

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        const swTile = this._tilingScheme.positionToTileXY(
            Rectangle.southwest(this._rectangle),
            this._minimumLevel
        );
        const neTile = this._tilingScheme.positionToTileXY(
            Rectangle.northeast(this._rectangle),
            this._minimumLevel
        );
        const tileCount =
          (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        // >>includeStart('debug', pragmas.debug);
        if (tileCount > 4) {
            throw new DeveloperError(
                "The imagery provider's rectangle and minimumLevel indicate that there are " +
              tileCount +
              ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.'
            );
        }
        // >>includeEnd('debug');

        this._errorEvent = new Event();

        const credit = options.credit;
        this._credit = typeof credit === 'string' ? new Credit(credit) : credit;

        this._subdomains = options.subdomains;
        if (Array.isArray(this._subdomains)) {
            this._subdomains = this._subdomains.slice();
        } else if (defined(this._subdomains) && this._subdomains.length > 0) {
            this._subdomains = this._subdomains.split('');
        } else {
            this._subdomains = ['a', 'b', 'c'];
        }
    }

    /**
     * Gets the URL of the service hosting the imagery.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {String}
     * @readonly
     */
    get url (): string {
        return this._resource.url;
    }

    /**
     * Gets the proxy used by this provider.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Proxy}
     * @readonly
     */
    get proxy (): any {
        return this._resource.proxy;
    }

    /**
     * Gets the width of each tile, in pixels. This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get tileWidth (): number {
        return this._tileWidth;
    }

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
     * @memberof WebMapTileServiceImageryProvider.prototype
     * @type {Number}
     * @readonly
     */
    get tileHeight (): number {
        return this._tileHeight;
    }

    get maximumLevel (): number {
        return this._maximumLevel as number;
    }

    get minimumLevel (): number {
        return this._minimumLevel;
    }

    get tilingScheme (): WebMercatorTilingScheme {
        return this._tilingScheme;
    }

    get rectangle (): Rectangle {
        return this._rectangle;
    }

    get errorEvent (): Event {
        return this._errorEvent;
    }

    get format (): string {
        return this._format;
    }

    get ready (): boolean {
        return true;
    }

    get readyPromise ():any {
        return this._readyPromise;
    }

    get dimensions ():Cartesian2 {
        return this._dimensions as Cartesian2;
    }

    /**
 * Requests the image for a given tile.  This function should
 * not be called before {@link WebMapTileServiceImageryProvider#ready} returns true.
 *
 * @param {Number} x The tile X coordinate.
 * @param {Number} y The tile Y coordinate.
 * @param {Number} level The tile level.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<HTMLImageElement|HTMLCanvasElement>|undefined} A promise for the image that will resolve when the image is available, or
 *          undefined if there are too many active requests to the server, and the request
 *          should be retried later.  The resolved image may be either an
 *          Image or a Canvas DOM object.
 *
 * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
 */
    requestImage (
        x: number,
        y: number,
        level: number,
        request: Request
    ): any {
        let result;
        // const timeDynamicImagery = this._timeDynamicImagery;
        let currentInterval;

        // // Try and load from cache
        // if (defined(timeDynamicImagery)) {
        //     currentInterval = timeDynamicImagery.currentInterval;
        //     result = timeDynamicImagery.getFromCache(x, y, level, request);
        // }

        // Couldn't load from cache
        if (!defined(result)) {
            result = requestImage(this, x, y, level, request, currentInterval);
        }

        // If we are approaching an interval, preload this tile in the next interval
        // if (defined(result) && defined(timeDynamicImagery)) {
        //     timeDynamicImagery.checkApproachingInterval(x, y, level, request);
        // }

        return result;
    }
}

export { WebMapTileServiceImageryProvider };
