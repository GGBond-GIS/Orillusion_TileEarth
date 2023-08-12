import { defined } from '../Core/defined';
import { DrawMeshCommand } from '../Renderer/DrawMeshCommand';
import { ShaderProgram } from '../Renderer/ShaderProgram';
import { ShaderSource } from '../Renderer/ShaderSource';
import { Context } from './Context';

const writeLogDepthRegex = /\s+czm_writeLogDepth\(/;
const vertexlogDepthRegex = /\s+czm_vertexLogDepth\(/;
const extensionRegex = /\s*#extension\s+GL_EXT_frag_depth\s*:\s*enable/;

function getLogDepthShaderProgram (context: Context, shaderProgram: ShaderProgram) {
    let shader = context.shaderCache.getDerivedShaderProgram(
        shaderProgram,
        'logDepth'
    );
    if (!defined(shader)) {
        const attributeLocations = shaderProgram._attributeLocations;
        const vs = shaderProgram.vertexShaderSource.clone();
        const fs = shaderProgram.fragmentShaderSource.clone();

        vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
        vs.defines.push('LOG_DEPTH');
        fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
        fs.defines.push('LOG_DEPTH');

        let i;
        let logMain;
        let writesLogDepth = false;
        let sources = vs.sources;
        let length = sources.length;
        for (i = 0; i < length; ++i) {
            if (vertexlogDepthRegex.test(sources[i])) {
                writesLogDepth = true;
                break;
            }
        }

        if (!writesLogDepth) {
            for (i = 0; i < length; ++i) {
                sources[i] = ShaderSource.replaceMain(sources[i], 'czm_log_depth_main');
            }

            logMain =
            '\n\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_log_depth_main(); \n' +
            '    czm_vertexLogDepth(); \n' +
            '} \n';
            sources.push(logMain);
        }

        sources = fs.sources;
        length = sources.length;

        writesLogDepth = false;
        for (i = 0; i < length; ++i) {
            if (writeLogDepthRegex.test(sources[i])) {
                writesLogDepth = true;
            }
        }
        // This define indicates that a log depth value is written by the shader but doesn't use czm_writeLogDepth.
        if (fs.defines.indexOf('LOG_DEPTH_WRITE') !== -1) {
            writesLogDepth = true;
        }

        let addExtension = true;
        for (i = 0; i < length; ++i) {
            if (extensionRegex.test(sources[i])) {
                addExtension = false;
            }
        }

        let logSource = '';
        if (addExtension) {
            logSource +=
            '#ifdef GL_EXT_frag_depth \n' +
            '#extension GL_EXT_frag_depth : enable \n' +
            '#endif \n\n';
        }

        if (!writesLogDepth) {
            for (i = 0; i < length; i++) {
                sources[i] = ShaderSource.replaceMain(sources[i], 'czm_log_depth_main');
            }

            logSource +=
            '\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_log_depth_main(); \n' +
            '    czm_writeLogDepth(); \n' +
            '} \n';
        }

        sources.push(logSource);

        shader = context.shaderCache.createDerivedShaderProgram(
            shaderProgram,
            'logDepth',
            {
                vertexShaderSource: vs,
                fragmentShaderSource: fs,
                attributeLocations: attributeLocations
            }
        );
    }

    return shader;
}

class DerivedCommand {
    constructor () {

    }

    static createLogDepthCommand (command: DrawMeshCommand, context: Context, result?:any) {
        if (!defined(result)) {
            result = {};
        }

        let shader;
        if (defined(result.command)) {
            shader = result.command.shaderProgram;
        }

        result.command = DrawMeshCommand.shallowClone(command, result.command);

        if (!defined(shader) || result.shaderProgramId !== (command.shaderProgram as ShaderProgram).id) {
            result.command.shaderProgram = getLogDepthShaderProgram(
                context,
                (command.shaderProgram as ShaderProgram)
            );
            result.shaderProgramId = (command.shaderProgram as ShaderProgram).id;
        } else {
            result.command.shaderProgram = shader;
        }

        return result;
    }
}
