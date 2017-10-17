'use strict';

// lame, inefficient, and probably quite sketchy :D
function encode_bcd(s) {
    return ((''+s).split('').reduce((acc,e,i,a)=>acc|=(parseInt(e)<<((a.length-1-i)*4)),0)>>>0);
}

class Write {

    constructor () {}

    ascii(value, buffer, def) {
        while (value.length < def.length) {
            value += String.fromCharCode(0);
        }
        buffer.write(value, def.offset, 'ascii');
    }

    // This is shit-tastic and should be redone.
    bcdt(value, buffer, offset) {
        const tone = ((value.tone * 10) + '').split('').map((e)=>parseInt(e));
        while (tone.length < 4) {
            tone.unshift(0);
        }
        const n = (tone[0]<<12)|(tone[1]<<8)|(tone[2]<<4)|(tone[3])|(value.mode<<6);
        buffer.writeUInt16LE(n, offset);
    }

    bcdbe(value, buffer, offset) {
        buffer.writeUInt32BE(encode_bcd(value), offset);
    }

    bcdle(value, buffer, offset) {
        buffer.writeUInt32LE(encode_bcd(value), offset);
    }

    bit(value, buffer, offset, bit_offset) {
        let n = buffer.readUInt8(offset);
        n|=(value<<bit_offset);
        buffer.writeUInt8(n, offset);
    }

    uint24le(value, buffer, offset) {
        buffer.writeUInt8(value&255, offset);
        buffer.writeUInt8((value&(255<<8))>>8, offset + 1);
        buffer.writeUInt8((value&(255<<16))>>16, offset + 2);
    }

    unicode(value, buffer, def) {
        while (value.length < def.length / 2) {
            value += String.fromCharCode(0);
        }
        buffer.write(value, def.offset, 'utf16le');
    }

    value(value, buffer, def) {
		let v = typeof def.transform == 'function' ? def.transform(value) : value;
        switch (def.type) {
            case 'uint8':
                buffer.writeUInt8(v, def.offset);
                break;
            case 'uint16le':
                buffer.writeUInt16LE(v, def.offset);
                break;
            case 'uint24le':
                this.uint24le(v, buffer, def.offset);
                break;
            case 'bcdt':
                this.bcdt(v, buffer, def.offset);
                break;
            case 'bcdle':
                this.bcdle(v, buffer, def.offset);
                break;
            case 'bcdbe':
                this.bcdbe(v, buffer, def.offset);
                break;
            case 'ascii':
                this.ascii(v, buffer, def);
                break;
            case 'unicode':
                this.unicode(v, buffer, def);
                break;
            case 'bit':
            case 'bitfield':
                this.bit(v, buffer, def.offset, def.bit_offset);
                break;
            default:
                break;
        }
    }

}

module.exports = Write;
