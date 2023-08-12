/* eslint-disable no-prototype-builtins */
import { defined } from '../Core/defined';
import { DeveloperError } from '../Core/DeveloperError';

/**
 * A function to port GLSL shaders from GLSL ES 1.00 to GLSL ES 3.00
 *
 * This function is nowhere near comprehensive or complete. It just
 * handles some common cases.
 *
 * Note that this function requires the presence of the
 * "#define OUTPUT_DECLARATION" line that is appended
 * by ShaderSource.
 *
 * @private
 */
const modernizeShader = (source: string, isFragmentShader: boolean) => {
    const outputDeclarationRegex = /#define OUTPUT_DECLARATION/;
    const splitSource = source.split('\n');

    if (/#version 300 es/g.test(source)) {
        return source;
    }

    let outputDeclarationLine = -1;
    let i, line;
    for (i = 0; i < splitSource.length; ++i) {
        line = splitSource[i];
        if (outputDeclarationRegex.test(line)) {
            outputDeclarationLine = i;
            break;
        }
    }

    if (outputDeclarationLine === -1) {
        throw new DeveloperError('Could not find a #define OUTPUT_DECLARATION!');
    }

    const outputVariables: any[] = [];

    for (i = 0; i < 10; i++) {
        const fragDataString = 'gl_FragData\\[' + i + '\\]';
        const newOutput = 'czm_out' + i;
        const regex = new RegExp(fragDataString, 'g');
        if (regex.test(source)) {
            setAdd(newOutput, outputVariables);
            replaceInSourceString(fragDataString, newOutput, splitSource);
            splitSource.splice(
                outputDeclarationLine,
                0,
                'layout(location = ' + i + ') out vec4 ' + newOutput + ';'
            );
            outputDeclarationLine += 1;
        }
    }

    const czmFragColor = 'czm_fragColor';
    if (findInSource('gl_FragColor', splitSource)) {
        setAdd(czmFragColor, outputVariables);
        replaceInSourceString('gl_FragColor', czmFragColor, splitSource);
        splitSource.splice(
            outputDeclarationLine,
            0,
            'layout(location = 0) out vec4 czm_fragColor;'
        );
        outputDeclarationLine += 1;
    }

    const variableMap = getVariablePreprocessorBranch(outputVariables, splitSource);
    const lineAdds = {};
    for (i = 0; i < splitSource.length; i++) {
        line = splitSource[i];
        for (const variable in variableMap) {
            if (variableMap.hasOwnProperty(variable)) {
                const matchVar = new RegExp(
                    '(layout)[^]+(out)[^]+(' + variable + ')[^]+',
                    'g'
                );
                if (matchVar.test(line)) {
                    lineAdds[line] = variable;
                }
            }
        }
    }

    for (const layoutDeclaration in lineAdds) {
        if (lineAdds.hasOwnProperty(layoutDeclaration)) {
            const variableName = lineAdds[layoutDeclaration];
            let lineNumber = splitSource.indexOf(layoutDeclaration);
            const entry = variableMap[variableName];
            const depth = entry.length;
            let d;
            for (d = 0; d < depth; d++) {
                splitSource.splice(lineNumber, 0, entry[d]);
            }
            lineNumber += depth + 1;
            for (d = depth - 1; d >= 0; d--) {
                splitSource.splice(lineNumber, 0, '#endif //' + entry[d]);
            }
        }
    }

    const webgl2UniqueID = 'WEBGL_2';
    const webgl2DefineMacro = '#define ' + webgl2UniqueID;
    const versionThree = '#version 300 es';
    let foundVersion = false;
    for (i = 0; i < splitSource.length; i++) {
        if (/#version/.test(splitSource[i])) {
            splitSource[i] = versionThree;
            foundVersion = true;
            break;
        }
    }

    if (!foundVersion) {
        splitSource.splice(0, 0, versionThree);
    }

    splitSource.splice(1, 0, webgl2DefineMacro);

    removeExtension('EXT_draw_buffers', webgl2UniqueID, splitSource);
    removeExtension('EXT_frag_depth', webgl2UniqueID, splitSource);
    removeExtension('OES_standard_derivatives', webgl2UniqueID, splitSource);

    replaceInSourceString('texture2D', 'texture', splitSource);
    replaceInSourceString('texture3D', 'texture', splitSource);
    replaceInSourceString('textureCube', 'texture', splitSource);
    replaceInSourceString('gl_FragDepthEXT', 'gl_FragDepth', splitSource);

    if (isFragmentShader) {
        replaceInSourceString('varying', 'in', splitSource);
    } else {
        replaceInSourceString('attribute', 'in', splitSource);
        replaceInSourceString('varying', 'out', splitSource);
    }

    return compileSource(splitSource);
};

// Note that this fails if your string looks like
// searchString[singleCharacter]searchString
function replaceInSourceString (str: string, replacement: string, splitSource: string[]) {
    const regexStr = '(^|[^\\w])(' + str + ')($|[^\\w])';
    const regex = new RegExp(regexStr, 'g');

    const splitSourceLength = splitSource.length;
    for (let i = 0; i < splitSourceLength; ++i) {
        const line = splitSource[i];
        splitSource[i] = line.replace(regex, '$1' + replacement + '$3');
    }
}

function replaceInSourceRegex (regex: RegExp, replacement: string, splitSource: string[]) {
    const splitSourceLength = splitSource.length;
    for (let i = 0; i < splitSourceLength; ++i) {
        const line = splitSource[i];
        splitSource[i] = line.replace(regex, replacement);
    }
}

const findInSource = (str: string, splitSource: string[]): boolean => {
    const regexStr = '(^|[^\\w])(' + str + ')($|[^\\w])';
    const regex = new RegExp(regexStr, 'g');

    const splitSourceLength = splitSource.length;
    for (let i = 0; i < splitSourceLength; ++i) {
        const line = splitSource[i];
        if (regex.test(line)) {
            return true;
        }
    }
    return false;
};

function compileSource (splitSource: string[]) {
    let wholeSource = '';

    const splitSourceLength = splitSource.length;
    for (let i = 0; i < splitSourceLength; ++i) {
        wholeSource += splitSource[i] + '\n';
    }
    return wholeSource;
}

function setAdd (variable: string, set: string[]) {
    if (set.indexOf(variable) === -1) {
        set.push(variable);
    }
}

function getVariablePreprocessorBranch (layoutVariables: string[], splitSource: string[]) {
    const variableMap = {};

    const numLayoutVariables = layoutVariables.length;

    const stack:string[] = [];
    for (let i = 0; i < splitSource.length; ++i) {
        const line = splitSource[i];
        const hasIF = /(#ifdef|#if)/g.test(line);
        const hasELSE = /#else/g.test(line);
        const hasENDIF = /#endif/g.test(line);

        if (hasIF) {
            stack.push(line);
        } else if (hasELSE) {
            const top = stack[stack.length - 1];
            let op = top.replace('ifdef', 'ifndef');
            if (/if/g.test(op)) {
                op = op.replace(/(#if\s+)(\S*)([^]*)/, '$1!($2)$3');
            }
            stack.pop();
            stack.push(op);
        } else if (hasENDIF) {
            stack.pop();
        } else if (!/layout/g.test(line)) {
            for (let varIndex = 0; varIndex < numLayoutVariables; ++varIndex) {
                const varName = layoutVariables[varIndex];
                if (line.indexOf(varName) !== -1) {
                    if (!defined(variableMap[varName])) {
                        variableMap[varName] = stack.slice();
                    } else {
                        variableMap[varName] = variableMap[varName].filter(function (x: string) {
                            return stack.indexOf(x) >= 0;
                        });
                    }
                }
            }
        }
    }

    return variableMap;
}

function removeExtension (name: string, webgl2UniqueID: string, splitSource: string[]) {
    const regex = '#extension\\s+GL_' + name + '\\s+:\\s+[a-zA-Z0-9]+\\s*$';
    replaceInSourceRegex(new RegExp(regex, 'g'), '', splitSource);

    // replace any possible directive #ifdef (GL_EXT_extension) with WEBGL_2 unique directive
    replaceInSourceString('GL_' + name, webgl2UniqueID, splitSource);
}
export default modernizeShader;
