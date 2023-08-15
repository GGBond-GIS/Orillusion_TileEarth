// 创建WebGPU上下文
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('gpupresent');

// 创建计算着色器
const computeShaderCode = `
  // 输入纹理
  [[group(0), binding(0)]] var inputTexture1: texture_2d<f32>;
  [[group(0), binding(1)]] var inputTexture2: texture_2d<f32>;
  // 输出纹理
  [[group(0), binding(2)]] var outputTexture: texture_2d<f32>;

  // 计算着色器
  [[stage(compute)]]
  fn main([[builtin(global_invocation_id)]] global_id: vec3<u32>) {
    // 获取纹理尺寸
    let texWidth: u32 = textureDimensions(inputTexture1).x;
    let texHeight: u32 = textureDimensions(inputTexture1).y;

    // 获取当前像素坐标
    let pixelCoord: vec2<u32> = vec2<u32>(global_id.x, global_id.y);

    // 从输入纹理1中采样颜色
    let color1: vec4<f32> = textureLoad(inputTexture1, vec2<i32>(pixelCoord), 0);

    // 从输入纹理2中采样颜色
    let color2: vec4<f32> = textureLoad(inputTexture2, vec2<i32>(pixelCoord), 0);

    // 将两个颜色进行混合
    let blendedColor: vec4<f32> = (color1 + color2) * 0.5;

    // 将混合后的颜色写入输出纹理
    textureStore(outputTexture, vec2<i32>(pixelCoord), blendedColor);
  }
`;

// 创建计算着色器模块
const computeShaderModule = device.createShaderModule({ code: computeShaderCode });

// 创建输入纹理1、输入纹理2和输出纹理
const inputTexture1 = createInputTexture1(); // 创建输入纹理1的函数，需要根据你的需求实现
const inputTexture2 = createInputTexture2(); // 创建输入纹理2的函数，需要根据你的需求实现
const outputTexture = createOutputTexture(); // 创建输出纹理的函数，需要根据你的需求实现

// 创建纹理绑定组
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
    { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float', storageTextureFormat: 'rgba8unorm' } },
  ],
});
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: inputTexture1.createView() },
    { binding: 1, resource: inputTexture2.createView() },
    { binding: 2, resource: outputTexture.createView() },
  ],
});

// 创建计算管线描述符
const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
const pipeline = device.createComputePipeline({
  layout: pipelineLayout,
  compute: {
    module: computeShaderModule,
    entryPoint: 'main',
  },
});

// 创建计算命令编码器
const commandEncoder = device.createCommandEncoder();
const computePass = commandEncoder.beginComputePass();
computePass.setPipeline(pipeline);
computePass.setBindGroup(0, bindGroup);

// 设置计算调度
const texWidth = inputTexture1.width;
const texHeight = inputTexture1.height;
const dispatchSizeX = Math.ceil(texWidth / 16);
const dispatchSizeY = Math.ceil(texHeight / 16);
computePass.dispatch(dispatchSizeX, dispatchSizeY, 1);

computePass.endPass();
device.queue.submit([commandEncoder.finish()]);
