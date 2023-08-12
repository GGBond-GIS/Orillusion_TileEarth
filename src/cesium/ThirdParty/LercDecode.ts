/* eslint-disable brace-style */
/* eslint-disable no-throw-literal */
/* jshint forin: false, bitwise: false */
/*
Copyright 2015-2018 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license and additional notices are located with the
source distribution at:

http://github.com/Esri/lerc/

Contributors:  Johannes Schmid, (LERC v1)
               Chayanika Khatua, (LERC v1)
               Wenxue Ju (LERC v1, v2.x)
*/

/* Copyright 2015-2018 Esri. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 @preserve */

const tmp:{[name: string]: any} = {};

/**
 * a module for decoding LERC blobs
 * @module Lerc
 */
(function () {
    // the original LercDecode for Version 1
    const LercDecode = (function () {
        // WARNING: This decoder version can only read old version 1 Lerc blobs. Use with caution.

        // Note: currently, this module only has an implementation for decoding LERC data, not encoding. The name of
        // the class was chosen to be future proof.

        const CntZImage: {[name: string]: any} = {};

        CntZImage.defaultNoDataValue = -3.4027999387901484e+38; // smallest Float32 value

        /**
     * Decode a LERC byte stream and return an object containing the pixel data and some required and optional
     * information about it, such as the image's width and height.
     *
     * @param {ArrayBuffer} input The LERC input byte stream
     * @param {object} [options] Decoding options, containing any of the following properties:
     * @config {number} [inputOffset = 0]
     *        Skip the first inputOffset bytes of the input byte stream. A valid LERC file is expected at that position.
     * @config {Uint8Array} [encodedMask = null]
     *        If specified, the decoder will not read mask information from the input and use the specified encoded
     *        mask data instead. Mask header/data must not be present in the LERC byte stream in this case.
     * @config {number} [noDataValue = LercCode.defaultNoDataValue]
     *        Pixel value to use for masked pixels.
     * @config {ArrayBufferView|Array} [pixelType = Float32Array]
     *        The desired type of the pixelData array in the return value. Note that it is the caller's responsibility to
     *        provide an appropriate noDataValue if the default pixelType is overridden.
     * @config {boolean} [returnMask = false]
     *        If true, the return value will contain a maskData property of type Uint8Array which has one element per
     *        pixel, the value of which is 1 or 0 depending on whether that pixel's data is present or masked. If the
     *        input LERC data does not contain a mask, maskData will not be returned.
     * @config {boolean} [returnEncodedMask = false]
     *        If true, the return value will contain a encodedMaskData property, which can be passed into encode() as
     *        encodedMask.
     * @config {boolean} [returnFileInfo = false]
     *        If true, the return value will have a fileInfo property that contains metadata obtained from the
     *        LERC headers and the decoding process.
     * @config {boolean} [computeUsedBitDepths = false]
     *        If true, the fileInfo property in the return value will contain the set of all block bit depths
     *        encountered during decoding. Will only have an effect if returnFileInfo option is true.
     * @returns {{width, height, pixelData, minValue, maxValue, noDataValue, maskData, encodedMaskData, fileInfo}}
     */
        CntZImage.decode = function (input:any, options:any) {
            options = options || {};

            const skipMask = options.encodedMaskData || (options.encodedMaskData === null);
            const parsedData = parse(input, options.inputOffset || 0, skipMask) as any;

            const noDataValue = (options.noDataValue !== null) ? options.noDataValue : CntZImage.defaultNoDataValue;

            const uncompressedData = uncompressPixelValues(parsedData, options.pixelType || Float32Array,
                options.encodedMaskData, noDataValue, options.returnMask);

            const result = {
                width: parsedData.width,
                height: parsedData.height,
                pixelData: uncompressedData.resultPixels,
                minValue: uncompressedData.minValue,
                maxValue: parsedData.pixels.maxValue,
                noDataValue: noDataValue
            } as any;

            if (uncompressedData.resultMask) {
                result.maskData = uncompressedData.resultMask;
            }

            if (options.returnEncodedMask && parsedData.mask) {
                result.encodedMaskData = parsedData.mask.bitset ? parsedData.mask.bitset : null;
            }

            if (options.returnFileInfo) {
                result.fileInfo = formatFileInfo(parsedData);
                if (options.computeUsedBitDepths) {
                    result.fileInfo.bitDepths = computeUsedBitDepths(parsedData);
                }
            }

            return result;
        };

        const uncompressPixelValues = function (data:any, TypedArrayClass:any, maskBitset:any, noDataValue:any, storeDecodedMask:any) {
            let blockIdx = 0;
            const numX = data.pixels.numBlocksX;
            const numY = data.pixels.numBlocksY;
            const blockWidth = Math.floor(data.width / numX);
            const blockHeight = Math.floor(data.height / numY);
            const scale = 2 * data.maxZError;
            let minValue = Number.MAX_VALUE; let currentValue;
            maskBitset = maskBitset || ((data.mask) ? data.mask.bitset : null);

            let resultMask;
            const resultPixels = new TypedArrayClass(data.width * data.height) as any;
            if (storeDecodedMask && maskBitset) {
                resultMask = new Uint8Array(data.width * data.height);
            }
            const blockDataBuffer = new Float32Array(blockWidth * blockHeight);

            let xx, yy;
            for (let y = 0; y <= numY; y++) {
                const thisBlockHeight = (y !== numY) ? blockHeight : (data.height % numY);
                if (thisBlockHeight === 0) {
                    continue;
                }
                for (let x = 0; x <= numX; x++) {
                    const thisBlockWidth = (x !== numX) ? blockWidth : (data.width % numX);
                    if (thisBlockWidth === 0) {
                        continue;
                    }

                    let outPtr = y * data.width * blockHeight + x * blockWidth;
                    const outStride = data.width - thisBlockWidth;

                    const block = data.pixels.blocks[blockIdx];

                    let blockData, blockPtr: any, constValue;
                    if (block.encoding < 2) {
                        // block is either uncompressed or bit-stuffed (encodings 0 and 1)
                        if (block.encoding === 0) {
                            // block is uncompressed
                            blockData = block.rawData;
                        } else {
                            // block is bit-stuffed
                            unstuff(block.stuffedData, block.bitsPerPixel, block.numValidPixels, block.offset, scale, blockDataBuffer, data.pixels.maxValue);
                            blockData = blockDataBuffer;
                        }
                        blockPtr = 0;
                    } else if (block.encoding === 2) {
                        // block is all 0
                        constValue = 0;
                    } else {
                        // block has constant value (encoding === 3)
                        constValue = block.offset;
                    }

                    let maskByte;
                    if (maskBitset) {
                        for (yy = 0; yy < thisBlockHeight; yy++) {
                            if (outPtr & 7) {
                                //
                                maskByte = maskBitset[outPtr >> 3];
                                maskByte <<= outPtr & 7;
                            }
                            for (xx = 0; xx < thisBlockWidth; xx++) {
                                if (!(outPtr & 7)) {
                                    // read next byte from mask
                                    maskByte = maskBitset[outPtr >> 3];
                                }
                                if (maskByte & 128) {
                                    // pixel data present
                                    if (resultMask) {
                                        resultMask[outPtr] = 1;
                                    }
                                    currentValue = (block.encoding < 2) ? blockData[blockPtr++] : constValue;
                                    minValue = minValue > currentValue ? currentValue : minValue;
                                    resultPixels[outPtr++] = currentValue;
                                } else {
                                    // pixel data not present
                                    if (resultMask) {
                                        resultMask[outPtr] = 0;
                                    }
                                    resultPixels[outPtr++] = noDataValue;
                                }
                                maskByte <<= 1;
                            }
                            outPtr += outStride;
                        }
                    } else {
                        // mask not present, simply copy block over
                        if (block.encoding < 2) {
                            // duplicating this code block for performance reasons
                            // blockData case:
                            for (yy = 0; yy < thisBlockHeight; yy++) {
                                for (xx = 0; xx < thisBlockWidth; xx++) {
                                    currentValue = blockData[blockPtr++];
                                    minValue = minValue > currentValue ? currentValue : minValue;
                                    resultPixels[outPtr++] = currentValue;
                                }
                                outPtr += outStride;
                            }
                        } else {
                            // constValue case:
                            minValue = minValue > constValue ? constValue : minValue;
                            for (yy = 0; yy < thisBlockHeight; yy++) {
                                for (xx = 0; xx < thisBlockWidth; xx++) {
                                    resultPixels[outPtr++] = constValue;
                                }
                                outPtr += outStride;
                            }
                        }
                    }
                    if ((block.encoding === 1) && (blockPtr !== block.numValidPixels)) {
                        throw 'Block and Mask do not match';
                    }
                    blockIdx++;
                }
            }

            return {
                resultPixels: resultPixels,
                resultMask: resultMask,
                minValue: minValue
            };
        };

        const formatFileInfo = function (data: any) {
            return {
                fileIdentifierString: data.fileIdentifierString,
                fileVersion: data.fileVersion,
                imageType: data.imageType,
                height: data.height,
                width: data.width,
                maxZError: data.maxZError,
                eofOffset: data.eofOffset,
                mask: data.mask ? {
                    numBlocksX: data.mask.numBlocksX,
                    numBlocksY: data.mask.numBlocksY,
                    numBytes: data.mask.numBytes,
                    maxValue: data.mask.maxValue
                } : null,
                pixels: {
                    numBlocksX: data.pixels.numBlocksX,
                    numBlocksY: data.pixels.numBlocksY,
                    numBytes: data.pixels.numBytes,
                    maxValue: data.pixels.maxValue,
                    noDataValue: data.noDataValue
                }
            };
        };

        const computeUsedBitDepths = function (data: any) {
            const numBlocks = data.pixels.numBlocksX * data.pixels.numBlocksY;
            const bitDepths: any = {};
            for (let i = 0; i < numBlocks; i++) {
                const block = data.pixels.blocks[i];
                if (block.encoding === 0) {
                    bitDepths.float32 = true;
                } else if (block.encoding === 1) {
                    bitDepths[block.bitsPerPixel] = true;
                } else {
                    bitDepths[0] = true;
                }
            }

            return Object.keys(bitDepths);
        };

        const parse = function (input:any, fp:any, skipMask:any) {
            const data:any = {};

            // File header
            const fileIdView:any = new Uint8Array(input, fp, 10);
            data.fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
            if (data.fileIdentifierString.trim() !== 'CntZImage') {
                throw 'Unexpected file identifier string: ' + data.fileIdentifierString;
            }
            fp += 10;
            let view = new DataView(input, fp, 24);
            data.fileVersion = view.getInt32(0, true);
            data.imageType = view.getInt32(4, true);
            data.height = view.getUint32(8, true);
            data.width = view.getUint32(12, true);
            data.maxZError = view.getFloat64(16, true);
            fp += 24;

            // Mask Header
            if (!skipMask) {
                view = new DataView(input, fp, 16);
                data.mask = {};
                data.mask.numBlocksY = view.getUint32(0, true);
                data.mask.numBlocksX = view.getUint32(4, true);
                data.mask.numBytes = view.getUint32(8, true);
                data.mask.maxValue = view.getFloat32(12, true);
                fp += 16;

                // Mask Data
                if (data.mask.numBytes > 0) {
                    const bitset = new Uint8Array(Math.ceil(data.width * data.height / 8));
                    view = new DataView(input, fp, data.mask.numBytes);
                    let cnt = view.getInt16(0, true);
                    let ip = 2; let op = 0;
                    do {
                        if (cnt > 0) {
                            while (cnt--) { bitset[op++] = view.getUint8(ip++); }
                        } else {
                            const val = view.getUint8(ip++);
                            cnt = -cnt;
                            while (cnt--) { bitset[op++] = val; }
                        }
                        cnt = view.getInt16(ip, true);
                        ip += 2;
                    } while (ip < data.mask.numBytes);
                    if ((cnt !== -32768) || (op < bitset.length)) {
                        throw 'Unexpected end of mask RLE encoding';
                    }
                    data.mask.bitset = bitset;
                    fp += data.mask.numBytes;
                } else if ((data.mask.numBytes | data.mask.numBlocksY | data.mask.maxValue) === 0) { // Special case, all nodata
                    data.mask.bitset = new Uint8Array(Math.ceil(data.width * data.height / 8));
                }
            }

            // Pixel Header
            view = new DataView(input, fp, 16);
            data.pixels = {};
            data.pixels.numBlocksY = view.getUint32(0, true);
            data.pixels.numBlocksX = view.getUint32(4, true);
            data.pixels.numBytes = view.getUint32(8, true);
            data.pixels.maxValue = view.getFloat32(12, true);
            fp += 16;

            const numBlocksX = data.pixels.numBlocksX;
            const numBlocksY = data.pixels.numBlocksY;
            // the number of blocks specified in the header does not take into account the blocks at the end of
            // each row/column with a special width/height that make the image complete in case the width is not
            // evenly divisible by the number of blocks.
            const actualNumBlocksX = numBlocksX + ((data.width % numBlocksX) > 0 ? 1 : 0);
            const actualNumBlocksY = numBlocksY + ((data.height % numBlocksY) > 0 ? 1 : 0);
            data.pixels.blocks = new Array(actualNumBlocksX * actualNumBlocksY);
            let blockI = 0;
            for (let blockY = 0; blockY < actualNumBlocksY; blockY++) {
                for (let blockX = 0; blockX < actualNumBlocksX; blockX++) {
                    // Block
                    let size = 0;
                    const bytesLeft = input.byteLength - fp;
                    view = new DataView(input, fp, Math.min(10, bytesLeft));
                    const block:any = {};
                    data.pixels.blocks[blockI++] = block;
                    let headerByte = view.getUint8(0); size++;
                    block.encoding = headerByte & 63;
                    if (block.encoding > 3) {
                        throw 'Invalid block encoding (' + block.encoding + ')';
                    }
                    if (block.encoding === 2) {
                        fp++;
                        continue;
                    }
                    if ((headerByte !== 0) && (headerByte !== 2)) {
                        headerByte >>= 6;
                        block.offsetType = headerByte;
                        if (headerByte === 2) {
                            block.offset = view.getInt8(1); size++;
                        } else if (headerByte === 1) {
                            block.offset = view.getInt16(1, true); size += 2;
                        } else if (headerByte === 0) {
                            block.offset = view.getFloat32(1, true); size += 4;
                        } else {
                            throw 'Invalid block offset type';
                        }

                        if (block.encoding === 1) {
                            headerByte = view.getUint8(size); size++;
                            block.bitsPerPixel = headerByte & 63;
                            headerByte >>= 6;
                            block.numValidPixelsType = headerByte;
                            if (headerByte === 2) {
                                block.numValidPixels = view.getUint8(size); size++;
                            } else if (headerByte === 1) {
                                block.numValidPixels = view.getUint16(size, true); size += 2;
                            } else if (headerByte === 0) {
                                block.numValidPixels = view.getUint32(size, true); size += 4;
                            } else {
                                throw 'Invalid valid pixel count type';
                            }
                        }
                    }
                    fp += size;

                    if (block.encoding === 3) {
                        continue;
                    }

                    let arrayBuf, store8;
                    if (block.encoding === 0) {
                        const numPixels = (data.pixels.numBytes - 1) / 4;
                        if (numPixels !== Math.floor(numPixels)) {
                            throw 'uncompressed block has invalid length';
                        }
                        arrayBuf = new ArrayBuffer(numPixels * 4);
                        store8 = new Uint8Array(arrayBuf);
                        store8.set(new Uint8Array(input, fp, numPixels * 4));
                        const rawData = new Float32Array(arrayBuf);
                        block.rawData = rawData;
                        fp += numPixels * 4;
                    } else if (block.encoding === 1) {
                        const dataBytes = Math.ceil(block.numValidPixels * block.bitsPerPixel / 8);
                        const dataWords = Math.ceil(dataBytes / 4);
                        arrayBuf = new ArrayBuffer(dataWords * 4);
                        store8 = new Uint8Array(arrayBuf);
                        store8.set(new Uint8Array(input, fp, dataBytes));
                        block.stuffedData = new Uint32Array(arrayBuf);
                        fp += dataBytes;
                    }
                }
            }
            data.eofOffset = fp;
            return data;
        };

        const unstuff = function (src:any, bitsPerPixel:any, numPixels:any, offset:any, scale:any, dest:any, maxValue:any) {
            const bitMask = (1 << bitsPerPixel) - 1;
            let i = 0; let o;
            let bitsLeft = 0;
            let n, buffer;
            const nmax = Math.ceil((maxValue - offset) / scale);
            // get rid of trailing bytes that are already part of next block
            const numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
            src[src.length - 1] <<= 8 * numInvalidTailBytes;

            for (o = 0; o < numPixels; o++) {
                if (bitsLeft === 0) {
                    buffer = src[i++];
                    bitsLeft = 32;
                }
                if (bitsLeft >= bitsPerPixel) {
                    n = (buffer >>> (bitsLeft - bitsPerPixel)) & bitMask;
                    bitsLeft -= bitsPerPixel;
                } else {
                    const missingBits = (bitsPerPixel - bitsLeft);
                    n = ((buffer & bitMask) << missingBits) & bitMask;
                    buffer = src[i++];
                    bitsLeft = 32 - missingBits;
                    n += (buffer >>> bitsLeft);
                }
                // pixel values may exceed max due to quantization
                dest[o] = n < nmax ? offset + n * scale : maxValue;
            }
            return dest;
        };

        return CntZImage;
    })();

    // version 2. Supports 2.1, 2.2, 2.3
    const Lerc2Decode = (function () {
        'use strict';
        // Note: currently, this module only has an implementation for decoding LERC data, not encoding. The name of
        // the class was chosen to be future proof, following LercDecode.

        /*****************************************
    * private static class bitsutffer used by Lerc2Decode
    *******************************************/
        const BitStuffer = {
            // methods ending with 2 are for the new byte order used by Lerc2.3 and above.
            // originalUnstuff is used to unpack Huffman code table. code is duplicated to unstuffx for performance reasons.
            unstuff: function (src:any, dest:any, bitsPerPixel:any, numPixels:any, lutArr:any, offset?:any, scale?:any, maxValue?:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o;
                let bitsLeft = 0;
                let n, buffer, missingBits, nmax;

                // get rid of trailing bytes that are already part of next block
                const numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
                src[src.length - 1] <<= 8 * numInvalidTailBytes;
                if (lutArr) {
                    for (o = 0; o < numPixels; o++) {
                        if (bitsLeft === 0) {
                            buffer = src[i++];
                            bitsLeft = 32;
                        }
                        if (bitsLeft >= bitsPerPixel) {
                            n = (buffer >>> (bitsLeft - bitsPerPixel)) & bitMask;
                            bitsLeft -= bitsPerPixel;
                        } else {
                            missingBits = (bitsPerPixel - bitsLeft);
                            n = ((buffer & bitMask) << missingBits) & bitMask;
                            buffer = src[i++];
                            bitsLeft = 32 - missingBits;
                            n += (buffer >>> bitsLeft);
                        }
                        dest[o] = lutArr[n];// offset + lutArr[n] * scale;
                    }
                } else {
                    nmax = Math.ceil((maxValue - offset) / scale);
                    for (o = 0; o < numPixels; o++) {
                        if (bitsLeft === 0) {
                            buffer = src[i++];
                            bitsLeft = 32;
                        }
                        if (bitsLeft >= bitsPerPixel) {
                            n = (buffer >>> (bitsLeft - bitsPerPixel)) & bitMask;
                            bitsLeft -= bitsPerPixel;
                        } else {
                            missingBits = (bitsPerPixel - bitsLeft);
                            n = ((buffer & bitMask) << missingBits) & bitMask;
                            buffer = src[i++];
                            bitsLeft = 32 - missingBits;
                            n += (buffer >>> bitsLeft);
                        }
                        // pixel values may exceed max due to quantization
                        dest[o] = n < nmax ? offset + n * scale : maxValue;
                    }
                }
            },

            unstuffLUT: function (src:any, bitsPerPixel:any, numPixels:any, offset:any, scale:any, maxValue:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o = 0; let missingBits = 0; let bitsLeft = 0; let n = 0;
                let buffer;
                const dest = [];

                // get rid of trailing bytes that are already part of next block
                const numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
                src[src.length - 1] <<= 8 * numInvalidTailBytes;

                const nmax = Math.ceil((maxValue - offset) / scale);
                for (o = 0; o < numPixels; o++) {
                    if (bitsLeft === 0) {
                        buffer = src[i++];
                        bitsLeft = 32;
                    }
                    if (bitsLeft >= bitsPerPixel) {
                        n = (buffer >>> (bitsLeft - bitsPerPixel)) & bitMask;
                        bitsLeft -= bitsPerPixel;
                    } else {
                        missingBits = (bitsPerPixel - bitsLeft);
                        n = ((buffer & bitMask) << missingBits) & bitMask;
                        buffer = src[i++];
                        bitsLeft = 32 - missingBits;
                        n += (buffer >>> bitsLeft);
                    }
                    // dest.push(n);
                    dest[o] = n < nmax ? offset + n * scale : maxValue;
                }
                dest.unshift(offset);// 1st one
                return dest;
            },

            unstuff2: function (src:any, dest:any, bitsPerPixel:any, numPixels:any, lutArr:any, offset?:any, scale?:any, maxValue?:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o;
                let bitsLeft = 0; let bitPos = 0;
                let n, buffer, missingBits;
                if (lutArr) {
                    for (o = 0; o < numPixels; o++) {
                        if (bitsLeft === 0) {
                            buffer = src[i++];
                            bitsLeft = 32;
                            bitPos = 0;
                        }
                        if (bitsLeft >= bitsPerPixel) {
                            n = ((buffer >>> bitPos) & bitMask);
                            bitsLeft -= bitsPerPixel;
                            bitPos += bitsPerPixel;
                        } else {
                            missingBits = (bitsPerPixel - bitsLeft);
                            n = (buffer >>> bitPos) & bitMask;
                            buffer = src[i++];
                            bitsLeft = 32 - missingBits;
                            n |= (buffer & ((1 << missingBits) - 1)) << (bitsPerPixel - missingBits);
                            bitPos = missingBits;
                        }
                        dest[o] = lutArr[n];
                    }
                } else {
                    const nmax = Math.ceil((maxValue - offset) / scale);
                    for (o = 0; o < numPixels; o++) {
                        if (bitsLeft === 0) {
                            buffer = src[i++];
                            bitsLeft = 32;
                            bitPos = 0;
                        }
                        if (bitsLeft >= bitsPerPixel) {
                            // no unsigned left shift
                            n = ((buffer >>> bitPos) & bitMask);
                            bitsLeft -= bitsPerPixel;
                            bitPos += bitsPerPixel;
                        } else {
                            missingBits = (bitsPerPixel - bitsLeft);
                            n = (buffer >>> bitPos) & bitMask;// ((buffer & bitMask) << missingBits) & bitMask;
                            buffer = src[i++];
                            bitsLeft = 32 - missingBits;
                            n |= (buffer & ((1 << missingBits) - 1)) << (bitsPerPixel - missingBits);
                            bitPos = missingBits;
                        }
                        // pixel values may exceed max due to quantization
                        dest[o] = n < nmax ? offset + n * scale : maxValue;
                    }
                }
                return dest;
            },

            unstuffLUT2: function (src:any, bitsPerPixel:any, numPixels:any, offset:any, scale:any, maxValue:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o = 0; let missingBits = 0; let bitsLeft = 0; let n = 0; let bitPos = 0;
                let buffer;
                const dest = [];
                const nmax = Math.ceil((maxValue - offset) / scale);
                for (o = 0; o < numPixels; o++) {
                    if (bitsLeft === 0) {
                        buffer = src[i++];
                        bitsLeft = 32;
                        bitPos = 0;
                    }
                    if (bitsLeft >= bitsPerPixel) {
                        // no unsigned left shift
                        n = ((buffer >>> bitPos) & bitMask);
                        bitsLeft -= bitsPerPixel;
                        bitPos += bitsPerPixel;
                    } else {
                        missingBits = (bitsPerPixel - bitsLeft);
                        n = (buffer >>> bitPos) & bitMask;// ((buffer & bitMask) << missingBits) & bitMask;
                        buffer = src[i++];
                        bitsLeft = 32 - missingBits;
                        n |= (buffer & ((1 << missingBits) - 1)) << (bitsPerPixel - missingBits);
                        bitPos = missingBits;
                    }
                    // dest.push(n);
                    dest[o] = n < nmax ? offset + n * scale : maxValue;
                }
                dest.unshift(offset);
                return dest;
            },

            originalUnstuff: function (src:any, dest:any, bitsPerPixel:any, numPixels:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o;
                let bitsLeft = 0;
                let n, buffer, missingBits;

                // get rid of trailing bytes that are already part of next block
                const numInvalidTailBytes = src.length * 4 - Math.ceil(bitsPerPixel * numPixels / 8);
                src[src.length - 1] <<= 8 * numInvalidTailBytes;

                for (o = 0; o < numPixels; o++) {
                    if (bitsLeft === 0) {
                        buffer = src[i++];
                        bitsLeft = 32;
                    }
                    if (bitsLeft >= bitsPerPixel) {
                        n = (buffer >>> (bitsLeft - bitsPerPixel)) & bitMask;
                        bitsLeft -= bitsPerPixel;
                    } else {
                        missingBits = (bitsPerPixel - bitsLeft);
                        n = ((buffer & bitMask) << missingBits) & bitMask;
                        buffer = src[i++];
                        bitsLeft = 32 - missingBits;
                        n += (buffer >>> bitsLeft);
                    }
                    dest[o] = n;
                }
                return dest;
            },

            originalUnstuff2: function (src:any, dest:any, bitsPerPixel:any, numPixels:any) {
                const bitMask = (1 << bitsPerPixel) - 1;
                let i = 0; let o;
                let bitsLeft = 0; let bitPos = 0;
                let n, buffer, missingBits;
                // micro-optimizations
                for (o = 0; o < numPixels; o++) {
                    if (bitsLeft === 0) {
                        buffer = src[i++];
                        bitsLeft = 32;
                        bitPos = 0;
                    }
                    if (bitsLeft >= bitsPerPixel) {
                        // no unsigned left shift
                        n = ((buffer >>> bitPos) & bitMask);
                        bitsLeft -= bitsPerPixel;
                        bitPos += bitsPerPixel;
                    } else {
                        missingBits = (bitsPerPixel - bitsLeft);
                        n = (buffer >>> bitPos) & bitMask;// ((buffer & bitMask) << missingBits) & bitMask;
                        buffer = src[i++];
                        bitsLeft = 32 - missingBits;
                        n |= (buffer & ((1 << missingBits) - 1)) << (bitsPerPixel - missingBits);
                        bitPos = missingBits;
                    }
                    dest[o] = n;
                }
                return dest;
            }
        };

        /*****************************************
    *private static class used by Lerc2Decode
    ******************************************/
        const Lerc2Helpers = {
            HUFFMAN_LUT_BITS_MAX: 12, // use 2^12 lut, treat it like constant
            computeChecksumFletcher32: function (input:any) {
                let sum1 = 0xffff; let sum2 = 0xffff;
                const len = input.length;
                let words = Math.floor(len / 2);
                let i = 0;
                while (words) {
                    let tlen = (words >= 359) ? 359 : words;
                    words -= tlen;
                    do {
                        sum1 += (input[i++] << 8);
                        sum2 += sum1 += input[i++];
                    } while (--tlen);

                    sum1 = (sum1 & 0xffff) + (sum1 >>> 16);
                    sum2 = (sum2 & 0xffff) + (sum2 >>> 16);
                }

                // add the straggler byte if it exists
                if (len & 1) {
                    sum2 += sum1 += (input[i] << 8);
                }
                // second reduction step to reduce sums to 16 bits
                sum1 = (sum1 & 0xffff) + (sum1 >>> 16);
                sum2 = (sum2 & 0xffff) + (sum2 >>> 16);

                return (sum2 << 16 | sum1) >>> 0;
            },

            readHeaderInfo: function (input:any, data:any) {
                let ptr = data.ptr;
                const fileIdView:any = new Uint8Array(input, ptr, 6);
                const headerInfo :any = {};
                headerInfo.fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
                if (headerInfo.fileIdentifierString.lastIndexOf('Lerc2', 0) !== 0) {
                    throw 'Unexpected file identifier string (expect Lerc2 ): ' + headerInfo.fileIdentifierString;
                }
                ptr += 6;
                let view = new DataView(input, ptr, 8);
                const fileVersion = view.getInt32(0, true);
                headerInfo.fileVersion = fileVersion;
                ptr += 4;
                if (fileVersion >= 3) {
                    headerInfo.checksum = view.getUint32(4, true); // nrows
                    ptr += 4;
                }

                // keys start from here
                view = new DataView(input, ptr, 12);
                headerInfo.height = view.getUint32(0, true); // nrows
                headerInfo.width = view.getUint32(4, true); // ncols
                ptr += 8;
                if (fileVersion >= 4) {
                    headerInfo.numDims = view.getUint32(8, true);
                    ptr += 4;
                } else {
                    headerInfo.numDims = 1;
                }

                view = new DataView(input, ptr, 40);
                headerInfo.numValidPixel = view.getUint32(0, true);
                headerInfo.microBlockSize = view.getInt32(4, true);
                headerInfo.blobSize = view.getInt32(8, true);
                headerInfo.imageType = view.getInt32(12, true);

                headerInfo.maxZError = view.getFloat64(16, true);
                headerInfo.zMin = view.getFloat64(24, true);
                headerInfo.zMax = view.getFloat64(32, true);
                ptr += 40;
                data.headerInfo = headerInfo;
                data.ptr = ptr;

                let checksum, keyLength;
                if (fileVersion >= 3) {
                    keyLength = fileVersion >= 4 ? 52 : 48;
                    checksum = this.computeChecksumFletcher32(new Uint8Array(input, ptr - keyLength, headerInfo.blobSize - 14));
                    if (checksum !== headerInfo.checksum) {
                        throw 'Checksum failed.';
                    }
                }
                return true;
            },

            checkMinMaxRanges: function (input:any, data:any) {
                const headerInfo = data.headerInfo;
                const OutPixelTypeArray = this.getDataTypeArray(headerInfo.imageType);
                const rangeBytes = headerInfo.numDims * this.getDataTypeSize(headerInfo.imageType);
                const minValues = this.readSubArray(input, data.ptr, OutPixelTypeArray, rangeBytes);
                const maxValues = this.readSubArray(input, data.ptr + rangeBytes, OutPixelTypeArray, rangeBytes);
                data.ptr += (2 * rangeBytes);
                let i; let equal = true;
                for (i = 0; i < headerInfo.numDims; i++) {
                    if (minValues[i] !== maxValues[i]) {
                        equal = false;
                        break;
                    }
                }
                headerInfo.minValues = minValues;
                headerInfo.maxValues = maxValues;
                return equal;
            },

            readSubArray: function (input:any, ptr:any, OutPixelTypeArray:any, numBytes:any) {
                let rawData;
                if (OutPixelTypeArray === Uint8Array) {
                    rawData = new Uint8Array(input, ptr, numBytes);
                } else {
                    const arrayBuf = new ArrayBuffer(numBytes);
                    const store8 = new Uint8Array(arrayBuf);
                    store8.set(new Uint8Array(input, ptr, numBytes));
                    rawData = new OutPixelTypeArray(arrayBuf);
                }
                return rawData;
            },

            readMask: function (input:any, data:any) {
                let ptr = data.ptr;
                const headerInfo = data.headerInfo;
                const numPixels = headerInfo.width * headerInfo.height;
                const numValidPixel = headerInfo.numValidPixel;

                let view = new DataView(input, ptr, 4);
                const mask:any = {};
                mask.numBytes = view.getUint32(0, true);
                ptr += 4;

                // Mask Data
                if ((numValidPixel === 0 || numPixels === numValidPixel) && mask.numBytes !== 0) {
                    throw ('invalid mask');
                }
                let bitset, resultMask;
                if (numValidPixel === 0) {
                    bitset = new Uint8Array(Math.ceil(numPixels / 8));
                    mask.bitset = bitset;
                    resultMask = new Uint8Array(numPixels);
                    data.pixels.resultMask = resultMask;
                    ptr += mask.numBytes;
                }// ????? else if (data.mask.numBytes > 0 && data.mask.numBytes< data.numValidPixel) {
                else if (mask.numBytes > 0) {
                    bitset = new Uint8Array(Math.ceil(numPixels / 8));
                    view = new DataView(input, ptr, mask.numBytes);
                    let cnt = view.getInt16(0, true);
                    let ip = 2; let op = 0; let val = 0;
                    do {
                        if (cnt > 0) {
                            while (cnt--) { bitset[op++] = view.getUint8(ip++); }
                        } else {
                            val = view.getUint8(ip++);
                            cnt = -cnt;
                            while (cnt--) { bitset[op++] = val; }
                        }
                        cnt = view.getInt16(ip, true);
                        ip += 2;
                    } while (ip < mask.numBytes);
                    if ((cnt !== -32768) || (op < bitset.length)) {
                        throw 'Unexpected end of mask RLE encoding';
                    }

                    resultMask = new Uint8Array(numPixels);
                    let mb = 0; let k = 0;

                    for (k = 0; k < numPixels; k++) {
                        if (k & 7) {
                            mb = bitset[k >> 3];
                            mb <<= k & 7;
                        } else {
                            mb = bitset[k >> 3];
                        }
                        if (mb & 128) {
                            resultMask[k] = 1;
                        }
                    }
                    data.pixels.resultMask = resultMask;

                    mask.bitset = bitset;
                    ptr += mask.numBytes;
                }
                data.ptr = ptr;
                data.mask = mask;
                return true;
            },

            readDataOneSweep: function (input:any, data:any, OutPixelTypeArray:any) {
                let ptr = data.ptr;
                const headerInfo = data.headerInfo;
                const numDims = headerInfo.numDims;
                const numPixels = headerInfo.width * headerInfo.height;
                const imageType = headerInfo.imageType;
                const numBytes = headerInfo.numValidPixel * Lerc2Helpers.getDataTypeSize(imageType) * numDims;
                // data.pixels.numBytes = numBytes;
                let rawData;
                const mask = data.pixels.resultMask;
                if (OutPixelTypeArray === Uint8Array) {
                    rawData = new Uint8Array(input, ptr, numBytes);
                } else {
                    const arrayBuf = new ArrayBuffer(numBytes);
                    const store8 = new Uint8Array(arrayBuf);
                    store8.set(new Uint8Array(input, ptr, numBytes));
                    rawData = new OutPixelTypeArray(arrayBuf);
                }
                if (rawData.length === numPixels * numDims) {
                    data.pixels.resultPixels = rawData;
                } else // mask
                {
                    data.pixels.resultPixels = new OutPixelTypeArray(numPixels * numDims);
                    let z = 0; let k = 0; let i = 0; let nStart = 0;
                    if (numDims > 1) {
                        for (i = 0; i < numDims; i++) {
                            nStart = i * numPixels;
                            for (k = 0; k < numPixels; k++) {
                                if (mask[k]) {
                                    data.pixels.resultPixels[nStart + k] = rawData[z++];
                                }
                            }
                        }
                    } else {
                        for (k = 0; k < numPixels; k++) {
                            if (mask[k]) {
                                data.pixels.resultPixels[k] = rawData[z++];
                            }
                        }
                    }
                }
                ptr += numBytes;
                data.ptr = ptr; // return data;
                return true;
            },

            readHuffmanTree: function (input:any, data:any) {
                const BITS_MAX = this.HUFFMAN_LUT_BITS_MAX; // 8 is slow for the large test image
                // var size_max = 1 << BITS_MAX;
                /* ************************
         * reading code table
         *************************/
                const view = new DataView(input, data.ptr, 16);
                data.ptr += 16;
                const version = view.getInt32(0, true);
                if (version < 2) {
                    throw 'unsupported Huffman version';
                }
                const size = view.getInt32(4, true);
                const i0 = view.getInt32(8, true);
                const i1 = view.getInt32(12, true);
                if (i0 >= i1) {
                    return false;
                }
                const blockDataBuffer = new Uint32Array(i1 - i0);
                Lerc2Helpers.decodeBits(input, data, blockDataBuffer);
                const codeTable :any = []; // size
                let i, j, k, len;

                for (i = i0; i < i1; i++) {
                    j = i - (i < size ? 0 : size);// wrap around
                    codeTable[j] = { first: blockDataBuffer[i - i0], second: null };
                }

                const dataBytes = input.byteLength - data.ptr;
                const dataWords = Math.ceil(dataBytes / 4);
                const arrayBuf = new ArrayBuffer(dataWords * 4);
                const store8 = new Uint8Array(arrayBuf);
                store8.set(new Uint8Array(input, data.ptr, dataBytes));
                const stuffedData = new Uint32Array(arrayBuf); // must start from x*4
                let bitPos = 0; let word; let srcPtr = 0;
                word = stuffedData[0];
                for (i = i0; i < i1; i++) {
                    j = i - (i < size ? 0 : size);// wrap around
                    len = codeTable[j].first;
                    if (len > 0) {
                        codeTable[j].second = (word << bitPos) >>> (32 - len);

                        if (32 - bitPos >= len) {
                            bitPos += len;
                            if (bitPos === 32) {
                                bitPos = 0;
                                srcPtr++;
                                word = stuffedData[srcPtr];
                            }
                        } else {
                            bitPos += len - 32;
                            srcPtr++;
                            word = stuffedData[srcPtr];
                            codeTable[j].second |= word >>> (32 - bitPos);
                        }
                    }
                }

                // finished reading code table

                /* ************************
         * building lut
         *************************/
                let numBitsLUT = 0; let numBitsLUTQick = 0;
                const tree = new TreeNode();
                for (i = 0; i < codeTable.length; i++) {
                    if (codeTable[i] !== undefined) {
                        numBitsLUT = Math.max(numBitsLUT, codeTable[i].first);
                    }
                }
                if (numBitsLUT >= BITS_MAX) {
                    numBitsLUTQick = BITS_MAX;
                } else {
                    numBitsLUTQick = numBitsLUT;
                }
                if (numBitsLUT >= 30) {
                    console.log('WARning, large NUM LUT BITS IS ' + numBitsLUT);
                }
                const decodeLut = []; let entry; let code; let numEntries; let jj; let currentBit; let node;
                for (i = i0; i < i1; i++) {
                    j = i - (i < size ? 0 : size);// wrap around
                    len = codeTable[j].first;
                    if (len > 0) {
                        entry = [len, j];
                        if (len <= numBitsLUTQick) {
                            code = codeTable[j].second << (numBitsLUTQick - len);
                            numEntries = 1 << (numBitsLUTQick - len);
                            for (k = 0; k < numEntries; k++) {
                                decodeLut[code | k] = entry;
                            }
                        } else {
                            // build tree
                            code = codeTable[j].second;
                            node = tree;
                            for (jj = len - 1; jj >= 0; jj--) {
                                currentBit = code >>> jj & 1; // no left shift as length could be 30,31
                                if (currentBit) {
                                    if (!node.right) {
                                        node.right = new TreeNode();
                                    }
                                    node = node.right;
                                } else {
                                    if (!node.left) {
                                        node.left = new TreeNode();
                                    }
                                    node = node.left;
                                }
                                if (jj === 0 && !node.val) {
                                    node.val = entry[1];
                                }
                            }
                        }
                    }
                }
                return {
                    decodeLut: decodeLut,
                    numBitsLUTQick: numBitsLUTQick,
                    numBitsLUT: numBitsLUT,
                    tree: tree,
                    stuffedData: stuffedData,
                    srcPtr: srcPtr,
                    bitPos: bitPos
                };
            },

            readHuffman: function (input:any, data:any, OutPixelTypeArray:any) {
                const headerInfo = data.headerInfo;
                const numDims = headerInfo.numDims;
                const height = data.headerInfo.height;
                const width = data.headerInfo.width;
                const numPixels = width * height;
                // var size_max = 1 << BITS_MAX;
                /* ************************
         * reading huffman structure info
         *************************/
                const huffmanInfo:any = this.readHuffmanTree(input, data);
                const decodeLut = huffmanInfo.decodeLut;
                const tree = huffmanInfo.tree;
                // stuffedData includes huffman headers
                const stuffedData = huffmanInfo.stuffedData;
                let srcPtr = huffmanInfo.srcPtr;
                let bitPos = huffmanInfo.bitPos;
                const numBitsLUTQick = huffmanInfo.numBitsLUTQick;
                const numBitsLUT = huffmanInfo.numBitsLUT;
                const offset = data.headerInfo.imageType === 0 ? 128 : 0;
                /*************************
        *  decode
        ***************************/
                let node; let val; let delta; const mask = data.pixels.resultMask; let valTmp; let valTmpQuick; let currentBit;
                let i, j, k, ii;
                let prevVal = 0;
                if (bitPos > 0) {
                    srcPtr++;
                    bitPos = 0;
                }
                let word = stuffedData[srcPtr];
                const deltaEncode = data.encodeMode === 1;
                const resultPixelsAllDim = new OutPixelTypeArray(numPixels * numDims);
                let resultPixels = resultPixelsAllDim;
                let iDim;
                for (iDim = 0; iDim < headerInfo.numDims; iDim++) {
                    if (numDims > 1) {
                        // get the mem block of current dimension
                        resultPixels = new OutPixelTypeArray(resultPixelsAllDim.buffer, numPixels * iDim, numPixels);
                        prevVal = 0;
                    }
                    if (data.headerInfo.numValidPixel === width * height) { // all valid
                        for (k = 0, i = 0; i < height; i++) {
                            for (j = 0; j < width; j++, k++) {
                                val = 0;
                                valTmp = (word << bitPos) >>> (32 - numBitsLUTQick);
                                valTmpQuick = valTmp;// >>> deltaBits;
                                if (32 - bitPos < numBitsLUTQick) {
                                    valTmp |= ((stuffedData[srcPtr + 1]) >>> (64 - bitPos - numBitsLUTQick));
                                    valTmpQuick = valTmp;// >>> deltaBits;
                                }
                                if (decodeLut[valTmpQuick]) // if there, move the correct number of bits and done
                                {
                                    val = decodeLut[valTmpQuick][1];
                                    bitPos += decodeLut[valTmpQuick][0];
                                } else {
                                    valTmp = (word << bitPos) >>> (32 - numBitsLUT);
                                    valTmpQuick = valTmp;// >>> deltaBits;
                                    if (32 - bitPos < numBitsLUT) {
                                        valTmp |= ((stuffedData[srcPtr + 1]) >>> (64 - bitPos - numBitsLUT));
                                        valTmpQuick = valTmp;// >>> deltaBits;
                                    }
                                    node = tree;
                                    for (ii = 0; ii < numBitsLUT; ii++) {
                                        currentBit = valTmp >>> (numBitsLUT - ii - 1) & 1;
                                        node = currentBit ? node.right : node.left;
                                        if (!(node.left || node.right)) {
                                            val = node.val;
                                            bitPos = bitPos + ii + 1;
                                            break;
                                        }
                                    }
                                }

                                if (bitPos >= 32) {
                                    bitPos -= 32;
                                    srcPtr++;
                                    word = stuffedData[srcPtr];
                                }

                                delta = val - offset;
                                if (deltaEncode) {
                                    if (j > 0) {
                                        delta += prevVal; // use overflow
                                    } else if (i > 0) {
                                        delta += resultPixels[k - width];
                                    } else {
                                        delta += prevVal;
                                    }
                                    delta &= 0xFF; // overflow
                                    resultPixels[k] = delta;// overflow
                                    prevVal = delta;
                                } else {
                                    resultPixels[k] = delta;
                                }
                            }
                        }
                    } else { // not all valid, use mask
                        for (k = 0, i = 0; i < height; i++) {
                            for (j = 0; j < width; j++, k++) {
                                if (mask[k]) {
                                    val = 0;
                                    valTmp = (word << bitPos) >>> (32 - numBitsLUTQick);
                                    valTmpQuick = valTmp;// >>> deltaBits;
                                    if (32 - bitPos < numBitsLUTQick) {
                                        valTmp |= ((stuffedData[srcPtr + 1]) >>> (64 - bitPos - numBitsLUTQick));
                                        valTmpQuick = valTmp;// >>> deltaBits;
                                    }
                                    if (decodeLut[valTmpQuick]) // if there, move the correct number of bits and done
                                    {
                                        val = decodeLut[valTmpQuick][1];
                                        bitPos += decodeLut[valTmpQuick][0];
                                    } else {
                                        valTmp = (word << bitPos) >>> (32 - numBitsLUT);
                                        valTmpQuick = valTmp;// >>> deltaBits;
                                        if (32 - bitPos < numBitsLUT) {
                                            valTmp |= ((stuffedData[srcPtr + 1]) >>> (64 - bitPos - numBitsLUT));
                                            valTmpQuick = valTmp;// >>> deltaBits;
                                        }
                                        node = tree;
                                        for (ii = 0; ii < numBitsLUT; ii++) {
                                            currentBit = valTmp >>> (numBitsLUT - ii - 1) & 1;
                                            node = currentBit ? node.right : node.left;
                                            if (!(node.left || node.right)) {
                                                val = node.val;
                                                bitPos = bitPos + ii + 1;
                                                break;
                                            }
                                        }
                                    }

                                    if (bitPos >= 32) {
                                        bitPos -= 32;
                                        srcPtr++;
                                        word = stuffedData[srcPtr];
                                    }

                                    delta = val - offset;
                                    if (deltaEncode) {
                                        if (j > 0 && mask[k - 1]) {
                                            delta += prevVal; // use overflow
                                        } else if (i > 0 && mask[k - width]) {
                                            delta += resultPixels[k - width];
                                        } else {
                                            delta += prevVal;
                                        }

                                        delta &= 0xFF; // overflow
                                        resultPixels[k] = delta;// overflow
                                        prevVal = delta;
                                    } else {
                                        resultPixels[k] = delta;
                                    }
                                }
                            }
                        }
                    }
                    data.ptr = data.ptr + (srcPtr + 1) * 4 + (bitPos > 0 ? 4 : 0);
                }
                data.pixels.resultPixels = resultPixelsAllDim;
            },

            decodeBits: function (input:any, data:any, blockDataBuffer:any, offset?:any, iDim?:any) {
                // bitstuff encoding is 3
                const headerInfo = data.headerInfo;
                const fileVersion = headerInfo.fileVersion;
                // var block = {};
                let blockPtr = 0;
                const viewByteLength = ((input.byteLength - data.ptr) >= 5) ? 5 : (input.byteLength - data.ptr);
                const view = new DataView(input, data.ptr, viewByteLength);
                const headerByte = view.getUint8(0);
                blockPtr++;
                const bits67 = headerByte >> 6;
                const n = (bits67 === 0) ? 4 : 3 - bits67;
                const doLut = (headerByte & 32) > 0;// 5th bit
                const numBits = headerByte & 31;
                let numElements = 0;
                if (n === 1) {
                    numElements = view.getUint8(blockPtr); blockPtr++;
                } else if (n === 2) {
                    numElements = view.getUint16(blockPtr, true); blockPtr += 2;
                } else if (n === 4) {
                    numElements = view.getUint32(blockPtr, true); blockPtr += 4;
                } else {
                    throw 'Invalid valid pixel count type';
                }
                // fix: huffman codes are bit stuffed, but not bound by data's max value, so need to use originalUnstuff
                // offset = offset || 0;
                const scale = 2 * headerInfo.maxZError;
                let stuffedData, arrayBuf, store8, dataBytes, dataWords;
                let lutArr, lutData, lutBytes, lutBitsPerElement, bitsPerPixel;
                const zMax = headerInfo.numDims > 1 ? headerInfo.maxValues[iDim] : headerInfo.zMax;
                if (doLut) {
                    data.counter.lut++;
                    lutBytes = view.getUint8(blockPtr);
                    lutBitsPerElement = numBits;
                    blockPtr++;
                    dataBytes = Math.ceil((lutBytes - 1) * numBits / 8);
                    dataWords = Math.ceil(dataBytes / 4);
                    arrayBuf = new ArrayBuffer(dataWords * 4);
                    store8 = new Uint8Array(arrayBuf);

                    data.ptr += blockPtr;
                    store8.set(new Uint8Array(input, data.ptr, dataBytes));

                    lutData = new Uint32Array(arrayBuf);
                    data.ptr += dataBytes;

                    bitsPerPixel = 0;
                    while ((lutBytes - 1) >>> bitsPerPixel) {
                        bitsPerPixel++;
                    }
                    dataBytes = Math.ceil(numElements * bitsPerPixel / 8);
                    dataWords = Math.ceil(dataBytes / 4);
                    arrayBuf = new ArrayBuffer(dataWords * 4);
                    store8 = new Uint8Array(arrayBuf);
                    store8.set(new Uint8Array(input, data.ptr, dataBytes));
                    stuffedData = new Uint32Array(arrayBuf);
                    data.ptr += dataBytes;
                    if (fileVersion >= 3) {
                        lutArr = BitStuffer.unstuffLUT2(lutData, numBits, lutBytes - 1, offset, scale, zMax);
                    } else {
                        lutArr = BitStuffer.unstuffLUT(lutData, numBits, lutBytes - 1, offset, scale, zMax);
                    }
                    // lutArr.unshift(0);
                    if (fileVersion >= 3) {
                        // BitStuffer.unstuff2(block, blockDataBuffer, headerInfo.zMax);
                        BitStuffer.unstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements, lutArr);
                    } else {
                        BitStuffer.unstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements, lutArr);
                    }
                } else {
                    // console.debug("bitstuffer");
                    data.counter.bitstuffer++;
                    bitsPerPixel = numBits;
                    data.ptr += blockPtr;
                    if (bitsPerPixel > 0) {
                        dataBytes = Math.ceil(numElements * bitsPerPixel / 8);
                        dataWords = Math.ceil(dataBytes / 4);
                        arrayBuf = new ArrayBuffer(dataWords * 4);
                        store8 = new Uint8Array(arrayBuf);
                        store8.set(new Uint8Array(input, data.ptr, dataBytes));
                        stuffedData = new Uint32Array(arrayBuf);
                        data.ptr += dataBytes;
                        if (fileVersion >= 3) {
                            if (offset === null) {
                                BitStuffer.originalUnstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements);
                            } else {
                                BitStuffer.unstuff2(stuffedData, blockDataBuffer, bitsPerPixel, numElements, false, offset, scale, zMax);
                            }
                        } else {
                            if (offset === null) {
                                BitStuffer.originalUnstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements);
                            } else {
                                BitStuffer.unstuff(stuffedData, blockDataBuffer, bitsPerPixel, numElements, false, offset, scale, zMax);
                            }
                        }
                    }
                }
            },

            readTiles: function (input:any, data:any, OutPixelTypeArray:any) {
                const headerInfo = data.headerInfo;
                const width = headerInfo.width;
                const height = headerInfo.height;
                const microBlockSize = headerInfo.microBlockSize;
                const imageType = headerInfo.imageType;
                const dataTypeSize = Lerc2Helpers.getDataTypeSize(imageType);
                const numBlocksX = Math.ceil(width / microBlockSize);
                const numBlocksY = Math.ceil(height / microBlockSize);
                data.pixels.numBlocksY = numBlocksY;
                data.pixels.numBlocksX = numBlocksX;
                data.pixels.ptr = 0;
                let row = 0; let col = 0; let blockY = 0; let blockX = 0; let thisBlockHeight = 0; let thisBlockWidth = 0; let bytesLeft = 0; let headerByte = 0; let bits67 = 0; let testCode = 0; let outPtr = 0; let outStride = 0; let numBytes = 0; let bytesleft = 0; let z = 0; let blockPtr = 0;
                let view, block, arrayBuf, store8, rawData;
                let blockEncoding;
                const blockDataBuffer = new OutPixelTypeArray(microBlockSize * microBlockSize);
                const lastBlockHeight = (height % microBlockSize) || microBlockSize;
                const lastBlockWidth = (width % microBlockSize) || microBlockSize;
                let offsetType, offset;
                const numDims = headerInfo.numDims; let iDim;
                const mask = data.pixels.resultMask;
                let resultPixels = data.pixels.resultPixels;
                for (blockY = 0; blockY < numBlocksY; blockY++) {
                    thisBlockHeight = (blockY !== numBlocksY - 1) ? microBlockSize : lastBlockHeight;
                    for (blockX = 0; blockX < numBlocksX; blockX++) {
                        // console.debug("y" + blockY + " x" + blockX);
                        thisBlockWidth = (blockX !== numBlocksX - 1) ? microBlockSize : lastBlockWidth;

                        outPtr = blockY * width * microBlockSize + blockX * microBlockSize;
                        outStride = width - thisBlockWidth;

                        for (iDim = 0; iDim < numDims; iDim++) {
                            if (numDims > 1) {
                                resultPixels = new OutPixelTypeArray(data.pixels.resultPixels.buffer, width * height * iDim * dataTypeSize, width * height);
                            }
                            bytesLeft = input.byteLength - data.ptr;
                            view = new DataView(input, data.ptr, Math.min(10, bytesLeft));
                            block = {};
                            blockPtr = 0;
                            headerByte = view.getUint8(0);
                            blockPtr++;
                            bits67 = (headerByte >> 6) & 0xFF;
                            testCode = (headerByte >> 2) & 15; // use bits 2345 for integrity check
                            if (testCode !== (((blockX * microBlockSize) >> 3) & 15)) {
                                throw 'integrity issue';
                                // return false;
                            }

                            blockEncoding = headerByte & 3;
                            if (blockEncoding > 3) {
                                data.ptr += blockPtr;
                                throw 'Invalid block encoding (' + blockEncoding + ')';
                            } else if (blockEncoding === 2) { // constant 0
                                data.counter.constant++;
                                data.ptr += blockPtr;
                                continue;
                            } else if (blockEncoding === 0) { // uncompressed
                                data.counter.uncompressed++;
                                data.ptr += blockPtr;
                                numBytes = thisBlockHeight * thisBlockWidth * dataTypeSize;
                                bytesleft = input.byteLength - data.ptr;
                                numBytes = numBytes < bytesleft ? numBytes : bytesleft;
                                // bit alignment
                                arrayBuf = new ArrayBuffer((numBytes % dataTypeSize) === 0 ? numBytes : (numBytes + dataTypeSize - numBytes % dataTypeSize));
                                store8 = new Uint8Array(arrayBuf);
                                store8.set(new Uint8Array(input, data.ptr, numBytes));
                                rawData = new OutPixelTypeArray(arrayBuf);
                                z = 0;
                                if (mask) {
                                    for (row = 0; row < thisBlockHeight; row++) {
                                        for (col = 0; col < thisBlockWidth; col++) {
                                            if (mask[outPtr]) {
                                                resultPixels[outPtr] = rawData[z++];
                                            }
                                            outPtr++;
                                        }
                                        outPtr += outStride;
                                    }
                                } else { // all valid
                                    for (row = 0; row < thisBlockHeight; row++) {
                                        for (col = 0; col < thisBlockWidth; col++) {
                                            resultPixels[outPtr++] = rawData[z++];
                                        }
                                        outPtr += outStride;
                                    }
                                }
                                data.ptr += z * dataTypeSize;
                            } else { // 1 or 3
                                offsetType = Lerc2Helpers.getDataTypeUsed(imageType, bits67);
                                offset = Lerc2Helpers.getOnePixel(block, blockPtr, offsetType, view);
                                blockPtr += Lerc2Helpers.getDataTypeSize(offsetType);
                                if (blockEncoding === 3) // constant offset value
                                {
                                    data.ptr += blockPtr;
                                    data.counter.constantoffset++;
                                    // you can delete the following resultMask case in favor of performance because val is constant and users use nodata mask, otherwise nodatavalue post processing handles it too.
                                    // while the above statement is true, we're not doing it as we want to keep invalid pixel value at 0 rather than arbitrary values
                                    if (mask) {
                                        for (row = 0; row < thisBlockHeight; row++) {
                                            for (col = 0; col < thisBlockWidth; col++) {
                                                if (mask[outPtr]) {
                                                    resultPixels[outPtr] = offset;
                                                }
                                                outPtr++;
                                            }
                                            outPtr += outStride;
                                        }
                                    } else {
                                        for (row = 0; row < thisBlockHeight; row++) {
                                            for (col = 0; col < thisBlockWidth; col++) {
                                                resultPixels[outPtr++] = offset;
                                            }
                                            outPtr += outStride;
                                        }
                                    }
                                } else { // bitstuff encoding is 3
                                    data.ptr += blockPtr;
                                    // heavy lifting
                                    Lerc2Helpers.decodeBits(input, data, blockDataBuffer, offset, iDim);
                                    blockPtr = 0;
                                    if (mask) {
                                        for (row = 0; row < thisBlockHeight; row++) {
                                            for (col = 0; col < thisBlockWidth; col++) {
                                                if (mask[outPtr]) {
                                                    resultPixels[outPtr] = blockDataBuffer[blockPtr++];
                                                }
                                                outPtr++;
                                            }
                                            outPtr += outStride;
                                        }
                                    } else {
                                        for (row = 0; row < thisBlockHeight; row++) {
                                            for (col = 0; col < thisBlockWidth; col++) {
                                                resultPixels[outPtr++] = blockDataBuffer[blockPtr++];
                                            }
                                            outPtr += outStride;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            /*****************
      *  private methods (helper methods)
      *****************/

            formatFileInfo: function (data:any) {
                return {
                    fileIdentifierString: data.headerInfo.fileIdentifierString,
                    fileVersion: data.headerInfo.fileVersion,
                    imageType: data.headerInfo.imageType,
                    height: data.headerInfo.height,
                    width: data.headerInfo.width,
                    numValidPixel: data.headerInfo.numValidPixel,
                    microBlockSize: data.headerInfo.microBlockSize,
                    blobSize: data.headerInfo.blobSize,
                    maxZError: data.headerInfo.maxZError,
                    pixelType: Lerc2Helpers.getPixelType(data.headerInfo.imageType),
                    eofOffset: data.eofOffset,
                    mask: data.mask ? {
                        numBytes: data.mask.numBytes
                    } : null,
                    pixels: {
                        numBlocksX: data.pixels.numBlocksX,
                        numBlocksY: data.pixels.numBlocksY,
                        // "numBytes": data.pixels.numBytes,
                        maxValue: data.headerInfo.zMax,
                        minValue: data.headerInfo.zMin,
                        noDataValue: data.noDataValue
                    }
                };
            },

            constructConstantSurface: function (data:any) {
                const val = data.headerInfo.zMax;
                const numDims = data.headerInfo.numDims;
                const numPixels = data.headerInfo.height * data.headerInfo.width;
                const numPixelAllDims = numPixels * numDims;
                let i = 0; let k = 0; let nStart = 0;
                const mask = data.pixels.resultMask;
                if (mask) {
                    if (numDims > 1) {
                        for (i = 0; i < numDims; i++) {
                            nStart = i * numPixels;
                            for (k = 0; k < numPixels; k++) {
                                if (mask[k]) {
                                    data.pixels.resultPixels[nStart + k] = val;
                                }
                            }
                        }
                    } else {
                        for (k = 0; k < numPixels; k++) {
                            if (mask[k]) {
                                data.pixels.resultPixels[k] = val;
                            }
                        }
                    }
                } else {
                    if (data.pixels.resultPixels.fill) {
                        data.pixels.resultPixels.fill(val);
                    } else {
                        for (k = 0; k < numPixelAllDims; k++) {
                            data.pixels.resultPixels[k] = val;
                        }
                    }
                }
            },

            getDataTypeArray: function (t:any) {
                let tp;
                switch (t) {
                case 0: // char
                    tp = Int8Array;
                    break;
                case 1: // byte
                    tp = Uint8Array;
                    break;
                case 2: // short
                    tp = Int16Array;
                    break;
                case 3: // ushort
                    tp = Uint16Array;
                    break;
                case 4:
                    tp = Int32Array;
                    break;
                case 5:
                    tp = Uint32Array;
                    break;
                case 6:
                    tp = Float32Array;
                    break;
                case 7:
                    tp = Float64Array;
                    break;
                default:
                    tp = Float32Array;
                }
                return tp;
            },

            getPixelType: function (t:any) {
                let tp;
                switch (t) {
                case 0: // char
                    tp = 'S8';
                    break;
                case 1: // byte
                    tp = 'U8';
                    break;
                case 2: // short
                    tp = 'S16';
                    break;
                case 3: // ushort
                    tp = 'U16';
                    break;
                case 4:
                    tp = 'S32';
                    break;
                case 5:
                    tp = 'U32';
                    break;
                case 6:
                    tp = 'F32';
                    break;
                case 7:
                    tp = 'F64'; // not supported
                    break;
                default:
                    tp = 'F32';
                }
                return tp;
            },

            isValidPixelValue: function (t:any, val:any) {
                if (val === null) {
                    return false;
                }
                let isValid;
                switch (t) {
                case 0: // char
                    isValid = val >= -128 && val <= 127;
                    break;
                case 1: // byte  (unsigned char)
                    isValid = val >= 0 && val <= 255;
                    break;
                case 2: // short
                    isValid = val >= -32768 && val <= 32767;
                    break;
                case 3: // ushort
                    isValid = val >= 0 && val <= 65536;
                    break;
                case 4: // int 32
                    isValid = val >= -2147483648 && val <= 2147483647;
                    break;
                case 5: // uinit 32
                    isValid = val >= 0 && val <= 4294967296;
                    break;
                case 6:
                    isValid = val >= -3.4027999387901484e+38 && val <= 3.4027999387901484e+38;
                    break;
                case 7:
                    isValid = val >= 5e-324 && val <= 1.7976931348623157e+308;
                    break;
                default:
                    isValid = false;
                }
                return isValid;
            },

            getDataTypeSize: function (t:any) {
                let s = 0;
                switch (t) {
                case 0: // ubyte
                case 1: // byte
                    s = 1;
                    break;
                case 2: // short
                case 3: // ushort
                    s = 2;
                    break;
                case 4:
                case 5:
                case 6:
                    s = 4;
                    break;
                case 7:
                    s = 8;
                    break;
                default:
                    s = t;
                }
                return s;
            },

            getDataTypeUsed: function (dt:any, tc:any) {
                let t = dt;
                switch (dt) {
                case 2: // short
                case 4: // long
                    t = dt - tc;
                    break;
                case 3: // ushort
                case 5: // ulong
                    t = dt - 2 * tc;
                    break;
                case 6: // float
                    if (tc === 0) {
                        t = dt;
                    } else if (tc === 1) {
                        t = 2;
                    } else {
                        t = 1;// byte
                    }
                    break;
                case 7: // double
                    if (tc === 0) {
                        t = dt;
                    } else {
                        t = dt - 2 * tc + 1;
                    }
                    break;
                default:
                    t = dt;
                    break;
                }
                return t;
            },

            getOnePixel: function (block:any, blockPtr:any, offsetType:any, view:any) {
                let temp = 0;
                switch (offsetType) {
                case 0: // char
                    temp = view.getInt8(blockPtr);
                    break;
                case 1: // byte
                    temp = view.getUint8(blockPtr);
                    break;
                case 2:
                    temp = view.getInt16(blockPtr, true);
                    break;
                case 3:
                    temp = view.getUint16(blockPtr, true);
                    break;
                case 4:
                    temp = view.getInt32(blockPtr, true);
                    break;
                case 5:
                    temp = view.getUInt32(blockPtr, true);
                    break;
                case 6:
                    temp = view.getFloat32(blockPtr, true);
                    break;
                case 7:
                    // temp = view.getFloat64(blockPtr, true);
                    // blockPtr += 8;
                    // lerc2 encoding doesnt handle float 64, force to float32???
                    temp = view.getFloat64(blockPtr, true);
                    break;
                default:
                    throw ('the decoder does not understand this pixel type');
                }
                return temp;
            }
        };

        /***************************************************
    *private class for a tree node. Huffman code is in Lerc2Helpers
    ****************************************************/
        // const TreeNode = function (val?:any, left?:any, right?:any) {
        //     this.val = val;
        //     this.left = left;
        //     this.right = right;
        // };

        class TreeNode {
            val: any;
            left: any;
            right: any;
            constructor (val?:any, left?:any, right?:any) {
                this.val = val;
                this.left = left;
                this.right = right;
            }
        }

        const Lerc2Decode = {
            /*
      * ********removed options compared to LERC1. We can bring some of them back if needed.
       * removed pixel type. LERC2 is typed and doesn't require user to give pixel type
       * changed encodedMaskData to maskData. LERC2 's js version make it faster to use maskData directly.
       * removed returnMask. mask is used by LERC2 internally and is cost free. In case of user input mask, it's returned as well and has neglible cost.
       * removed nodatavalue. Because LERC2 pixels are typed, nodatavalue will sacrify a useful value for many types (8bit, 16bit) etc,
       *       user has to be knowledgable enough about raster and their data to avoid usability issues. so nodata value is simply removed now.
       *       We can add it back later if their's a clear requirement.
       * removed encodedMask. This option was not implemented in LercDecode. It can be done after decoding (less efficient)
       * removed computeUsedBitDepths.
       *
       *
       * response changes compared to LERC1
       * 1. encodedMaskData is not available
       * 2. noDataValue is optional (returns only if user's noDataValue is with in the valid data type range)
       * 3. maskData is always available
      */
            /*****************
      *  public properties
      ******************/
            // HUFFMAN_LUT_BITS_MAX: 12, //use 2^12 lut, not configurable

            /*****************
      *  public methods
      *****************/

            /**
       * Decode a LERC2 byte stream and return an object containing the pixel data and optional metadata.
       *
       * @param {ArrayBuffer} input The LERC input byte stream
       * @param {object} [options] options Decoding options
       * @param {number} [options.inputOffset] The number of bytes to skip in the input byte stream. A valid LERC file is expected at that position
       * @param {boolean} [options.returnFileInfo] If true, the return value will have a fileInfo property that contains metadata obtained from the LERC headers and the decoding process
       */
            decode: function (/* byte array */ input:any, /* object */ options:any) {
                // currently there's a bug in the sparse array, so please do not set to false
                options = options || {};
                const noDataValue = options.noDataValue;

                // initialize
                let i = 0; const data:any = {};
                data.ptr = options.inputOffset || 0;
                data.pixels = {};

                // File header
                if (!Lerc2Helpers.readHeaderInfo(input, data)) {
                    return;
                }
                const headerInfo = data.headerInfo;
                const fileVersion = headerInfo.fileVersion;
                const OutPixelTypeArray = Lerc2Helpers.getDataTypeArray(headerInfo.imageType);

                // Mask Header
                Lerc2Helpers.readMask(input, data);
                if (headerInfo.numValidPixel !== headerInfo.width * headerInfo.height && !data.pixels.resultMask) {
                    data.pixels.resultMask = options.maskData;
                }

                const numPixels = headerInfo.width * headerInfo.height;
                data.pixels.resultPixels = new OutPixelTypeArray(numPixels * headerInfo.numDims);

                data.counter = {
                    onesweep: 0,
                    uncompressed: 0,
                    lut: 0,
                    bitstuffer: 0,
                    constant: 0,
                    constantoffset: 0
                };
                if (headerInfo.numValidPixel !== 0) {
                    // not tested
                    if (headerInfo.zMax === headerInfo.zMin) // constant surface
                    {
                        Lerc2Helpers.constructConstantSurface(data);
                    } else if (fileVersion >= 4 && Lerc2Helpers.checkMinMaxRanges(input, data)) {
                        Lerc2Helpers.constructConstantSurface(data);
                    } else {
                        const view = new DataView(input, data.ptr, 2);
                        const bReadDataOneSweep = view.getUint8(0);
                        data.ptr++;
                        if (bReadDataOneSweep) {
                            // console.debug("OneSweep");
                            Lerc2Helpers.readDataOneSweep(input, data, OutPixelTypeArray);
                        } else {
                            // lerc2.1: //bitstuffing + lut
                            // lerc2.2: //bitstuffing + lut + huffman
                            // lerc2.3: new bitstuffer
                            if (fileVersion > 1 && headerInfo.imageType <= 1 && Math.abs(headerInfo.maxZError - 0.5) < 0.00001) {
                                // this is 2.x plus 8 bit (unsigned and signed) data, possiblity of Huffman
                                const flagHuffman = view.getUint8(1);
                                data.ptr++;
                                data.encodeMode = flagHuffman;
                                if (flagHuffman > 2 || (fileVersion < 4 && flagHuffman > 1)) {
                                    throw 'Invalid Huffman flag ' + flagHuffman;
                                }
                                if (flagHuffman) { // 1 - delta Huffman, 2 - Huffman
                                    // console.log("Huffman");
                                    Lerc2Helpers.readHuffman(input, data, OutPixelTypeArray);
                                } else {
                                    // console.log("Tiles");
                                    Lerc2Helpers.readTiles(input, data, OutPixelTypeArray);
                                }
                            } else { // lerc2.x non-8 bit data
                                // console.log("Tiles");
                                Lerc2Helpers.readTiles(input, data, OutPixelTypeArray);
                            }
                        }
                    }
                }

                data.eofOffset = data.ptr;
                let diff;
                if (options.inputOffset) {
                    diff = data.headerInfo.blobSize + options.inputOffset - data.ptr;
                    if (Math.abs(diff) >= 1) {
                        // console.debug("incorrect eof: dataptr " + data.ptr + " offset " + options.inputOffset + " blobsize " + data.headerInfo.blobSize + " diff: " + diff);
                        data.eofOffset = options.inputOffset + data.headerInfo.blobSize;
                    }
                } else {
                    diff = data.headerInfo.blobSize - data.ptr;
                    if (Math.abs(diff) >= 1) {
                        // console.debug("incorrect first band eof: dataptr " + data.ptr + " blobsize " + data.headerInfo.blobSize + " diff: " + diff);
                        data.eofOffset = data.headerInfo.blobSize;
                    }
                }

                const result : any = {
                    width: headerInfo.width,
                    height: headerInfo.height,
                    pixelData: data.pixels.resultPixels,
                    minValue: headerInfo.zMin,
                    maxValue: headerInfo.zMax,
                    validPixelCount: headerInfo.numValidPixel,
                    dimCount: headerInfo.numDims,
                    dimStats: {
                        minValues: headerInfo.minValues,
                        maxValues: headerInfo.maxValues
                    },
                    maskData: data.pixels.resultMask
                    // noDataValue: noDataValue
                };

                // we should remove this if there's no existing client
                // optional noDataValue processing, it's user's responsiblity
                if (data.pixels.resultMask && Lerc2Helpers.isValidPixelValue(headerInfo.imageType, noDataValue)) {
                    const mask = data.pixels.resultMask;
                    for (i = 0; i < numPixels; i++) {
                        if (!mask[i]) {
                            result.pixelData[i] = noDataValue;
                        }
                    }
                    result.noDataValue = noDataValue;
                }
                data.noDataValue = noDataValue;
                if (options.returnFileInfo) {
                    result.fileInfo = Lerc2Helpers.formatFileInfo(data);
                }
                return result;
            },

            getBandCount: function (/* byte array */ input: any) {
                let count = 0;
                let i = 0;
                const temp: any = {};
                temp.ptr = 0;
                temp.pixels = {};
                while (i < input.byteLength - 58) {
                    Lerc2Helpers.readHeaderInfo(input, temp);
                    i += temp.headerInfo.blobSize;
                    count++;
                    temp.ptr = i;
                }
                return count;
            }
        };

        return Lerc2Decode;
    })();

    const isPlatformLittleEndian = (function () {
        const a = new ArrayBuffer(4);
        const b = new Uint8Array(a);
        const c = new Uint32Array(a);
        c[0] = 1;
        return b[0] === 1;
    })();

    const Lerc = {
    /** **********wrapper**********************************************/
    /**
     * A wrapper for decoding both LERC1 and LERC2 byte streams capable of handling multiband pixel blocks for various pixel types.
     *
     * @alias module:Lerc
     * @param {ArrayBuffer} input The LERC input byte stream
     * @param {object} [options] The decoding options below are optional.
     * @param {number} [options.inputOffset] The number of bytes to skip in the input byte stream. A valid Lerc file is expected at that position.
     * @param {string} [options.pixelType] (LERC1 only) Default value is F32. Valid pixel types for input are U8/S8/S16/U16/S32/U32/F32.
     * @param {number} [options.noDataValue] (LERC1 only). It is recommended to use the returned mask instead of setting this value.
     * @returns {{width, height, pixels, pixelType, mask, statistics}}
       * @property {number} width Width of decoded image.
       * @property {number} height Height of decoded image.
       * @property {array} pixels [band1, band2, …] Each band is a typed array of width*height.
       * @property {string} pixelType The type of pixels represented in the output.
       * @property {mask} mask Typed array with a size of width*height, or null if all pixels are valid.
       * @property {array} statistics [statistics_band1, statistics_band2, …] Each element is a statistics object representing min and max values
    **/
        decode: function (encodedData: any, options: any) {
            if (!isPlatformLittleEndian) {
                throw 'Big endian system is not supported.';
            }
            options = options || {};
            let inputOffset = options.inputOffset || 0;
            const fileIdView : any = new Uint8Array(encodedData, inputOffset, 10);
            const fileIdentifierString = String.fromCharCode.apply(null, fileIdView);
            let lerc, majorVersion;
            if (fileIdentifierString.trim() === 'CntZImage') {
                lerc = LercDecode;
                majorVersion = 1;
            } else if (fileIdentifierString.substring(0, 5) === 'Lerc2') {
                lerc = Lerc2Decode;
                majorVersion = 2;
            } else {
                throw 'Unexpected file identifier string: ' + fileIdentifierString;
            }

            let iPlane = 0; const eof = encodedData.byteLength - 10; let encodedMaskData; const bandMasks = []; let bandMask; let maskData;
            const decodedPixelBlock : any = {
                width: 0,
                height: 0,
                pixels: [],
                pixelType: options.pixelType,
                mask: null,
                statistics: []
            };

            while (inputOffset < eof) {
                const result : any = lerc.decode(encodedData, {
                    inputOffset: inputOffset, // for both lerc1 and lerc2
                    encodedMaskData: encodedMaskData, // lerc1 only
                    maskData: maskData, // lerc2 only
                    returnMask: iPlane === 0, // lerc1 only
                    returnEncodedMask: iPlane === 0, // lerc1 only
                    returnFileInfo: true, // for both lerc1 and lerc2
                    pixelType: options.pixelType || null, // lerc1 only
                    noDataValue: options.noDataValue || null// lerc1 only
                });

                inputOffset = result.fileInfo.eofOffset;
                if (iPlane === 0) {
                    encodedMaskData = result.encodedMaskData;// lerc1
                    maskData = result.maskData;// lerc2
                    decodedPixelBlock.width = result.width;
                    decodedPixelBlock.height = result.height;
                    decodedPixelBlock.dimCount = result.dimCount || 1;
                    // decodedPixelBlock.dimStats = decodedPixelBlock.dimStats;
                    decodedPixelBlock.pixelType = result.pixelType || result.fileInfo.pixelType;
                    decodedPixelBlock.mask = result.maskData;
                }
                if (majorVersion > 1 && result.fileInfo.mask && result.fileInfo.mask.numBytes > 0) {
                    bandMasks.push(result.maskData);
                }

                iPlane++;
                decodedPixelBlock.pixels.push(result.pixelData);
                decodedPixelBlock.statistics.push({
                    minValue: result.minValue,
                    maxValue: result.maxValue,
                    noDataValue: result.noDataValue,
                    dimStats: result.dimStats
                });
            }
            let i, j, numPixels;
            if (majorVersion > 1 && bandMasks.length > 1) {
                numPixels = decodedPixelBlock.width * decodedPixelBlock.height;
                decodedPixelBlock.bandMasks = bandMasks;
                maskData = new Uint8Array(numPixels);
                maskData.set(bandMasks[0]);
                for (i = 1; i < bandMasks.length; i++) {
                    bandMask = bandMasks[i];
                    for (j = 0; j < numPixels; j++) {
                        maskData[j] = maskData[j] & bandMask[j];
                    }
                }
                decodedPixelBlock.maskData = maskData;
            }

            return decodedPixelBlock;
        }
    };

    tmp.Lerc = Lerc;
})();

export default tmp.Lerc;
