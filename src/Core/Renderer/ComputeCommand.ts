import { defaultValue } from '../../Util/defaultValue';
import { BufferGeometry, ShaderMaterial } from 'three';
import { ComputeEngine } from './ComputeEngine';

class ComputeCommand {
    geometry: BufferGeometry;
    material: ShaderMaterial;
    uniformMap: any;
    outputTexture: any;
    preExecute: any;
    postExecute: any;
    persists: boolean;
    owner: any;
    constructor (options : {
        [name: string]: any
    }) {
        this.geometry = new BufferGeometry();

        this.material = new ShaderMaterial();

        /**
          * An object with functions whose names match the uniforms in the shader program
          * and return values to set those uniforms.
          *
          * @type {Object}
          * @default undefined
          */
        this.uniformMap = options.uniformMap;

        /**
          * 用于保存渲染结果的纹理
          *
          * @type {Texture}
          * @default undefined
          */
        this.outputTexture = options.outputTexture;

        /**
          * Function that is called immediately before the ComputeCommand is executed. Used to
          * update any renderer resources. Takes the ComputeCommand as its single argument.
          *
          * @type {Function}
          * @default undefined
          */
        this.preExecute = options.preExecute;

        /**
          * Function that is called after the ComputeCommand is executed. Takes the output
          * texture as its single argument.
          *
          * @type {Function}
          * @default undefined
          */
        this.postExecute = options.postExecute;

        /**
          * Whether the renderer resources will persist beyond this call. If not, they
          * will be destroyed after completion.
          *
          * @type {Boolean}
          * @default false
          */
        this.persists = defaultValue(options.persists, false);

        /**
          * The pass when to render. Always compute pass.
          *
          * @type {Pass}
          * @default Pass.COMPUTE;
          */
        // this.pass = Pass.COMPUTE;

        /**
          * The object who created this command.  This is useful for debugging command
          * execution; it allows us to see who created a command when we only have a
          * reference to the command, and can be used to selectively execute commands
          * with {@link Scene#debugCommandFilter}.
          *
          * @type {Object}
          * @default undefined
          *
          * @see Scene#debugCommandFilter
          */
        this.owner = options.owner;
    }

    /**
     * Executes the compute command.
     *
     * @param {Context} computeEngine The context that processes the compute command.
     * @return {undefined}
     */
    execute (computeEngine: ComputeEngine): void {
        computeEngine.execute(this);
    }
}

export { ComputeCommand };
