import { ShaderChunk } from 'three';

const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

function resolveIncludes (string: string): string {
    return string.replace(includePattern, includeReplacer);
}

function includeReplacer (match: string, include: string) {
    const string = ShaderChunk[include];

    if (string === undefined) {
        throw new Error('Can not resolve #include <' + include + '>');
    }

    return resolveIncludes(string);
}

export { resolveIncludes };
