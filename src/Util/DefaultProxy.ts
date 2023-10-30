class DefaultProxy {
    proxy: string
    constructor (proxy: string) {
        this.proxy = proxy;
    }

    /**
     * Get the final URL to use to request a given resource.
     *
     * @param {String} resource The resource to request.
     * @returns {String} proxied resource
     */
    getURL (resource: string): string {
        const prefix = this.proxy.indexOf('?') === -1 ? '?' : '';
        return this.proxy + prefix + encodeURIComponent(resource);
    }
}

export { DefaultProxy };
