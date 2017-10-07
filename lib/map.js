const path = require('path');
const Validate = require(path.join(__dirname, 'validate.js'));

const Map = {
    uncharted_1 : { // 'Basic Information' section
        offset : 0,
        records : 1,
        record_length : 8805
        // Byte 310, unknown
        // Byte 313: uint32le BCD frequency range, 48004000 = 400 to 480 MHz, 40003500 = 350 to 400 MHz, etc.
        // Byte 8742: uint32be BCD last programmed date (day, month, and year)
        // Byte 8746: uint32be BCD last programmed date (hours, minutes, seconds)
    },
    settings : {
        offset : 8805,
        records : 1,
        record_length : 144,
        data : {
            info_screen_line_1 : {
                type : 'unicode',
                offset : 0,
                length : 20 // 10 chars
            },
            info_screen_line_2 : {
                type : 'unicode',
                offset : 20,
                length : 20 // 10 chars
            },
            monitor_type : { // 0 silent, 1 open
                type : 'bit',
                offset : 64,
                bit_offset : 4
            },
            enable_all_leds : { // 0 false, 1 true
                type : 'bit',
                offset : 64,
                bit_offset : 2
            },
            talk_permit_tone : { // 0 none, 1 digital, 2 analog, 3 both
                type : 'bitfield',
                offset : 65,
                bit_offset : 6,
                bit_count : 2,
                validate : (v) => v >= 0 && v <= 3
            },
            password_and_lock : { // 1 off, 0 on
                type : 'bit',
                offset : 65,
                bit_offset : 4
            },
            disable_channel_free_indication_tone : { // 0 off, 1 on
                type : 'bit',
                offset : 65,
                bit_offset : 3
            },
            enable_all_tones : { // 0 off, 1 on
                type : 'bit',
                offset : 65,
                bit_offset : 2
            },
            save_mode_receive : { // 0 off, 1 on
                type : 'bit',
                offset : 65,
                bit_offset : 1
            },
            save_preamble : { // 0 off, 1 on
                type : 'bit',
                offset : 65,
                bit_offset : 0
            },
            intro_screen : { // 0 string, 1 picture
                type : 'bit',
                offset : 66,
                bit_offset : 4
            },
            radio_id : {
                type : 'uint24le',
                offset : 68
            },
            transmit_preamble : { // ms = n * 60; n >= 0; n <= 144
                type : 'uint8',
                offset : 72,
                validate : (v) => v >= 0 && v<= 144
            },
            group_call_hang_time : { // ms = n * 100; <= 70; must be multiple of 5
                type : 'uint8',
                offset : 73,
                validate : (v) => v >= 5 && v <= 70 && v % 5 === 0
            },
            private_call_hang_time : { // ms = n * 100; <= 70; must be multiple of 5
                type : 'uint8',
                offset : 74,
                validate : (v) => v >= 5 && v <= 70 && v % 5 === 0
            },
            vox_sensitivity : {
                type : 'uint8',
                offset : 75
            },
            receive_low_battery_interval : { // seconds = n * 5, <= 127
                type : 'uint8',
                offset : 78,
                validate : (v) => v >= 5 && v <= 127
            },
            call_alert_tone : { // 0 = continue, else seconds = n * 5; n <= 240
                type : 'uint8',
                offset : 79,
                validate : (v) => v === 0 || (v >= 5 && v <= 240)
            },
            lone_worker_response_time : {
                type : 'uint8',
                offset : 80
            },
            lone_worker_reminder_time : {
                type : 'uint8',
                offset : 81
            },
            scan_digital_hang_time : { // ms = n * 5, default n = 10
                type : 'uint8',
                offset : 83,
                validate : (v) => v >= 5 && v <= 100
            },
            scan_analog_hang_time : { // ms = n * 5, default n = 10
                type : 'uint8',
                offset : 84,
                validate : (v) => v >= 5 && v <= 100
            },
            keypad_lock_time : { // 1 = 5s, 2 = 10s, 3 = 15s, 255 = manual
                type : 'uint8',
                offset : 86,
                validate : (v) => (v >= 1 && v <= 3) || v === 255
            },
            mode_mr_ch : { // 0 = mr, 255 = ch
                type : 'uint8',
                offset : 87,
                validate : (v) => v === 0 || v === 255
            },
            power_on_password : {
                type : 'bcdbe',
                offset : 88
            },
            radio_programming_password : {
                type : 'bcdbe',
                offset : 92
            },
            pc_programming_password : { // If not set, all bytes 255
                type : 'ascii',
                offset : 96,
                length : 8
            },
            radio_name : {
                type : 'unicode',
                offset : 112,
                length : 32
            }
        }
    },
    uncharted_2 : { // 'Menu Item' section
        offset : 8949, // 8805 + 144
        records : 1,
        record_length : 176 // 9125 - (8805 + 144)
        // Byte 8981: uint8 Menu Hang Time, 0 = Hang, 1 to 30 = seconds (possibly 5 or 6 bit field)
        // Byte 8982: bitfield Menu Item toggles (Text Message, Call Alert, Manual Dial, Remote Monitor, Radio Enable, Edit, Radio Check, Radio Disable)
        // Byte 8983: bitfield Menu Item toggles (Program Key, Missed, Outgoing Radio, Answered, Scan, Edit List, Talkaround, Tone or Alert)
        // Byte 8984: bitfield Menu Item toggles (Vox, Power, Backlight, Intro Screen, Keyboard Lock, LED Indicator, Squelch)
        // Byte 8985: bitfield Menu Item toggles (Program Radio, Password and Lock, Display Mode)
    },
    text_messages : { // 'Text Message' section in CPS MD380
        offset : 9125,
        records : 50,
        record_length : 288,
		deletion_markers : [ { offset : 0, value : 0 } ],
        data : {
            text : {
                type : 'unicode',
                offset : 0,
                length : 288
            }
        }
    },
    uncharted_3 : {
        offset : 23525, // 9125 + (288 * 50)
        records : 1,
        record_length : 1472  // 24997 - (9125 + (288 * 50))
    },
    contacts : { // 'Digital Contacts' section in CPS MD380
        offset : 24997,
        records : 1000,
        record_length : 36,
		deletion_markers : [
			{ offset : 0, value : 255 },
			{ offset : 1, value : 255 },
			{ offset : 2, value : 255 }
		],
        data : {
            call_id : {
                type : 'uint24le',
                offset : 0
            },
            call_receive_tone : { // 0 off, 1 on
                type : 'bit',
                offset : 3,
                bit_offset : 5
            },
            call_type : { // 1 group, 2 private, 3 all
                type : 'bitfield',
                offset : 3,
                bit_offset : 0,
                bit_count : 2,
                validate : (v) => v > 0 && v < 4
            },
            name : {
                type : 'unicode',
                offset : 4,
                length : 32
            }
        }
    },
    receive_groups : { // 'Digital RX Group Lists' section in CPS MD380
        offset : 60997,
        records : 250,
        record_length : 96,
		deletion_markers : [ { offset : 0, value : 0 } ],
        data : {
            name : {
                type : 'unicode',
                offset : 0,
                length : 32
            }
        }
    },
    zones : { // 'Zone Information' section in CPS MD380
        offset : 84997,
        records : 250,
        record_length : 64,
        deletion_markers : [ { offset : 0, value : 0 } ],
        data : {
            name : {
                type : 'unicode',
                offset : 0,
                length : 32
            }
        }
    },
    scan_lists : { // 'Scan List' section in CPS MD380
        offset : 100997,
        records : 250,
        record_length : 104,
		deletion_markers : [ { offset : 0, value : 0 } ],
        data : {
            name : {
                type : 'unicode',
                offset : 0,
                length : 32
            },
            priority_channel_1 : { // 0 selected, 65535 none, else index into Channels
                type : 'uint16le',
                offset : 32,
                validate : Validate.channel_min_or_max
            },
            priority_channel_2 : { // 0 selected, 65535 none, else index into Channels
                type : 'uint16le',
                offset : 34,
                validate : Validate.channel_min_or_max
            },
            designated_transmit_channel : { // 0 selected, 65535 last (based on observation; this differs from IZ2UUF's document)
                type : 'uint16le',
                offset : 36,
                validate : Validate.channel_min_or_max
            },
            signaling_hold_time : { // n * 25 = time in ms, n >= 2
                type : 'uint8',
                offset : 39,
                validate : (v) => v >= 2 && v <= 255
            },
            priority_sample_time : { // n * 250 = time in ms, n >= 3
                type : 'uint8',
                offset : 40,
                validate : (v) => v >= 3 && v <= 255
            }
        }
    },
    uncharted_4 : {
        offset : 126997, // 10097 + (250 * 104)
        records : 1,
        record_length : 16
    },
    // Byte offset 127032, 127036 - Changes when toggling radio frequency range in Basic Information section.  Automaticaly updating channel tx/rx frequencies perhaps.
    channels : { // 'Channels Information' section in CPS MD380
        offset : 127013,
        records : 1000,
        record_length : 64,
		deletion_markers : [ { offset : 16, value : 255 } ],
        data : {
            lone_worker : { // 0 off, 1 on
                type : 'bit',
                offset : 0,
                bit_offset : 7
            },
            squelch : { // 0 tight, 1 normal
                type : 'bit',
                offset : 0,
                bit_offset : 5
            },
            auto_scan : { // 0 off, 1 on
                type : 'bit',
                offset : 0,
                bit_offset : 4
            },
            bandwidth : { // 0 12.5, 1 25
                type : 'bit',
                offset : 0,
                bit_offset : 3
            },
            channel_mode : { // 2 digital, 1 analog
                type : 'bitfield',
                offset : 0,
                bit_offset : 0,
                bit_count : 2,
                validate : (v) => v > 0 && v < 3
            },
            color_code : { // 0 to 15
                type : 'bitfield',
                offset : 1,
                bit_offset : 4,
                bit_count : 4,
                validate : (v) => v >= 0 && v <= 15
            },
            repeater_slot : { // 1 or 2
                type : 'bitfield',
                offset : 1,
                bit_offset : 2,
                bit_count : 2,
                validate : (v) => v > 0 && v < 3
            },
            receive_only : { // 0 off, 1 on
                type : 'bit',
                offset : 1,
                bit_offset : 1
            },
            allow_talkaround : { // 0 off, 1 on
                type : 'bit',
                offset : 1,
                bit_offset : 0
            },
            data_call_confirm : { // 0 off, 1 on
                type : 'bit',
                offset : 2,
                bit_offset : 7
            },
            private_call_confirm : { // 0 off, 1 on
                type : 'bit',
                offset : 2,
                bit_offset : 6
            },
            privacy : { // 0 none, 1 basic, 2 enhanced
                type : 'bitfield',
                offset : 2,
                bit_offset : 4,
                bit_count : 2,
                validate : (v) => v >= 0 && v < 3
            },
            privacy_number : { // 0 to 7 if privacy == 2, 0 to 15 if privacy == 1
                type : 'bitfield',
                offset : 2,
                bit_offset : 0,
                bit_count : 4,
                validate : (v) => v >= 0 && v <= 15
            },
            display_ptt_id : { // 0 on, 1 off, so says iZ2UUF, seems the opposite to me
                type : 'bit',
                offset : 3,
                bit_offset : 7
            },
            uncompressed_udp_header : { // 0 off, 1 on
                type : 'bit',
                offset : 3,
                bit_offset : 6
            },
            emergency_alarm_acknowledge : { // 0 off, 1 on
                type : 'bit',
                offset : 3,
                bit_offset : 3
            },
            receive_ref_frequency : { // 0 low, 1 medium, 2 high
                type : 'bitfield',
                offset : 3,
                bit_offset : 0,
                bit_count : 2,
                validate : (v) => v >= 0 && v < 3
            },
            admit_criteria : { // 0 always, 1 channel free, 2 ctcss, 3 color code
                type : 'bitfield',
                offset : 4,
                bit_offset : 6,
                bit_count : 2,
                validate : (v) => v >= 0 && v <= 3
            },
            power : { // 0 low, 1 high
                type : 'bit',
                offset : 4,
                bit_offset : 5
            },
            vox : { // 0 off, 1 on
                type : 'bit',
                offset : 4,
                bit_offset : 4
            },
            qt_reverse : { // 0 180, 1 120
                type : 'bit',
                offset : 4,
                bit_offset : 3
            },
            reverse_burst : { // 0 off, 1 on
                type : 'bit',
                offset : 4,
                bit_offset : 2
            },
            transmit_ref_frequency : { // 0 low, 1 medium, 2 high
                type : 'bitfield',
                offset : 4,
                bit_offset : 0,
                bit_count : 2,
                validate : (v) => v >= 0 && v < 3
            },
            contact_name : { // key into contacts
                type : 'uint16le',
                offset : 6,
                validate : Validate.contact
            },
            timeout_timer : { // 0 infinite, > 0 is seconds / 15
                type : 'bitfield',
                offset : 8,
                bit_offset : 0,
                bit_count : 6,
                validate : (v) => v >= 0 && v <= 63
            },
            timeout_rekey_delay : { // seconds
                type : 'uint8',
                offset : 9
            },
            emergency_system : { // Key into Digit Emergency System
                type : 'bitfield',
                offset : 10,
                bit_offset : 0,
                bit_count : 6,
                validate : (v) => v >= 0 && v <= 32 // CPS MD380 allows up to 32 entries in 'Digit Emergency System'
            },
            scan_list : { // 0 none, > 0 keys into scan_list
                type : 'uint8',
                offset : 11,
                validate : (v) => v >= 0 && v <= 250
            },
            group_list : { // 0 none, > 0 keys into receive_groups
                type : 'uint8',
                offset : 12,
                validate : (v) => v >= 0 && v <= 250
            },
            decode_1 : { // 0 off, 1 on; if 'rx signalling system' not 'off', these are the 'decode' checkboxes in CPS MD380 and relate to the DTMF Signaling section Decode tab and sub-tabs
                type : 'bit',
                offset : 14,
                bit_offset : 0
            },
            decode_2 : {
                type : 'bit',
                offset : 14,
                bit_offset : 1
            },
            decode_3 : {
                type : 'bit',
                offset : 14,
                bit_offset : 2
            },
            decode_4 : {
                type : 'bit',
                offset : 14,
                bit_offset : 3
            },
            decode_5 : {
                type : 'bit',
                offset : 14,
                bit_offset : 4
            },
            decode_6 : {
                type : 'bit',
                offset : 14,
                bit_offset : 5
            },
            decode_7 : {
                type : 'bit',
                offset : 14,
                bit_offset : 6
            },
            decode_8 : {
                type : 'bit',
                offset : 14,
                bit_offset : 7
            },
            receive_frequency : { // Hz / 10
                type : 'bcdle',
                offset : 16
            },
            transmit_frequency : { // Hz / 10
                type : 'bcdle',
                offset : 20
            },
            ctcss_dcs_decode : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'bcdt',
                offset : 24
            },
            ctcss_dcs_encode : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'bcdt',
                offset : 26
            },
            receive_signalling_system : { // Key into DTMF Signalling, system 1-4, wherever that may be stored
                type : 'bitfield',
                offset : 28,
                bit_offset : 0,
                bit_count : 3,
                validate : (v) => v >= 0 && v <= 4
            },
            transmit_signalling_system : { // Key into DTMF Signalling, system 1-4, wherever that may be stored
                type : 'bitfield',
                offset : 29,
                bit_offset : 0,
                bit_count : 3,
                validate : (v) => v >= 0 && v <= 4
            },
            name : {
                type : 'unicode',
                offset : 32,
                length : 32
            }
        }
    },
    uncharted_5 : {
        offset : 191013,
        records : 1,
        record_length : 71696
    }
};

function add_subfields(section, prefix, offset, records, type, len, validator) {
    for (let n = 1; n <= records; n++) {
        section.data[prefix + n] = {
            type : type,
            offset : offset + ((n - 1) * len),
            length : len,
            validate : validator
        };
    }
}

// Map.zones.data[channel_1 ... channel_16]
add_subfields(Map.zones, 'channel_', 32, 16, 'uint16le', 2, Validate.channel);
// Map.receive_groups.data[contact_1 ... contact_32]
add_subfields(Map.receive_groups, 'contact_', 32, 32, 'uint16le', 2, Validate.contact);
// Map.scan_lists.data[channel_1 ... channel_31]
add_subfields(Map.scan_lists, 'channel_', 42, 31, 'uint16le', 2, Validate.channel);

let size = 0;
Object.keys(Map).forEach(
    (e) => {
        size = size + (Map[e].records * Map[e].record_length);
        // 'Uncharted' areas of the Map don't have a 'data' property
        if (typeof Map[e].data === 'undefined') return;
        Object.keys(Map[e].data).forEach(
            (ee) => {
                // Some data subfields already have a 'validate' method
                if (typeof Map[e].data[ee].validate === 'function') return;
                // Those that don't get the default method for their type
                switch (Map[e].data[ee].type) {
                    // Sometimes the default validator needs another param
                    case 'ascii':
                        Map[e].data[ee].validate = (v) => Validate.ascii(v, Map[e].data[ee].length)
                        break;
                    // But mostly the default validator will work as-is
                    case 'bcdle':
                        Map[e].data[ee].validate = Validate.bcdle;
                        break;
                    case 'bcdbe':
                        Map[e].data[ee].validate = Validate.bcdbe;
                        break;
                    case 'bcdt':
                        Map[e].data[ee].validate = Validate.bcdt;
                        break;
                    case 'bit':
                        Map[e].data[ee].validate = Validate.bit;
                        break;
                    case 'bitfield':
                        Map[e].data[ee].validate = (v) => Validate.bitfield(v, Map[e].data[ee].bit_count)
                        break;
                    case 'uint8':
                        Map[e].data[ee].validate = Validate.uint8;
                        break;
                    case 'uint16le':
                        Map[e].data[ee].validate = Validate.uint16;
                        break;
                    case 'uint24le':
                        Map[e].data[ee].validate = Validate.uint24;
                        break;
                    case 'unicode':
                        Map[e].data[ee].validate = (v) => Validate.unicode(v, Map[e].data[ee].length)
                        break;
                    default:
                        break;
                }
            }
        );
    }
);
console.log(size);
module.exports = Map;
