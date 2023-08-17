

// 在vite.config.js里面引入vite-plugin-mkcert
import mkcert from "vite-plugin-mkcert";

export default {
  // resolve:{
  //   alias:{
  //     '@' : path.resolve(__dirname, './src')
  //   },
  // },
  plugins: [
    // legacy({
    //   targets: ['chrome >= 61'], // 针对部分低版本安卓的兼容处理
    // }),
  ],
  server: {
    host: '0.0.0.0'    
  },
    
  // 只跟build有关 处理部分兼容
  build: {
    cssTarget: 'chrome61',
    minify: 'terser'  // 兼容安卓和ios的老内核 上下的版本控制 会降低打包速度
  },
  // 影响开发环境 部分机型dev模式下无法在真机预览 建议build后preview
  // esbuild: {
  //   target: 'chrome61',
  // }
}
