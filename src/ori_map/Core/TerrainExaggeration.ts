import { Cartesian3 } from './Cartesian3';
import { Cartographic } from './Cartographic';
import { Ellipsoid } from './Ellipsoid';

const scratchCartographic = new Cartographic();

/**
 * @private
 */
const TerrainExaggeration = {
    /**
  * Scales a position by exaggeration.
  */
    getPosition: function (
        position:Cartesian3,
        ellipsoid:Ellipsoid,
        terrainExaggeration: number,
        terrainExaggerationRelativeHeight: number,
        result:Cartesian3
    ) {
        const cartographic = ellipsoid.cartesianToCartographic(
            position,
            scratchCartographic
        ) as Cartographic;
        const newHeight = TerrainExaggeration.getHeight(
            cartographic.height,
            terrainExaggeration,
            terrainExaggerationRelativeHeight
        );
        return Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            newHeight,
            ellipsoid,
            result
        );
    },
    /**
  * Scales a height relative to an offset.
  *
  * @param {Number} height The height.
  * @param {Number} scale A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
  * @param {Number} relativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
  */
    getHeight: (height: number, scale: number, relativeHeight: number) => {
        return (height - relativeHeight) * scale + relativeHeight;
    }
};

export { TerrainExaggeration };
