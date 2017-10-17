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
						get : () => this._properties[e],
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
					if (typeof def.deletion_markers === 'undefined') {
						return false;
					} else {
						return def.deletion_markers.every(
							(e) => buffer.readUInt8(e.offset) === e.value
						);
					}
				},
				set : (v) => {
					// Silently ignore attempts to delete 'settings'
					// and other single-record sections
					if (typeof def.deletion_markers !== 'undefined') {
						def.deletion_markers.forEach(
							(e) => buffer.writeUInt8(e.value, e.offset)
						);
					}
				}
			}
		);
	}

	serialize() {
		const write = new Write();
		const buffer = Buffer.alloc(this._def.record_length);
		Object.keys(this._properties).forEach(
			(e) => {
				write.value(this._properties[e], buffer, this._def.data[e], this);
			}
		);
		return buffer;
	}

}

module.exports = Record;
