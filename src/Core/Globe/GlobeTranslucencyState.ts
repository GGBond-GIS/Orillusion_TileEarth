import { NearFarScalar } from '../Camera/NearFarScalar';
import { Rectangle } from '../../Math/Rectangle';

const DerivedCommandType = {
    OPAQUE_FRONT_FACE: 0,
    OPAQUE_BACK_FACE: 1,
    DEPTH_ONLY_FRONT_FACE: 2,
    DEPTH_ONLY_BACK_FACE: 3,
    DEPTH_ONLY_FRONT_AND_BACK_FACE: 4,
    TRANSLUCENT_FRONT_FACE: 5,
    TRANSLUCENT_BACK_FACE: 6,
    TRANSLUCENT_FRONT_FACE_MANUAL_DEPTH_TEST: 7,
    TRANSLUCENT_BACK_FACE_MANUAL_DEPTH_TEST: 8,
    PICK_FRONT_FACE: 9,
    PICK_BACK_FACE: 10,
    DERIVED_COMMANDS_MAXIMUM_LENGTH: 11
};

const derivedCommandsMaximumLength =
    DerivedCommandType.DERIVED_COMMANDS_MAXIMUM_LENGTH;

const DerivedCommandNames = [
    'opaqueFrontFaceCommand',
    'opaqueBackFaceCommand',
    'depthOnlyFrontFaceCommand',
    'depthOnlyBackFaceCommand',
    'depthOnlyFrontAndBackFaceCommand',
    'translucentFrontFaceCommand',
    'translucentBackFaceCommand',
    'translucentFrontFaceManualDepthTestCommand',
    'translucentBackFaceManualDepthTestCommand',
    'pickFrontFaceCommand',
    'pickBackFaceCommand'
];

class GlobeTranslucencyState {
   _frontFaceAlphaByDistance = new NearFarScalar(0.0, 1.0, 0.0, 1.0);
   _backFaceAlphaByDistance = new NearFarScalar(0.0, 1.0, 0.0, 1.0);

   _frontFaceTranslucent = false;
   _backFaceTranslucent = false;
   _requiresManualDepthTest = false;
   _sunVisibleThroughGlobe = false;
   _environmentVisible = false;
   _useDepthPlane = false;
   _numberOfTextureUniforms = 0;
   _globeTranslucencyFramebuffer = undefined;
   _rectangle = Rectangle.clone(Rectangle.MAX_VALUE) as Rectangle;

   _derivedCommandKey = 0;
   _derivedCommandsDirty = false;
   _derivedCommandPacks = undefined;

   _derivedCommandTypes = new Array(derivedCommandsMaximumLength);
   _derivedBlendCommandTypes = new Array(derivedCommandsMaximumLength);
   _derivedPickCommandTypes = new Array(derivedCommandsMaximumLength);
   _derivedCommandTypesToUpdate = new Array(derivedCommandsMaximumLength);

   _derivedCommandsLength = 0;
   _derivedBlendCommandsLength = 0;
   _derivedPickCommandsLength = 0;
    _derivedCommandsToUpdateLength = 0;

    get frontFaceAlphaByDistance (): NearFarScalar {
        return this._frontFaceAlphaByDistance;
    }

    get backFaceAlphaByDistance (): NearFarScalar {
        return this._backFaceAlphaByDistance;
    }

    get translucent (): boolean {
        return this._frontFaceTranslucent;
    }

    get numberOfTextureUniforms (): number {
        return this._numberOfTextureUniforms;
    }

    get rectangle (): Rectangle {
        return this._rectangle;
    }
}

export { GlobeTranslucencyState };
