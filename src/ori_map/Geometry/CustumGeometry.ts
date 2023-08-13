// import { GeometryBase } from "@orillusion/core";

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