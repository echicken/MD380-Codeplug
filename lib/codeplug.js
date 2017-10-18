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

	// This is so horrendously inefficient that I'm actually kind of proud
	// To-do: replace this with something not fucking shitty
	resequence() {

		this._properties.contacts.forEach(
			(e, i) => {
				if (!e.deleted) return;
				const x = this._properties.contacts.splice(i, 1)[0];
				this._properties.one_touch_access.forEach(
					(ee) => {
						if (ee.mode == 1 && ee.contact == (i + 1)) {
							ee.mode = 0;
						} else if (ee.contact > (i + 1)) {
							// all following contact indexes have shifted down
							ee.contact = ee.contact - 1;
						}
					}
				);
				this._properties.quick_contact.forEach(
					(ee) => {
						if (ee == (i + 1)) {
							ee = 0;
						} else if (ee > (i + 1)) {
							ee = ee - 1;
						}
					}
				);
				this._properties.receive_groups.forEach(
					(ee) => {
						Object.keys(ee).forEach(
							(eee) => {
								if (eee.search(/^contact_/) !== 0) return;
								if (ee[eee] == (i + 1)) ee[eee] = 0;
							}
						);
					}
				);
				this._properties.channels.forEach(
					(ee) => {
						if (ee.contact_name == (i + 1)) {
							ee.contact_name = 0;
						} else if (ee.contact_name > (i + 1) && ee.contact_name !== 65535) {
							// all following contact indexes have been shifted down
							ee.contact_name = ee.contact_name - 1;
						}
					}
				);
				this._properties.contacts.push(x);
			}
		);

		this._properties.receive_groups.forEach(
			(e, i) => {
				// resequence contact members, some may have been deleted
				for (let n = 1; n < 32; n++) {
					if (e['contact_' + n] == 0) {
						// find the non-deleted contact, move it here, delete value at its previous index
						for (let nn = n; nn < 33; nn++) {
							if (e['contact_' + nn] != 0) {
								e['contact_' + n] = e['contact_' + nn];
								e['contact_' + nn] = 0;
							}
						}
					}
				}
				if (!e.deleted) return;
				const x = this._properties.receive_groups.splice(i, 1)[0];
				this._properties.channels.forEach(
					(ee) => {
						if (ee.group_list == (i + 1)) {
							ee.group_list = 0;
						} else if (ee.group_list > (i + 1) && ee.group_list !== 255) {
							// all following group_list indexes have been shifted down
							ee.group_list = ee.group_list - 1;
						}
					}
				);
				this._properties.receive_groups.push(x);
			}
		);

		this._properties.channels.forEach(
			(e, i) => {
				if (!e.deleted) return;
				this._properties.scan_lists.forEach(
					(ee) => {
						Object.keys(ee).forEach(
							(eee) => {
								if (eee.search(/^channel_/) !== 0) return;
								if (ee[eee] == (i + 1)) ee[eee] = 0;
							}
						);
					}
				);
				this._properties.zones.forEach(
					(ee) => {
						Object.keys(ee).forEach(
							(eee) => {
								if (eee.search(/^channel_/) !== 0) return;
								if (ee[eee] == (i + 1)) ee[eee] = 0;
							}
						);
					}
				);
				const x = this._properties.channels.splice(i, 1)[0];
				this._properties.channels.push(x);
			}
		);

		this._properties.zones.forEach(
			(e, i) => {
				// resequence channel members; some may have been deleted
				for (let n = 1; n < 16; n++) {
					if (e['channel_' + n] == 0) {
						for (let nn = n; nn < 17; nn++) {
							if (e['channel_' + nn] != 0) {
								e['channel_' + n] = e['channel_' + nn];
								e['channel_' + nn] = 0;
							}
						}
					}
				}
				if (!e.deleted) return;
				const x = this._properties.zones.splice(i, 1)[0];
				this._properties.zones.push(x);
			}
		);

		this._properties.scan_lists.forEach(
			(e, i) => {
				// resequence channel members, some may have been deleted
				for (let n = 1; n < 31; n++) {
					if (e['channel_' + n] == 0) {
						for (let nn = n; nn < 32; nn++) {
							if (e['channel_' + nn] != 0) {
								e['channel_' + n] = e['channel_' + nn];
								e['channel_' + nn] = 0;
							}
						}
					}
				}
				if (!e.deleted) return;
				const x = this._properties.scan_lists.splice(i, 1)[0];
				this._properties.channels.forEach(
					(ee) => {
						if (ee.scan_list == (i + 1)) {
							ee.scan_list = 0;
						} else if (ee.scan_list > (i + 1) && ee.scan_list !== 255) {
							// all following scan_list indexes have been shifted down
							ee.scan_list = ee.scan_list - 1;
						}
					}
				);
				this._properties.scan_lists.push(x);
			}
		);

	}

    serialize() {
		this.resequence();
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
