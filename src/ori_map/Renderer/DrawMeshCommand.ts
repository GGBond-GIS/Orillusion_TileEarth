import { BoundingSphere } from '../Core/BoundingSphere';
import { defined } from '../Core/defined';
import { OrientedBoundingBox } from '../Core/OrientedBoundingBox';
import { Context } from '../Scene/Context';
import { FrameState } from '../Scene/FrameState';
import { BufferGeometry, Material, Mesh } from 'three';
import { ShaderProgram } from './ShaderProgram';
import { BoundingBox, GeometryBase, LitMaterial, MeshRenderer, Object3D, PlaneGeometry, VertexAttributeName } from '@orillusion/core';

class DrawMeshCommand extends Object3D {
    derivedCommands: any;
    // isCommand: boolean;
    // isDrawMeshCommand: boolean;
    owner?: any;
    boundingVolume?: BoundingSphere;
    orientedBoundingBox?: OrientedBoundingBox
    shaderProgram?: ShaderProgram;
    _boundingVolume?: any;
    _orientedBoundingBox?: any;
    _mesh: MeshRenderer;
    constructor (geometry?: BufferGeometry, material?: Material) {
        super();
        // this.name = ''
        this._mesh =  this.addComponent(MeshRenderer);
        this._mesh.receiveShadow = true
        this.derivedCommands = {
            // originalMaterial: this.material,
            oit: undefined,
            // 用于颜色拾取的材质
            picking: undefined,
            oitMaterial: undefined,
            depth: undefined,
            // 对数深度
            logDepth: undefined
        };
        
        // this.pass = CommandRenderPass.OPAQUE;
        // this.isCommand = true;
        // this.allowPicking = true;

        // this.isDrawMeshCommand = true;

        // this.frustumCulled = false;

        // this.frustumCulled = false;

        // this.owner = undefined;
    }
    get mesh(){
        return this._mesh;
    }

    // get geometry(){
    //     return this._mesh.geometry;
    // }

    // set geometry(geometry){
    //      this._mesh.geometry = geometry;
    // }

    get material(){
        return this._mesh.material
    }
    set material(material){
        this._mesh.material = material;
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
        // (result.material as Material).copy((command?.material as Material));

        return result;
    }

    update2 (frameState: FrameState): void {
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


// /**
//  * Plane geometry
//  * @group Geometry
//  */
// export class PlaneGeometry extends GeometryBase {
//     /**
//      * Width of the plane
//      */
//     public width: number;
//     /**
//      * Height of the plane
//      */
//     public height: number;
//     /**
//      * Number of width segments of a plane
//      */
//     public segmentW: number;
//     /**
//      * Number of height segments of a plane
//      */
//     public segmentH: number;
//     /**
//      * Define the normal vector of a plane
//      */
//     public up: Vector3;

//     /**
//      *
//      * @constructor
//      * @param width Width of the plane
//      * @param height Height of the plane
//      * @param segmentW Number of width segments of a plane
//      * @param segmentH Number of height segments of a plane
//      * @param up Define the normal vector of a plane
//      */
//     constructor() {
//         super();

//         this.buildGeometry(this.up);
//     }

//     private buildGeometry(axis: Vector3): void {
//         //3 3 3 2 2 4
//         var x: number, y: number;
//         var numIndices: number;
//         var base: number;
//         var tw: number = this.segmentW + 1;
//         var numVertices: number = (this.segmentH + 1) * tw;

//         this.bounds = new BoundingBox(Vector3.ZERO.clone(), new Vector3(this.width, 1.0, this.height));



//         this.setIndices(indices_arr);
//         this.setAttribute(VertexAttributeName.position, position_arr);
//         this.setAttribute(VertexAttributeName.uv, uv_arr);

//         this.addSubGeometry({
//             indexStart: 0,
//             indexCount: indices_arr.length,
//             vertexStart: 0,
//             index: 0,
//         });
//     }

// }

export { DrawMeshCommand };
