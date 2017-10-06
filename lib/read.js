'use strict';

function parse_bcd(n) {
    return parseInt(
        '' +
        ((n>>28)&15) + ((n>>24)&15) + ((n>>20)&15) + ((n>>16)&15) +
        ((n>>12)&15) + ((n>>8)&15) + ((n>>4)&15) + (n&15)
    );
}

class Read {

    constructor () {}

    // Returns a string, with right-padding removed
    ascii(buffer, start, length) {
        return buffer.toString(
            'ascii', start, start + length).replace(/\0/g, ''
        );
    }

    // Returns a { tone, mode } object
    // 'tone' is a string based on a 14-bit binary-coded decimal value
    // 'mode' is 0 (CTCSS), 2 (DCS-N), 3 (DCS-I)
    // For CTCSS, 'tone' will be converted to a real value in Hz (eg. 67.0)
    bcdt(buffer, offset) {
        const n = buffer.readUInt16LE(offset);
        const ret = {
            tone : parseInt(
                '' + ((n>>12)&3) + ((n>>8)&15) + ((n>>4)&15) + (n&15)
            ),
            mode : (n&(3<<14))>>14 // 0 = CTCSS, 2 = DCS-N, 3 = DCS-I
        };
        if (ret.mode === 0) ret.tone = ret.tone * .1;
        return ret;
    }

    // Returns a string from a big endian binary-coded decimal value
    bcdbe(buffer, offset) {
        return parse_bcd(buffer.readUInt32BE(offset));
    }

    // Returns a string from a little endian binary coded decimal value
    bcdle(buffer, offset) {
        return parse_bcd(buffer.readUInt32LE(offset));
    }

    // Returns 1 or 0 for the given bit in the given byte
    bit(buffer, offset, bit_offset) {
        return ((buffer.readUInt8(offset)&(1<<bit_offset))>>bit_offset);
    }

    // Returns the number held in a bitfield
    bitfield(buffer, offset, bit_offset, bit_count) {
        let mask = 0;
        for (let n = 0; n < bit_count; n++) mask|=(1<<n);
        return ((buffer.readUInt8(offset)&(mask<<bit_offset))>>bit_offset);
    }

    // Returns a number based on the values of the three bytes beginning at 'offset'
    uint24le(buffer, offset) {
        return buffer.readUInt8(offset)|(buffer.readUInt8(offset + 1)<<8)|(buffer.readUInt8(offset + 2)<<16);
    }

    // Returns a string, with right-padding removed
    unicode(buffer, start, length) {
        return buffer.toString('utf16le', start, start + length).replace(/\0/g, '');
    }

    // Where buffer contains just a single record
    record(buffer, def) {
        const ret = {};
        Object.keys(def.data).forEach(
            (e) => {
                const offset = def.data[e].offset;
                switch (def.data[e].type) {
                    case 'uint8':
                        ret[e] = buffer.readUInt8(offset);
                        break;
                    case 'uint16le':
                        ret[e] = buffer.readUInt16LE(offset);
                        break;
                    case 'uint24le':
                        ret[e] = this.uint24le(buffer, offset);
                        break;
                    case 'bcdt':
                        ret[e] = this.bcdt(buffer, offset);
                        break;
                    case 'bcdle':
                        ret[e] = this.bcdle(buffer, offset);
                        break;
                    case 'bcdbe':
                        ret[e] = this.bcdbe(buffer, offset);
                        break;
                    case 'bit':
                        ret[e] = this.bit(
                            buffer, offset, def.data[e].bit_offset
                        );
                        break;
                    case 'bitfield':
                        ret[e] = this.bitfield(
                            buffer,
                            offset,
                            def.data[e].bit_offset,
                            def.data[e].bit_count
                        );
                        break;
                    case 'ascii':
                        ret[e] = this.ascii(buffer, offset, def.data[e].length);
                        break;
                    case 'unicode':
                        ret[e] = this.unicode(
                            buffer, offset, def.data[e].length
                        );
                        break;
                    default:
                        break;
                }
            }
        );
        return ret;
    }

    // Where buffer contains a section read from a codeplug file
    section(buffer, def) {
        const ret = [];
        for (let n = 0; n < def.records; n++) {
            const offset = def.record_length * n;
            ret.push(this.record(buffer.slice(offset, offset + def.record_length), def, n));
        }
        return ret;
    }

}

module.exports = Read;
