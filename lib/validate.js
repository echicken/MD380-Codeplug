'use strict';

class Validate {

    constructor () {}

    ascii(v, l) {
        return (
            typeof v === 'string' &&
            v.length <= l &&
            v.search(/^[\x20-\x7E]*\0*$/) > -1
        );
    }

    bcdle(v) {
        return (
            typeof v === 'string' &&
            v.length == 8 &&
            v.search(/[^0-9]/) < 0
        );
    }

    bcdbe(v) {
        return (
            typeof v === 'string' &&
            v.length == 8 &&
            v.search(/[^0-9]/) < 0
        );
    }

    bcdt(v) {
        // We'll need a lookup table for valid tones and DCS codes
        return true;
    }

    // For 'bit' types, we'll take true, false, 1, or 0
    bit(v) {
        return (typeof v === 'boolean' || v === 0 || v === 1);
    }

    // c is bitfield size
    bitfield(v, c) {
        let mask = 0;
		let n;
        for (n = 0; n < c; n++) mask|=(1<<n);
        return (v >=0 && v <= n);
    }

    contact(v) {
        return ((v >= 0 && v <= 1000) || v === 65535);
    }

    channel(v) {
        return (v >= 0 && v <= 1000);
    }

    channel_min_or_max(v) {
        return (v === 0 || v === 65535 || (v > 0 && v <= 1000));
    }

    uint8(v) {
        return (v >= 0 && v <= 255);
    }

    uint16(v) {
        return (v >= 0 && v <= 65535);
    }

    uint24(v) {
        return (v >= 0 && v <= 16777215);
    }

    unicode(v, l) {
		console.log(v, v.length, v.search(/^\w*\0*$/), l);
        return (
            typeof v === 'string' &&
            v.length <= l //&&
            //v.search(/^\w*\0*$/) > -1
        );
    }

}

module.exports = new Validate();
