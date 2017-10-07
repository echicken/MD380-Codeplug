'use strict';

const fs = require('fs');
const path = require('path');

const Map = require(path.join(__dirname, 'map.js'));
const Record = require(path.join(__dirname, 'record.js'));

function load_uncharted(buffer, def) {
    return buffer.slice(def.offset, def.offset + def.record_length);
}

function load_records(buffer, def) {
    const arr = [];
    for (let n = 0; n < def.records; n++) {
        const offset = def.offset + (def.record_length * n);
        arr.push(new Record(buffer.slice(offset, offset + def.record_length), def));
    }
    return arr;
}

function serialize_section(sec) {
    let buffer = Buffer.alloc(0);
    sec.forEach(
        (e) => {
            buffer = Buffer.concat([ buffer, e.serialize() ]);
        }
    );
    return buffer;
}

class Codeplug {

    constructor (buffer) {

        if (!Buffer.isBuffer(buffer)) {
            buffer = fs.readFileSync(path.join(__dirname, 'default1.rdt'));
        }

        this._properties = {};

        this._properties.uncharted_1 = load_uncharted(buffer, Map.uncharted_1);
        this._properties.settings = new Record(
            buffer.slice(
                Map.settings.offset,
                Map.settings.offset + Map.settings.record_length
            ),
            Map.settings
        );
        this._properties.uncharted_2 = load_uncharted(buffer, Map.uncharted_2);
        this._properties.menu_items = new Record(
            buffer.slice(
                Map.menu_items.offset,
                Map.menu_items.offset + Map.menu_items.record_length
            ),
            Map.menu_items
        );
        this._properties.uncharted_3 = load_uncharted(buffer, Map.uncharted_3);
        this._properties.text_messages = load_records(buffer, Map.text_messages);
        this._properties.uncharted_4 = load_uncharted(buffer, Map.uncharted_4);
        this._properties.contacts = load_records(buffer, Map.contacts);
        this._properties.receive_groups = load_records(buffer, Map.receive_groups);
        this._properties.zones = load_records(buffer, Map.zones);
        this._properties.scan_lists = load_records(buffer, Map.scan_lists);
        this._properties.uncharted_5 = load_uncharted(buffer, Map.uncharted_5);
        this._properties.channels = load_records(buffer, Map.channels);
        this._properties.uncharted_6 = load_uncharted(buffer, Map.uncharted_6);

        Object.keys(this._properties).forEach(
            (e) => {
                Object.defineProperty(
                    this, e, { get : () => this._properties[e] }
                );
            }
        );

    }

    serialize() {
        let buffer = Buffer.alloc(0);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_1 ]);
        buffer = Buffer.concat([ buffer, this._properties.settings.serialize() ]);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_2 ]);
        buffer = Buffer.concat([ buffer, this._properties.menu_items.serialize() ]);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_3 ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.text_messages) ]);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_4 ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.contacts) ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.receive_groups) ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.zones) ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.scan_lists) ]);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_5 ]);
        buffer = Buffer.concat([ buffer, serialize_section(this._properties.channels) ]);
        buffer = Buffer.concat([ buffer, this._properties.uncharted_6 ]);
        return buffer;
    }

}

module.exports = Codeplug;
