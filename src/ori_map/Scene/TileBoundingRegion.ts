import { BoundingSphere } from '../Core/BoundingSphere';
import { Cartesian3 } from '../Core/Cartesian3';
import { Cartographic } from '../Core/Cartographic';
import { defaultValue } from '../Core/defaultValue';
import { Ellipsoid } from '../Core/Ellipsoid';
import { IntersectionTests } from '../Core/IntersectionTests';
import { OrientedBoundingBox } from '../Core/OrientedBoundingBox';
import { Plane } from '../Core/Plane';
import { Ray } from '../Core/Ray';
import { Rectangle } from '../Core/Rectangle';
import { SceneMode } from '../Core/SceneMode';
import { FrameState } from './FrameState';

const cartesian3Scratch = new Cartesian3();
const cartesian3Scratch2 = new Cartesian3();
const cartesian3Scratch3 = new Cartesian3();
const eastWestNormalScratch = new Cartesian3();
const westernMidpointScratch = new Cartesian3();
const easternMidpointScratch = new Cartesian3();
const cartographicScratch = new Cartographic();
const planeScratch = new Plane(Cartesian3.UNIT_X, 0.0);
const rayScratch = new Ray();

const southwestCornerScratch = new Cartesian3();
const northeastCornerScratch = new Cartesian3();
const negativeUnitY = new Cartesian3(0.0, -1.0, 0.0);
const negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
const vectorScratch = new Cartesian3();

function computeBox (tileBB: TileBoundingRegion, rectangle:Rectangle, ellipsoid:Ellipsoid) {
    ellipsoid.cartographicToCartesian(
        Rectangle.southwest(rectangle),
        tileBB.southwestCornerCartesian
    );
    ellipsoid.cartographicToCartesian(
        Rectangle.northeast(rectangle),
        tileBB.northeastCornerCartesian
    );

    // The middle latitude on the western edge.
    cartographicScratch.longitude = rectangle.west;
    cartographicScratch.latitude = (rectangle.south + rectangle.north) * 0.5;
    cartographicScratch.height = 0.0;
    const westernMidpointCartesian = ellipsoid.cartographicToCartesian(
        cartographicScratch,
        westernMidpointScratch
    );

    // Compute the normal of the plane on the western edge of the tile.
    const westNormal = Cartesian3.cross(
        westernMidpointCartesian,
        Cartesian3.UNIT_Z,
        cartesian3Scratch
    );
    Cartesian3.normalize(westNormal, tileBB.westNormal);

    // The middle latitude on the eastern edge.
    cartographicScratch.longitude = rectangle.east;
    const easternMidpointCartesian = ellipsoid.cartographicToCartesian(
        cartographicScratch,
        easternMidpointScratch
    );

    // Compute the normal of the plane on the eastern edge of the tile.
    const eastNormal = Cartesian3.cross(
        Cartesian3.UNIT_Z,
        easternMidpointCartesian,
        cartesian3Scratch
    );
    Cartesian3.normalize(eastNormal, tileBB.eastNormal);

    // Compute the normal of the plane bounding the southern edge of the tile.
    const westVector = Cartesian3.subtract(
        westernMidpointCartesian,
        easternMidpointCartesian,
        cartesian3Scratch
    );
    const eastWestNormal = Cartesian3.normalize(westVector, eastWestNormalScratch);

    const south = rectangle.south;
    let southSurfaceNormal: any;

    if (south > 0.0) {
    // Compute a plane that doesn't cut through the tile.
        cartographicScratch.longitude = (rectangle.west + rectangle.east) * 0.5;
        cartographicScratch.latitude = south;
        const southCenterCartesian = ellipsoid.cartographicToCartesian(
            cartographicScratch,
            rayScratch.origin
        );
        Cartesian3.clone(eastWestNormal, rayScratch.direction);
        const westPlane = Plane.fromPointNormal(
            tileBB.southwestCornerCartesian,
            tileBB.westNormal,
            planeScratch
        );
        // Find a point that is on the west and the south planes
        IntersectionTests.rayPlane(
            rayScratch,
            westPlane,
            tileBB.southwestCornerCartesian
        );
        southSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
            southCenterCartesian,
            cartesian3Scratch2
        );
    } else {
        southSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
            Rectangle.southeast(rectangle),
            cartesian3Scratch2
        );
    }
    const southNormal = Cartesian3.cross(
        southSurfaceNormal,
        westVector,
        cartesian3Scratch3
    );
    Cartesian3.normalize(southNormal, tileBB.southNormal);

    // Compute the normal of the plane bounding the northern edge of the tile.
    const north = rectangle.north;
    let northSurfaceNormal: any;
    if (north < 0.0) {
    // Compute a plane that doesn't cut through the tile.
        cartographicScratch.longitude = (rectangle.west + rectangle.east) * 0.5;
        cartographicScratch.latitude = north;
        const northCenterCartesian = ellipsoid.cartographicToCartesian(
            cartographicScratch,
            rayScratch.origin
        );
        Cartesian3.negate(eastWestNormal, rayScratch.direction);
        const eastPlane = Plane.fromPointNormal(
            tileBB.northeastCornerCartesian,
            tileBB.eastNormal,
            planeScratch
        );
        // Find a point that is on the east and the north planes
        IntersectionTests.rayPlane(
            rayScratch,
            eastPlane,
            tileBB.northeastCornerCartesian
        );
        northSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
            northCenterCartesian,
            cartesian3Scratch2
        );
    } else {
        northSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
            Rectangle.northwest(rectangle),
            cartesian3Scratch2
        );
    }
    const northNormal = Cartesian3.cross(
        westVector,
        northSurfaceNormal,
        cartesian3Scratch3
    );
    Cartesian3.normalize(northNormal, tileBB.northNormal);
}

class TileBoundingRegion {
    rectangle: Rectangle;
    minimumHeight: number;
    maximumHeight: number;
    southwestCornerCartesian: Cartesian3;
    northeastCornerCartesian: Cartesian3;
    westNormal: Cartesian3;
    southNormal: Cartesian3;
    eastNormal: Cartesian3;
    northNormal: Cartesian3;
    _orientedBoundingBox?: OrientedBoundingBox;
    _boundingSphere?: BoundingSphere;
    constructor (options: {
        rectangle: Rectangle;
        minimumHeight?: number;
        maximumHeight?: number;
        ellipsoid?: Ellipsoid;
        computeBoundingVolumes?: boolean;
    }) {
        this.rectangle = Rectangle.clone(options.rectangle) as Rectangle;
        this.minimumHeight = defaultValue(options.minimumHeight, 0.0) as number;
        this.maximumHeight = defaultValue(options.maximumHeight, 0.0) as number;

        /**
         * The world coordinates of the southwest corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northeastCornerCartesian = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.westNormal = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.eastNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northNormal = new Cartesian3();

        const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84) as Ellipsoid;
        computeBox(this, options.rectangle, ellipsoid);

        this._orientedBoundingBox = undefined;
        this._boundingSphere = undefined;

        if (defaultValue(options.computeBoundingVolumes, true)) {
            this.computeBoundingVolumes(ellipsoid);
        }
    }

    get boundingVolume (): OrientedBoundingBox {
        return this._orientedBoundingBox as OrientedBoundingBox;
    }

    get boundingSphere (): BoundingSphere {
        return this._boundingSphere as BoundingSphere;
    }

    computeBoundingVolumes (ellipsoid: Ellipsoid): void {
        // An oriented bounding box that encloses this tile's region.  This is used to calculate tile visibility.
        this._orientedBoundingBox = OrientedBoundingBox.fromRectangle(
            this.rectangle,
            this.minimumHeight,
            this.maximumHeight,
            ellipsoid
        );

        this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
            this._orientedBoundingBox
        );
    }

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level of detail selection.
     *
     * @param {FrameState} frameState The state information of the current rendering frame.
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    distanceToCamera (frameState: FrameState): number {
        const camera = frameState.camera;
        const cameraCartesianPosition = camera.positionWC;
        const cameraCartographicPosition = camera.positionCartographic;

        let result = 0.0;
        if (!Rectangle.contains(this.rectangle, cameraCartographicPosition)) {
            let southwestCornerCartesian = this.southwestCornerCartesian;
            let northeastCornerCartesian = this.northeastCornerCartesian;
            let westNormal = this.westNormal;
            let southNormal = this.southNormal;
            let eastNormal = this.eastNormal;
            let northNormal = this.northNormal;

            if (frameState.mode !== SceneMode.SCENE3D) {
                southwestCornerCartesian = frameState.mapProjection.project(
                    Rectangle.southwest(this.rectangle),
                    southwestCornerScratch
                );
                southwestCornerCartesian.z = southwestCornerCartesian.y;
                southwestCornerCartesian.y = southwestCornerCartesian.x;
                southwestCornerCartesian.x = 0.0;
                northeastCornerCartesian = frameState.mapProjection.project(
                    Rectangle.northeast(this.rectangle),
                    northeastCornerScratch
                );
                northeastCornerCartesian.z = northeastCornerCartesian.y;
                northeastCornerCartesian.y = northeastCornerCartesian.x;
                northeastCornerCartesian.x = 0.0;
                westNormal = negativeUnitY;
                eastNormal = Cartesian3.UNIT_Y;
                southNormal = negativeUnitZ;
                northNormal = Cartesian3.UNIT_Z;
            }

            const vectorFromSouthwestCorner = Cartesian3.subtract(
                cameraCartesianPosition,
                southwestCornerCartesian,
                vectorScratch
            );
            const distanceToWestPlane = Cartesian3.dot(
                vectorFromSouthwestCorner,
                westNormal
            );
            const distanceToSouthPlane = Cartesian3.dot(
                vectorFromSouthwestCorner,
                southNormal
            );

            const vectorFromNortheastCorner = Cartesian3.subtract(
                cameraCartesianPosition,
                northeastCornerCartesian,
                vectorScratch
            );
            const distanceToEastPlane = Cartesian3.dot(
                vectorFromNortheastCorner,
                eastNormal
            );
            const distanceToNorthPlane = Cartesian3.dot(
                vectorFromNortheastCorner,
                northNormal
            );

            if (distanceToWestPlane > 0.0) {
                result += distanceToWestPlane * distanceToWestPlane;
            } else if (distanceToEastPlane > 0.0) {
                result += distanceToEastPlane * distanceToEastPlane;
            }

            if (distanceToSouthPlane > 0.0) {
                result += distanceToSouthPlane * distanceToSouthPlane;
            } else if (distanceToNorthPlane > 0.0) {
                result += distanceToNorthPlane * distanceToNorthPlane;
            }
        }

        let cameraHeight;
        let minimumHeight;
        let maximumHeight;
        if (frameState.mode === SceneMode.SCENE3D) {
            cameraHeight = cameraCartographicPosition.height;
            minimumHeight = this.minimumHeight;
            maximumHeight = this.maximumHeight;
        } else {
            cameraHeight = cameraCartesianPosition.x;
            minimumHeight = 0.0;
            maximumHeight = 0.0;
        }

        if (cameraHeight > maximumHeight) {
            const distanceAboveTop = cameraHeight - maximumHeight;
            result += distanceAboveTop * distanceAboveTop;
        } else if (cameraHeight < minimumHeight) {
            const distanceBelowBottom = minimumHeight - cameraHeight;
            result += distanceBelowBottom * distanceBelowBottom;
        }

        return Math.sqrt(result);
    }
}

export { TileBoundingRegion };
