
import HeightmapTessellator from './HeightmapTessellator';
import Lerc from './../ThirdParty/LercDecode';
import { Ellipsoid } from './Ellipsoid';
import { Rectangle } from './Rectangle';
import { HeightmapEncoding } from './HeightmapEncoding';
import { DeveloperError } from './DeveloperError';
// import createTaskProcessorWorker from "./createTaskProcessorWorker";

function createVerticesFromHeightmap (parameters: any, transferableObjects:any[]): any {
    // LERC encoded buffers must be decoded, then we can process them like normal
    if (parameters.encoding === HeightmapEncoding.LERC) {
        let result;
        try {
            result = Lerc.decode(parameters.heightmap);
        } catch (error) {
            throw new DeveloperError(error as string);
        }

        const lercStatistics = result.statistics[0];
        if (lercStatistics.minValue === Number.MAX_VALUE) {
            throw new DeveloperError('Invalid tile data');
        }

        parameters.heightmap = result.pixels[0];
        parameters.width = result.width;
        parameters.height = result.height;
    }

    parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
    parameters.rectangle = Rectangle.clone(parameters.rectangle);

    const statistics = HeightmapTessellator.computeVertices(parameters);
    const vertices = statistics.vertices;
    transferableObjects.push(vertices.buffer);

    return {
        vertices: vertices.buffer,
        numberOfAttributes: statistics.encoding.stride,
        minimumHeight: statistics.minimumHeight,
        maximumHeight: statistics.maximumHeight,
        gridWidth: parameters.width,
        gridHeight: parameters.height,
        boundingSphere3D: statistics.boundingSphere3D,
        orientedBoundingBox: statistics.orientedBoundingBox,
        occludeePointInScaledSpace: statistics.occludeePointInScaledSpace,
        encoding: statistics.encoding,
        westIndicesSouthToNorth: statistics.westIndicesSouthToNorth,
        southIndicesEastToWest: statistics.southIndicesEastToWest,
        eastIndicesNorthToSouth: statistics.eastIndicesNorthToSouth,
        northIndicesWestToEast: statistics.northIndicesWestToEast
    };
}

export { createVerticesFromHeightmap };
