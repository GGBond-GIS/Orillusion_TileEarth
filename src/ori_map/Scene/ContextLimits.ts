const ContextLimits = {
    _maxAnisotropy: 0,

    _maximumTextureImageUnits: 0,

    get maxAnisotropy (): number {
        return ContextLimits._maxAnisotropy;
    },

    get maximumTextureImageUnits (): number {
        return ContextLimits._maximumTextureImageUnits;
    }
};

export { ContextLimits };
