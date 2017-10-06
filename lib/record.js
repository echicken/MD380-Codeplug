'use strict';

const path = require('path');
const Map = require(path.join(__dirname, 'map.js'));
const Validate = require(path.join(__dirname, 'validate.js'));
const Read = require(path.join(__dirname, 'read.js'));
const Write = require(path.join(__dirname, 'write.js'));

class Record {

    constructor (buffer, def) {
        const read = new Read();
        this._def = def;
        this._properties = read.record(buffer, def);
        Object.keys(this._properties).forEach(
            (e) => {
                Object.defineProperty(
                    this, e, {
                        get : () => {
                            if (!def.data[e].validate(this._properties[e])) {
                                throw `${e}: invalid value ${this._properties[e]}`;
                            } else {
                                return this._properties[e];
                            }
                        },
                        set : (v) => {
                            if (!def.data[e].validate(v)) {
                                throw `${e}: invalid value ${v}`;
                            } else {
                                this._properties[e] = v;
                            }
                        },
                        enumerable : true
                    }
                );
            }
        );
		Object.defineProperty(
			this, 'deleted', {
				get : () => {
					return false;
				},
				set : (v) => {

				}
			}
		);
    }

    serialize() {
        const write = new Write();
        const buffer = Buffer.alloc(this._def.record_length);
        Object.keys(this._properties).forEach(
            (e) => write.value(this._properties[e], buffer, this._def.data[e])
        );
        return buffer;
    }

}

module.exports = Record;
