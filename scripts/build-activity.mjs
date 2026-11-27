import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const output=await build({entryPoints:['activity/client.js'],bundle:true,write:false,platform:'browser',format:'iife',minify:true,target:['es2020'],define:{'process.env.NODE_ENV':'"production"'}});
await writeFile('src/activity-bundle.generated.ts','export const ACTIVITY_BUNDLE = '+JSON.stringify(output.outputFiles[0].text)+';\n');
