'use strict';

const fs = require('fs');
const path = require('path');

const Map = require(path.join(__dirname, 'map.js'));
const Record = require(path.join(__dirname, 'record.js'));

function load_uncharted(buffer, def) {
    return buffer.slice(def.offset, def.offset + def.record_length);
}

function load_record(buffer, def) {
    return new Record(
        buffer.slice(def.offset, def.offset + def.record_length), def
    );
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
    return Buffer.concat(sec.map((e) => e.serialize()));
}

class Codeplug {

    constructor (buffer) {

        if (!Buffer.isBuffer(buffer)) {
            buffer = fs.readFileSync(path.join(__dirname, 'default1.rdt'));
        }

        this._properties = {
            uncharted_1 : load_uncharted(buffer, Map.uncharted_1),
            settings : load_record(buffer, Map.settings),
            uncharted_2 : load_uncharted(buffer, Map.uncharted_2),
            menu_items : load_record(buffer, Map.menu_items),
            uncharted_3 : load_uncharted(buffer, Map.uncharted_3),
            button_definitions : load_record(buffer, Map.button_definitions),
            uncharted_4 : load_uncharted(buffer, Map.uncharted_4),
			one_touch_access : load_records(buffer, Map.one_touch_access),
			uncharted_5 : load_uncharted(buffer, Map.uncharted_5),
            text_messages : load_records(buffer, Map.text_messages),
            uncharted_6 : load_uncharted(buffer, Map.uncharted_6),
            contacts : load_records(buffer, Map.contacts),
            receive_groups : load_records(buffer, Map.receive_groups),
            zones : load_records(buffer, Map.zones),
            scan_lists : load_records(buffer, Map.scan_lists),
            uncharted_7 : load_uncharted(buffer, Map.uncharted_7),
            channels : load_records(buffer, Map.channels),
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

	resequence() {

		// for text_messages
		//   if deleted
		//     x = text_messages.splice(n,1)
		//     remove references to this text message in button_definitions
		//     for n to text_messages.length - 1 || first deleted text message
		//       if not deleted
		//         update references to this text message in button_definitions
		//     text_messages.push(x)
		this._properties.text_messages.forEach(
			(e, i) => {
				if (!e.deleted) return;
				const x = this._properties.text_messages.splice(i, 1);
				this._properties.button_definitions.forEach(
					(ee, ii) => {

					}
				);
			}
		);

		// for contacts
		//   if deleted
		//     x = contacts.splice(n,1)
		//     remove references to this contact in
		//       button_definitions
		//       receive_groups
		//       channels
		//     for n to contacts.length - 1 || first deleted record
		//       if not deleted
		//         update references to this contact in
		//           button_definitions
		//           receive_groups
		//           channels
		//     contacts.push(x)

		// for receive_groups
		//   if deleted
		//     x = receive_groups.splice(n,1)
		//       remove references to this receive group in channels
		//       for n to receive_groups.length - 1 || first deleted record
		//         if not deleted
		//           update references to this record in contacts
		//     receive_groups.push(x)

		// for zones
		//   if deleted
		//     x = zones.splice(n,1)
		//     zones.push(x)

		// for scan_lists
		//   if deleted
		//     x = scan_lists.splice(n,1)
		//     remove references to this scan list in channels
		//     for n to scan_lists.length - 1 || first deleted record
		//       if not deleted
		//         update references to this record in channels
		//     scan_lists.push(x)

		// for channels
		//   if deleted
		//     x = channels.splice(n,1)
		//     remove references to this channel in
		//       scan_lists
		//       zones
		//     for n to channels.length - 1 || first deleted record
		//       if not deleted
		//         update references to this record in
		//           scan_lists
		//           zones
		//     channels.push(x)

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

}

module.exports = Codeplug;
