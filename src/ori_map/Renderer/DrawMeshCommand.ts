import { BoundingSphere } from '../Core/BoundingSphere';
import { defined } from '../Core/defined';
import { OrientedBoundingBox } from '../Core/OrientedBoundingBox';
import { Context } from '../Scene/Context';
import { FrameState } from '../Scene/FrameState';
import { BufferGeometry, Material, Mesh } from 'three';
import { ShaderProgram } from './ShaderProgram';

class DrawMeshCommand extends Mesh {
    derivedCommands: any;
    isCommand: boolean;
    isDrawMeshCommand: boolean;
    owner?: any;
    boundingVolume?: BoundingSphere;
    orientedBoundingBox?: OrientedBoundingBox
    shaderProgram?: ShaderProgram;
    _boundingVolume?: any;
    _orientedBoundingBox?: any;
    constructor (geometry?: BufferGeometry, material?: Material) {
        super(geometry, material);

        this.derivedCommands = {
            originalMaterial: this.material,
            oit: undefined,
            // 用于颜色拾取的材质
            picking: undefined,
            oitMaterial: undefined,
            depth: undefined,
            // 对数深度
            logDepth: undefined
        };
        // this.pass = CommandRenderPass.OPAQUE;
        this.isCommand = true;
        this.allowPicking = true;

        this.isDrawMeshCommand = true;

        this.frustumCulled = false;

        this.frustumCulled = false;

        this.owner = undefined;
    }

    get levelId (): number {
        return this.owner.levelId;
    }

    compressVertices () {
        // const geometry = this.geometry;
    }

    static shallowClone (command?: DrawMeshCommand, result = new DrawMeshCommand()): DrawMeshCommand | undefined {
        if (!defined(command)) {
            return undefined;
        }

        result._boundingVolume = command?._boundingVolume;
        result._orientedBoundingBox = command?._orientedBoundingBox;

        result.geometry = (command as DrawMeshCommand).geometry;
        (result.material as Material).copy((command?.material as Material));

        return result;
    }

    update (frameState: FrameState): void {
        // this.material.picking = false;

        // if (defined(this.material.update)) {
        //     this.material.update(frameState);
        // }

        // if (frameState.passes.pick) {
        //     this.material.picking = true;
        // }
    }

    execute (context: Context, passState?: any): void {
        context.draw(this);
    }
}

export { DrawMeshCommand };
