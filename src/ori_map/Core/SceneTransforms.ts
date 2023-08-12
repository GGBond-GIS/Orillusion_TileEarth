import { FrameState } from '../Scene/FrameState';
import { OrthographicFrustumCamera } from '../Scene/OrthographicFrustumCamera';
import { Scene } from '../Scene/CesiumScene';
import { BoundingRectangle } from './BoundingRectangle';
import { Cartesian2 } from './Cartesian2';
import { Cartesian3 } from './Cartesian3';
import { Cartesian4 } from './Cartesian4';
import { Cartographic } from './Cartographic';
import { CesiumMath } from './CesiumMath';
import { CesiumMatrix4 } from './CesiumMatrix4';
import { defined } from './defined';
import { SceneMode } from './SceneMode';
import { Transforms } from './Transforms';

const SceneTransforms: any = {};

const actualPositionScratch = new Cartesian4(0, 0, 0, 1);
let positionCC = new Cartesian4();
const scratchViewport = new BoundingRectangle();

const scratchWindowCoord0 = new Cartesian2();
const scratchWindowCoord1 = new Cartesian2();

const scratchMaxCartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO);
const scratchProjectedCartesian = new Cartesian3();
const scratchCameraPosition = new Cartesian3();

const scratchCartesian4 = new Cartesian4();
const scratchEyeOffset = new Cartesian3();

function worldToClip (position, eyeOffset, camera, result) {
    const viewMatrix = camera.viewMatrix;

    const positionEC = CesiumMatrix4.multiplyByVector(
        viewMatrix,
        Cartesian4.fromElements(
            position.x,
            position.y,
            position.z,
            1,
            scratchCartesian4
        ),
        scratchCartesian4
    );

    const zEyeOffset = Cartesian3.multiplyComponents(
        eyeOffset,
        Cartesian3.normalize((positionEC), scratchEyeOffset),
        scratchEyeOffset
    );
    positionEC.x += eyeOffset.x + zEyeOffset.x;
    positionEC.y += eyeOffset.y + zEyeOffset.y;
    positionEC.z += zEyeOffset.z;

    return CesiumMatrix4.multiplyByVector(
        camera.frustum.projectionMatrix,
        positionEC,
        result
    );
}

/**
 * @private
 */
SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates = function (
    scene: Scene,
    position: Cartesian3,
    eyeOffset: Cartesian3,
    result?: Cartesian2
) {
    // Transform for 3D, 2D, or Columbus view
    const frameState = scene.frameState;
    const actualPosition = SceneTransforms.computeActualWgs84Position(
        frameState,
        position,
        actualPositionScratch
    );

    if (!defined(actualPosition)) {
        return undefined;
    }

    // Assuming viewport takes up the entire canvas...
    const canvas = scene.canvas;
    const viewport = scratchViewport;
    viewport.x = 0;
    viewport.y = 0;
    viewport.width = canvas.clientWidth;
    viewport.height = canvas.clientHeight;

    const camera = scene.camera;
    let cameraCentered = false;

    if (frameState.mode === SceneMode.SCENE2D) {
        const projection = scene.mapProjection;
        const maxCartographic = scratchMaxCartographic;
        const maxCoord = projection.project(
            maxCartographic,
            scratchProjectedCartesian
        );

        const cameraPosition = Cartesian3.clone(
            camera.position,
            scratchCameraPosition
        );
        const frustum = camera.frustum.clone();

        const viewportTransformation = CesiumMatrix4.computeViewportTransformation(
            viewport,
            0.0,
            1.0,
            new CesiumMatrix4()
        );
        const projectionMatrix = camera.frustum.projectionMatrix;

        const x = camera.positionWC.y;
        const eyePoint = Cartesian3.fromElements(
            CesiumMath.sign(x) * maxCoord.x - x,
            0.0,
            -camera.positionWC.x
        );
        const windowCoordinates = Transforms.pointToGLWindowCoordinates(
            projectionMatrix,
            viewportTransformation,
            eyePoint
        );

        if (
            x === 0.0 ||
      windowCoordinates.x <= 0.0 ||
      windowCoordinates.x >= canvas.clientWidth
        ) {
            cameraCentered = true;
        } else {
            if (windowCoordinates.x > canvas.clientWidth * 0.5) {
                viewport.width = windowCoordinates.x;

                camera.frustum.right = maxCoord.x - x;

                positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
                SceneTransforms.clipToGLWindowCoordinates(
                    viewport,
                    positionCC,
                    scratchWindowCoord0
                );

                viewport.x += windowCoordinates.x;

                camera.position.x = -camera.position.x;

                const right = camera.frustum.right;
                camera.frustum.right = -camera.frustum.left;
                camera.frustum.left = -right;

                positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
                SceneTransforms.clipToGLWindowCoordinates(
                    viewport,
                    positionCC,
                    scratchWindowCoord1
                );
            } else {
                viewport.x += windowCoordinates.x;
                viewport.width -= windowCoordinates.x;

                camera.frustum.left = -maxCoord.x - x;

                positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
                SceneTransforms.clipToGLWindowCoordinates(
                    viewport,
                    positionCC,
                    scratchWindowCoord0
                );

                viewport.x = viewport.x - viewport.width;

                camera.position.x = -camera.position.x;

                const left = camera.frustum.left;
                camera.frustum.left = -camera.frustum.right;
                camera.frustum.right = -left;

                positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
                SceneTransforms.clipToGLWindowCoordinates(
                    viewport,
                    positionCC,
                    scratchWindowCoord1
                );
            }

            Cartesian3.clone(cameraPosition, camera.position);
            camera.frustum = frustum.clone();

            result = Cartesian2.clone(scratchWindowCoord0, result);
            if ((result as Cartesian2).x < 0.0 || (result as Cartesian2).x > canvas.clientWidth) {
                (result as Cartesian2).x = scratchWindowCoord1.x;
            }
        }
    }

    if (frameState.mode !== SceneMode.SCENE2D || cameraCentered) {
    // View-projection matrix to transform from world coordinates to clip coordinates
        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        if (
            positionCC.z < 0 &&
      !(camera.frustum instanceof OrthographicFrustumCamera)) {
            return undefined;
        }

        result = SceneTransforms.clipToGLWindowCoordinates(
            viewport,
            positionCC,
            result
        );
    }

    (result as Cartesian2).y = canvas.clientHeight - (result as Cartesian2).y;
    return result;
};

/**
 * Transforms a position in WGS84 coordinates to window coordinates.  This is commonly used to place an
 * HTML element at the same screen position as an object in the scene.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian3} position The position in WGS84 (world) coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
 * var scene = widget.scene;
 * var ellipsoid = scene.globe.ellipsoid;
 * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
SceneTransforms.wgs84ToWindowCoordinates = function (scene: Scene, position: Cartesian3, result?: Cartesian2): Cartesian2 {
    return SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates(
        scene,
        position,
        Cartesian3.ZERO,
        result
    );
};

const projectedPosition = new Cartesian3();
const positionInCartographic = new Cartographic();

/**
 * @private
 */
SceneTransforms.computeActualWgs84Position = function (
    frameState: FrameState,
    position: Cartesian3,
    result: Cartesian3
) {
    const mode = frameState.mode;

    if (mode === SceneMode.SCENE3D) {
        return Cartesian3.clone(position, result);
    }

    const projection = frameState.mapProjection;
    const cartographic = projection.ellipsoid.cartesianToCartographic(
        position,
        positionInCartographic
    );
    if (!defined(cartographic)) {
        return undefined;
    }

    projection.project(cartographic, projectedPosition);

    if (mode === SceneMode.COLUMBUS_VIEW) {
        return Cartesian3.fromElements(
            projectedPosition.z,
            projectedPosition.x,
            projectedPosition.y,
            result
        );
    }

    if (mode === SceneMode.SCENE2D) {
        return Cartesian3.fromElements(
            0.0,
            projectedPosition.x,
            projectedPosition.y,
            result
        );
    }

    // mode === SceneMode.MORPHING
    // const morphTime = frameState.morphTime;
    // return Cartesian3.fromElements(
    //     CesiumMath.lerp(projectedPosition.z, position.x, morphTime),
    //     CesiumMath.lerp(projectedPosition.x, position.y, morphTime),
    //     CesiumMath.lerp(projectedPosition.y, position.z, morphTime),
    //     result
    // );
};

export { SceneTransforms };
