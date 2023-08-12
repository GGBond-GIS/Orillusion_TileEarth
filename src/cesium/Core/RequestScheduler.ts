/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-useless-constructor */

import { defaultValue } from './defaultValue';
import { defined } from './defined';
import { Event } from './Event';
import { Heap } from './Heap';
import { isBlobUri } from './isBlobUri';
import { isDataUri } from './isDataUri';
import { RequestState } from './RequestState';
import { URI as Uri } from '../ThirdParty/Uri';
import { when } from '../ThirdParty/when';
import { Request } from './Request';

function sortRequests (a:any, b: any) {
    return a.priority - b.priority;
}
type statisticsType ={
    numberOfAttemptedRequests: number,
    numberOfActiveRequests: number,
    numberOfCancelledRequests: number,
    numberOfCancelledActiveRequests: number,
    numberOfFailedRequests: number,
    numberOfActiveRequestsEver: number
}

const statistics: statisticsType = {
    numberOfAttemptedRequests: 0,
    numberOfActiveRequests: 0,
    numberOfCancelledRequests: 0,
    numberOfCancelledActiveRequests: 0,
    numberOfFailedRequests: 0,
    numberOfActiveRequestsEver: 0
};

let priorityHeapLength = 20;
const requestHeap = new Heap({
    comparator: sortRequests
});
requestHeap.maximumLength = priorityHeapLength;
requestHeap.reserve(priorityHeapLength);

const activeRequests: any[] = [];
let numberOfActiveRequestsByServer = {};

const pageUri = typeof document !== 'undefined'
    ? new Uri(document.location.href)
    : new Uri();

const requestCompletedEvent = new Event();

/**
 * Tracks the number of active requests and prioritizes incoming requests.
 *
 * @exports RequestScheduler
 *
 * @private
 */
class RequestScheduler {
    constructor () {

    }

    /**
     * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
     * @type {Number}
     * @default 50
     */
     static maximumRequests = 50;

     /**
     * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
     * listed in requestsByServer do not observe this limit.
     * @type {Number}
     * @default 6
     */
    static maximumRequestsPerServer = 6;

    /**
     * A per serverKey list of overrides to use for throttling instead of maximumRequestsPerServer
     */
    static requestsByServer = {
        'api.cesium.com:443': 18,
        'assets.cesium.com:443': 18
    };

    /**
     * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
     * @type {Boolean}
     * @default true
     */
    static throttleRequests = true;

    /**
     * When true, log statistics to the console every frame
     * @type {Boolean}
     * @default false
     */
    static debugShowStatistics = false;

    /**
     * An event that's raised when a request is completed.  Event handlers are passed
     * the error object if the request fails.
     *
     * @type {Event}
     * @default Event()
     */
    static requestCompletedEvent = requestCompletedEvent;

    /**
     * Returns the statistics used by the request scheduler.
     *
     * @memberof RequestScheduler
     *
     * @type Object
     * @readonly
     */
    get statistics ():statisticsType {
        return statistics;
    }

    /**
     * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
     *
     * @memberof RequestScheduler
     *
     * @type {Number}
     * @default 20
     */
    get priorityHeapLength (): number {
        return priorityHeapLength;
    }

    set priorityHeapLength (value) {
        // If the new length shrinks the heap, need to cancel some of the requests.
        // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
        if (value < priorityHeapLength) {
            while (requestHeap.length > value) {
                const request = requestHeap.pop();
                cancelRequest(request);
            }
        }
        priorityHeapLength = value;
        requestHeap.maximumLength = value;
        requestHeap.reserve(value);
    }

    /**
     * Sort requests by priority and start requests.
     */
    static update (): void {
        let i;
        let request;

        // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
        let removeCount = 0;
        const activeLength = activeRequests.length;
        for (i = 0; i < activeLength; ++i) {
            request = activeRequests[i];
            if (request.cancelled) {
            // Request was explicitly cancelled
                cancelRequest(request);
            }
            if (request.state !== RequestState.ACTIVE) {
            // Request is no longer active, remove from array
                ++removeCount;
                continue;
            }
            if (removeCount > 0) {
            // Shift back to fill in vacated slots from completed requests
                activeRequests[i - removeCount] = request;
            }
        }
        activeRequests.length -= removeCount;

        // Update priority of issued requests and resort the heap
        const issuedRequests = requestHeap.internalArray;
        const issuedLength = requestHeap.length;
        for (i = 0; i < issuedLength; ++i) {
            updatePriority(issuedRequests[i]);
        }
        requestHeap.resort();

        // Get the number of open slots and fill with the highest priority requests.
        // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
        const openSlots = Math.max(RequestScheduler.maximumRequests - activeRequests.length, 0);
        let filledSlots = 0;
        while (filledSlots < openSlots && requestHeap.length > 0) {
        // Loop until all open slots are filled or the heap becomes empty
            request = requestHeap.pop();
            if (request.cancelled) {
            // Request was explicitly cancelled
                cancelRequest(request);
                continue;
            }

            if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
            // Open slots are available, but the request is throttled by its server. Cancel and try again later.
                cancelRequest(request);
                continue;
            }

            startRequest(request);
            ++filledSlots;
        }

        updateStatistics();
    }

    /**
     * Get the server key from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server key.
     */
    static getServerKey (url: string): string {
        const uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        let serverKey = uri.authority;
        if (!(/:/).test(serverKey)) {
        // If the authority does not contain a port number, add port 443 for https or port 80 for http
            serverKey = serverKey + ':' + (uri.scheme === 'https'
                ? '443'
                : '80');
        }

        const length = numberOfActiveRequestsByServer[serverKey];
        if (!defined(length)) {
            numberOfActiveRequestsByServer[serverKey] = 0;
        }

        return serverKey;
    }

    /**
     * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
     * queued and sorted by priority before being sent.
     *
     * @param {Request} request The request object.
     *
     * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
     */
    static request (request:any): any {
        if (isDataUri((request.url as string)) || isBlobUri((request.url as string))) {
            requestCompletedEvent.raiseEvent();
            request.state = RequestState.RECEIVED;
            return (request.requestFunction() as any);
        }

        ++statistics.numberOfAttemptedRequests;

        if (!defined(request.serverKey)) {
            request.serverKey = RequestScheduler.getServerKey(request.url);
        }

        if (!RequestScheduler.throttleRequests || !request.throttle) {
            return startRequest(request);
        }

        if (activeRequests.length >= RequestScheduler.maximumRequests) {
        // Active requests are saturated. Try again later.
            return undefined;
        }

        if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
        // Server is saturated. Try again later.
            return undefined;
        }

        // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
        // priority it will be returned.
        updatePriority(request);
        const removedRequest = requestHeap.insert(request);

        if (defined(removedRequest)) {
            if (removedRequest === request) {
            // Request does not have high enough priority to be issued
                return undefined;
            }
            // A previously issued request has been bumped off the priority heap, so cancel it
            cancelRequest(removedRequest);
        }

        return issueRequest(request);
    }

    /**
     * For testing only. Clears any requests that may not have completed from previous tests.
     *
     * @private
     */
    static clearForSpecs () {
        while (requestHeap.length > 0) {
            const request = requestHeap.pop();
            cancelRequest(request);
        }
        const length = activeRequests.length;
        for (let i = 0; i < length; ++i) {
            cancelRequest(activeRequests[i]);
        }
        activeRequests.length = 0;
        numberOfActiveRequestsByServer = {};

        // Clear stats
        statistics.numberOfAttemptedRequests = 0;
        statistics.numberOfActiveRequests = 0;
        statistics.numberOfCancelledRequests = 0;
        statistics.numberOfCancelledActiveRequests = 0;
        statistics.numberOfFailedRequests = 0;
        statistics.numberOfActiveRequestsEver = 0;
    }

    /**
 * For testing only.
 *
 * @private
 */
    static numberOfActiveRequestsByServer (serverKey: any) {
        return numberOfActiveRequestsByServer[serverKey];
    }

/**
 * For testing only.
 *
 * @private
 */
static requestHeap = requestHeap;
}

function updatePriority (request: Request) {
    if (defined(request.priorityFunction)) {
        request.priority = (request.cancelFunction as any)();
    }
}

function serverHasOpenSlots (serverKey: any) {
    const maxRequests = defaultValue(RequestScheduler.requestsByServer[serverKey], RequestScheduler.maximumRequestsPerServer);
    return numberOfActiveRequestsByServer[serverKey] < maxRequests;
}

function issueRequest (request:Request) {
    if (request.state === RequestState.UNISSUED) {
        request.state = RequestState.ISSUED;
        request.deferred = when.defer();
    }
    return request.deferred.promise;
}

function getRequestReceivedFunction (request:Request) {
    return function (results:Request) {
        if (request.state === RequestState.CANCELLED) {
            // If the data request comes back but the request is cancelled, ignore it.
            return;
        }
        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[(request.serverKey as string)];
        requestCompletedEvent.raiseEvent();
        request.state = RequestState.RECEIVED;
        request.deferred.resolve(results);
    };
}

function getRequestFailedFunction (request: Request) {
    return function (error: any) {
        if (request.state === RequestState.CANCELLED) {
            // If the data request comes back but the request is cancelled, ignore it.
            return;
        }
        ++statistics.numberOfFailedRequests;
        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[(request.serverKey as string)];
        requestCompletedEvent.raiseEvent(error);
        request.state = RequestState.FAILED;
        request.deferred.reject(error);
    };
}

function startRequest (request: Request) {
    const promise = issueRequest(request);
    request.state = RequestState.ACTIVE;
    activeRequests.push(request);
    ++statistics.numberOfActiveRequests;
    ++statistics.numberOfActiveRequestsEver;
    ++numberOfActiveRequestsByServer[request.serverKey as string];
    (request.requestFunction as any)()
        .then(getRequestReceivedFunction(request))
        .otherwise(getRequestFailedFunction(request));
    return promise;
}

function cancelRequest (request: Request) {
    const active = request.state === RequestState.ACTIVE;
    request.state = RequestState.CANCELLED;
    ++statistics.numberOfCancelledRequests;
    request.deferred.reject();

    if (active) {
        --statistics.numberOfActiveRequests;
        --numberOfActiveRequestsByServer[(request.serverKey as string)];
        ++statistics.numberOfCancelledActiveRequests;
    }

    if (defined(request.cancelFunction)) {
        (request.cancelFunction as any)();
    }
}

function clearStatistics () {
    statistics.numberOfAttemptedRequests = 0;
    statistics.numberOfCancelledRequests = 0;
    statistics.numberOfCancelledActiveRequests = 0;
}

function updateStatistics () {
    if (!RequestScheduler.debugShowStatistics) {
        return;
    }

    if (statistics.numberOfAttemptedRequests > 0) {
        console.log('Number of attempted requests: ' + statistics.numberOfAttemptedRequests);
    }
    if (statistics.numberOfActiveRequests > 0) {
        console.log('Number of active requests: ' + statistics.numberOfActiveRequests);
    }
    if (statistics.numberOfCancelledRequests > 0) {
        console.log('Number of cancelled requests: ' + statistics.numberOfCancelledRequests);
    }
    if (statistics.numberOfCancelledActiveRequests > 0) {
        console.log('Number of cancelled active requests: ' + statistics.numberOfCancelledActiveRequests);
    }
    if (statistics.numberOfFailedRequests > 0) {
        console.log('Number of failed requests: ' + statistics.numberOfFailedRequests);
    }

    clearStatistics();
}

export { RequestScheduler };
