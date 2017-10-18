'use strict';

const fs = require('fs');
const path = require('path');

const Map = require(path.join(__dirname, 'map.js'));
const Record = require(path.join(__dirname, 'record.js'));

function load_uncharted(buffer, def) {
    return buffer.slice(def.offset, def.offset + def.record_length);
}

function load_record(buffer, def, codeplug) {
    return new Record(
        buffer.slice(def.offset, def.offset + def.record_length),
        def, codeplug, 0
    );
}

function load_records(buffer, def, codeplug) {
    const arr = [];
    for (let n = 0; n < def.records; n++) {
        const offset = def.offset + (def.record_length * n);
        arr.push(
            new Record(
                buffer.slice(offset, offset + def.record_length),
                def, codeplug, n
            )
        );
    }
    return arr;
}

function serialize_section(sec) {
    try{
    return Buffer.concat(sec.map((e) => e.serialize()));
}catch(err){console.log(sec, err);}
}

function jsonify_record(record) {
	const ret = {};
	Object.keys(record).forEach(
		(e) => {
			if (e.search(/^_/) > -1) return;
			ret[e] = record[e];
		}
	);
	return ret;
}

function jsonify_section(section, full) {
	return section.filter((e)=>(full||!(e.deleted))).map(jsonify_record);
}

class Codeplug {

    constructor (buffer) {

        if (!Buffer.isBuffer(buffer)) {
            buffer = fs.readFileSync(path.join(__dirname, 'default1.rdt'));
        }

        this._properties = {
            uncharted_1 : load_uncharted(buffer, Map.uncharted_1),
            settings : load_record(buffer, Map.settings, this),
            uncharted_2 : load_uncharted(buffer, Map.uncharted_2),
            menu_items : load_record(buffer, Map.menu_items, this),
            uncharted_3 : load_uncharted(buffer, Map.uncharted_3),
            button_definitions : load_record(buffer, Map.button_definitions, this),
            uncharted_4 : load_uncharted(buffer, Map.uncharted_4),
			one_touch_access : load_records(buffer, Map.one_touch_access, this),
			quick_contact : load_records(buffer, Map.quick_contact, this),
			uncharted_5 : load_uncharted(buffer, Map.uncharted_5),
            text_messages : load_records(buffer, Map.text_messages, this),
            uncharted_6 : load_uncharted(buffer, Map.uncharted_6),
            contacts : load_records(buffer, Map.contacts, this),
            receive_groups : load_records(buffer, Map.receive_groups, this),
            zones : load_records(buffer, Map.zones, this),
            scan_lists : load_records(buffer, Map.scan_lists, this),
            uncharted_7 : load_uncharted(buffer, Map.uncharted_7),
            channels : load_records(buffer, Map.channels, this),
            uncharted_8 : load_uncharted(buffer, Map.uncharted_8)
        };

        Object.keys(this._properties).forEach(
            (e) => {
                Object.defineProperty(
                    this, e, { get : () => this._properties[e] }
                );
            }
        );

    }

	serialize() {
        return Buffer.concat(
            [   this._properties.uncharted_1,
                this._properties.settings.serialize(),
                this._properties.uncharted_2,
                this._properties.menu_items.serialize(),
                this._properties.uncharted_3,
                this._properties.button_definitions.serialize(),
                this._properties.uncharted_4,
				serialize_section(this._properties.one_touch_access),
				serialize_section(this._properties.quick_contact),
				this._properties.uncharted_5,
                serialize_section(this._properties.text_messages),
                this._properties.uncharted_6,
                serialize_section(this._properties.contacts),
                serialize_section(this._properties.receive_groups),
                serialize_section(this._properties.zones),
                serialize_section(this._properties.scan_lists),
                this._properties.uncharted_7,
                serialize_section(this._properties.channels),
                this._properties.uncharted_8
            ]
        );
    }

	// Boolean 'full' - also include deleted records (~1.3MB of JSON)
	JSONify(full) {
		const ret = {};
		Object.keys(this._properties).forEach(
			(e) => {
				if (e.search(/^uncharted_/) > -1) return;
				if (Array.isArray(this._properties[e])) {
					ret[e] = jsonify_section(this._properties[e], full);
				} else {
					ret[e] = jsonify_record(this._properties[e]);
				}
			}
		);
		return JSON.stringify(ret);
	}

}

module.exports = Codeplug;
