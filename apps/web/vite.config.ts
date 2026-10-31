import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

// The distributed Phaser file is one indivisible 1.2 MB module. Bundle its source
// modules in production so the existing 500 kB warning budget remains meaningful.
export default defineConfig(({command})=>({
 plugins:[react(),{
  name:'phaser-build-features',apply:'build',enforce:'pre',
  transform(code,id){if(!/[/\\]phaser[/\\]src[/\\]/.test(id))return;return code.replace(/typeof (CANVAS_RENDERER|WEBGL_RENDERER|WEBGL_DEBUG|EXPERIMENTAL|PLUGIN_3D|PLUGIN_CAMERA3D|PLUGIN_FBINSTANT|FEATURE_SOUND)\b/g,(_,feature:string)=>['CANVAS_RENDERER','WEBGL_RENDERER'].includes(feature)?'true':'false')},
 }],
 resolve:command==='build'?{alias:[{find:/^phaser$/,replacement:fileURLToPath(new URL('./node_modules/phaser/src/phaser.js',import.meta.url))}]}:undefined,
 define:{global:'globalThis'},
 build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'phaser',test:/[/\\]phaser[/\\]/,maxSize:350000,minSize:30000}]}}}},
 server:{host:'127.0.0.1',port:5175,strictPort:true},
}))
