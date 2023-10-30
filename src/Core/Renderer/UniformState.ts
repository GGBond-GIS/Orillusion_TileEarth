import { Cartesian3 } from '../../Math/Cartesian3';
import { CesiumMatrix3 } from '../../Math/CesiumMatrix3';
import { CesiumMatrix4 } from '../../Math/CesiumMatrix4';
import { Camera } from '../../Core/Camera/Camera';
import { FrameState } from '../../Core/Renderer/FrameState';
import { Matrix3 } from 'three';

function setView (uniformState: UniformState, matrix: CesiumMatrix4) {
    CesiumMatrix4.clone(matrix, uniformState._view);
    CesiumMatrix4.getMatrix3(matrix, uniformState._viewRotation);

    uniformState._view3DDirty = true;
    uniformState._inverseView3DDirty = true;
    uniformState._modelViewDirty = true;
    uniformState._modelView3DDirty = true;
    uniformState._modelViewRelativeToEyeDirty = true;
    uniformState._inverseModelViewDirty = true;
    uniformState._inverseModelView3DDirty = true;
    uniformState._viewProjectionDirty = true;
    uniformState._inverseViewProjectionDirty = true;
    uniformState._modelViewProjectionDirty = true;
    uniformState._modelViewProjectionRelativeToEyeDirty = true;
    uniformState._modelViewInfiniteProjectionDirty = true;
    uniformState._normalDirty = true;
    uniformState._inverseNormalDirty = true;
    uniformState._normal3DDirty = true;
    uniformState._inverseNormal3DDirty = true;
}

function setInverseView (uniformState: UniformState, matrix: CesiumMatrix4) {
    CesiumMatrix4.clone(matrix, uniformState._inverseView);
    CesiumMatrix4.getMatrix3(matrix, uniformState._inverseViewRotation);
}

function cleanModelViewProjection (uniformState: UniformState) {
    if (uniformState._modelViewProjectionDirty) {
        uniformState._modelViewProjectionDirty = false;

        CesiumMatrix4.multiply(
            uniformState._projection,
            uniformState.modelView,
            uniformState._modelViewProjection
        );
    }
}

function cleanModelView (uniformState: UniformState) {
    if (uniformState._modelViewDirty) {
        uniformState._modelViewDirty = false;

        CesiumMatrix4.multiplyTransformation(
            uniformState._view,
            uniformState._model,
            uniformState._modelView
        );
    }
}

class UniformState {
    _viewRotation = new CesiumMatrix3();
    _inverseViewRotation = new CesiumMatrix3();

    _viewRotation3D = new CesiumMatrix3();
    _inverseViewRotation3D = new CesiumMatrix3();

    _model = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _view = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _inverseView = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _projection = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _infiniteProjection = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);

    // Derived members
    _view3DDirty = true;
    _view3D = new CesiumMatrix4();

    _inverseView3DDirty = true;
    _inverseView3D = new CesiumMatrix4();

    _inverseModelDirty = true;
    _inverseModel = new CesiumMatrix4();

    _inverseTransposeModelDirty = true;
    _inverseTransposeModel = new Matrix3();

    _inverseProjectionDirty = true;
    _inverseProjection = new CesiumMatrix4();

    _modelViewDirty = true;
    _modelView = new CesiumMatrix4();

    _modelView3DDirty = true;
    _modelView3D = new CesiumMatrix4();

    _modelViewRelativeToEyeDirty = true;
    _modelViewRelativeToEye = new CesiumMatrix4();

    _inverseModelViewDirty = true;
    _inverseModelView = new CesiumMatrix4();

    _inverseModelView3DDirty = true;
    _inverseModelView3D = new CesiumMatrix4();

    _viewProjectionDirty = true;
    _viewProjection = new CesiumMatrix4();

    _inverseViewProjectionDirty = true;
    _inverseViewProjection = new CesiumMatrix4();

    _modelViewProjectionDirty = true;
    _modelViewProjection = new CesiumMatrix4();

    _inverseModelViewProjectionDirty = true;
    _inverseModelViewProjection = new CesiumMatrix4();

    _modelViewProjectionRelativeToEyeDirty = true;
    _modelViewProjectionRelativeToEye = new CesiumMatrix4();

    _modelViewInfiniteProjectionDirty = true;
    _modelViewInfiniteProjection = new CesiumMatrix4();

    _normalDirty = true;
    _normal = new Matrix3();

    _normal3DDirty = true;
    _normal3D = new Matrix3();

    _inverseNormalDirty = true;
    _inverseNormal = new Matrix3();

    _inverseNormal3DDirty = true;
    _inverseNormal3D = new Matrix3();

    _encodedCameraPositionMCDirty = true;
    //   _encodedCameraPositionMC = new EncodedCartesian3();
    _cameraPosition = new Cartesian3();

    _sunPositionWC = new Cartesian3();
    _sunPositionColumbusView = new Cartesian3();
    _sunDirectionWC = new Cartesian3();
    _sunDirectionEC = new Cartesian3();
    _moonDirectionEC = new Cartesian3();

    _lightDirectionWC = new Cartesian3();
    _lightDirectionEC = new Cartesian3();
    _lightColor = new Cartesian3();
    _lightColorHdr = new Cartesian3();

    get inverseViewRotation (): CesiumMatrix3 {
        return this._inverseViewRotation;
    }

    get modelViewProjection (): CesiumMatrix4 {
        cleanModelViewProjection(this);
        return this._modelViewProjection;
    }

    get modelView (): CesiumMatrix4 {
        cleanModelView(this);
        return this._modelView;
    }

    update (frameState: FrameState): void {
        const camera = frameState.camera;
        this.updateCamera(camera);
    }

    updateCamera (camera: Camera): void {
        setView(this, camera.viewMatrix);
        setInverseView(this, camera.inverseViewMatrix);
    }
}

export { UniformState };
