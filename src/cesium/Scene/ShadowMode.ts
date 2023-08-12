export enum ShadowModeEnum {
    DISABLED = 0,

    ENABLED = 1,

    CAST_ONLY = 2,

    RECEIVE_ONLY = 3,
}

const ShadowMode = {
    /**
   * The object does not cast or receive shadows.
   *
   * @type {Number}
   * @constant
   */
    DISABLED: 0,

    /**
    * The object casts and receives shadows.
    *
    * @type {Number}
    * @constant
    */
    ENABLED: 1,

    /**
    * The object casts shadows only.
    *
    * @type {Number}
    * @constant
    */
    CAST_ONLY: 2,

    /**
    * The object receives shadows only.
    *
    * @type {Number}
    * @constant
    */
    RECEIVE_ONLY: 3,

    NUMBER_OF_SHADOW_MODES: 4,

    /**
     * @private
     */
    castShadows  (shadowMode: ShadowModeEnum):boolean {
        return (
            shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.CAST_ONLY
        );
    },

    /**
     * @private
     */
    receiveShadows  (shadowMode: ShadowModeEnum): boolean {
        return (
            shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.RECEIVE_ONLY
        );
    },

    /**
    * @private
    */
    fromCastReceive  (castShadows: boolean, receiveShadows: boolean): ShadowModeEnum {
        if (castShadows && receiveShadows) {
            return ShadowMode.ENABLED;
        } else if (castShadows) {
            return ShadowMode.CAST_ONLY;
        } else if (receiveShadows) {
            return ShadowMode.RECEIVE_ONLY;
        }
        return ShadowMode.DISABLED;
    }
};

export { ShadowMode };
