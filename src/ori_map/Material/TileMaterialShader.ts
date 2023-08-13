import { MorphTarget_shader } from "@orillusion/core";

export let TileMaterialShader: string = /*wgsl*/ `
    #include "Common_vert"
    #include "Common_frag"
    #include "UnLit_frag"
    #include "UnLitMaterialUniform_frag"

    @group(1) @binding(0)
    var baseMapSampler: sampler;
    @group(1) @binding(1)
    var baseMap: texture_2d<f32>;


    struct MVPMatrix {
        matrixMVP_RTE: mat4x4<f32>,
    };
    
    @group(2) @binding(0)
    var<uniform> modifiedModelView: MVPMatrix;

    
    fn Tile_ORI_Vert(vertex:VertexAttributes){
        var vertexPosition = vertex.position;
        var vertexNormal = vertex.normal;
    
        #if USE_MORPHTARGETS
        ${MorphTarget_shader.getMorphTargetCalcVertex()}    
        #endif
    
        // #if USE_SKELETON
        //     #if USE_JOINT_VEC8
        //         let skeletonNormal = getSkeletonWorldMatrix_8(vertex.joints0, vertex.weights0, vertex.joints1, vertex.weights1);
        //         ORI_MATRIX_M *= skeletonNormal ;
        //     #else
        //         let skeletonNormal = getSkeletonWorldMatrix_4(vertex.joints0, vertex.weights0);
        //         ORI_MATRIX_M *= skeletonNormal ;
        //     #endif
        // #endif
    
        // #if USE_TANGENT
        //     ORI_VertexOut.varying_Tangent = vertex.TANGENT ;
        // #endif
    
        ORI_NORMALMATRIX = transpose(inverse( mat3x3<f32>(ORI_MATRIX_M[0].xyz,ORI_MATRIX_M[1].xyz,ORI_MATRIX_M[2].xyz) ));
    
        var worldPos = (ORI_MATRIX_M * vec4<f32>(vertexPosition.xyz, 1.0));
        var viewPosition = ORI_MATRIX_V  * worldPos;
        var clipPosition = ORI_MATRIX_P *  modifiedModelView.matrixMVP_RTE * vec4<f32>(vertexPosition.xyz, 1.0) ;
        clipPosition = applyLogarithmicDepth(clipPosition,1,10000000000.0);
        ORI_CameraWorldDir = normalize(ORI_CAMERAMATRIX[3].xyz - worldPos.xyz) ;
    
        ORI_VertexOut.varying_UV0 = vertex.uv.xy ;
        ORI_VertexOut.varying_UV1 = vertex.TEXCOORD_1.xy;
        ORI_VertexOut.varying_ViewPos = viewPosition / viewPosition.w;
        ORI_VertexOut.varying_Clip = clipPosition ;
        ORI_VertexOut.varying_WPos = worldPos ;
        ORI_VertexOut.varying_WPos.w = f32(vertex.index);
        ORI_VertexOut.varying_WNormal = normalize(ORI_NORMALMATRIX * vertexNormal.xyz) ;
        ORI_VertexOut.member = clipPosition;
        }

        fn applyLogarithmicDepth(
            clipPosition: vec4<f32>,
            logarithmicDepthConstant: f32,
            perspectiveFarPlaneDistance: f32) -> vec4<f32>
       {
           let z = ((2.0 * log((logarithmicDepthConstant * clipPosition.z) + 1.0) / 
                          log((logarithmicDepthConstant * perspectiveFarPlaneDistance) + 1.0)) - 1.0) * clipPosition.w;
       
           return vec4<f32>(clipPosition.x,clipPosition.y,z,clipPosition.w);
       }


    fn vert(inputData:VertexAttributes) -> VertexOutput {
        Tile_ORI_Vert(inputData) ;
        return ORI_VertexOut ;
    }

    fn frag(){
        var transformUV1 = materialUniform.transformUV1;
        var transformUV2 = materialUniform.transformUV2;

        var uv = transformUV1.zw * ORI_VertexVarying.fragUV0 + transformUV1.xy; 
        let color = textureSample(baseMap,baseMapSampler,uv) ;
        if(color.w < 0.5){
            discard ;
        }
        
        ORI_ShadingInput.BaseColor = color * materialUniform.baseColor ;
        UnLit();
    }
`