const path = require('path');
const Validate = require(path.join(__dirname, 'validate.js'));

// Map[record type]
//   .offset - first record's byte offset from start of .rdt file
//   .records - number of records of this type
//   .record_length - bytes per record
//   .data[field name]
//     .type
//        'ascii'
//        'bcdbe', 'bcdle' - binary coded decimal, uint32be or uint32le
//        'bcdt' - uint16le, 14 LSB are binary coded decimal, 2 MSB are bitfield
//        'bit' - a single bit used as an on/off toggle for a setting
//        'bitfield' - a number encoded in x bits of a byte
//        'uint8', 'uint16le' - what you would expect
//        'uint24le' - a number in three bytes, little endian
//        'unicode' (utf16le)
//     .offset - byte offset from start of record
//     .bit_offset - for 'bit' and 'bitfield' types, offset from LSB toward MSB (1<<bit_offset)
//     .bit_count - for 'bitfield' types, number of bits in bitfield, from bit_offset toward MSB
//     .length - for string types, number of bytes in string (for unicode, two bytes per char)
//     .validate - a function that will test validity of a value when getting (ie. from a file/Buffer) or setting it
//                 see validate.js for default validators per type, which can be overridden here
// 'uncharted_x' records are areas of the codeplug that have not been mapped out
const Map = {
    uncharted_1 : { // 'Basic Information' section
        offset : 0,
        records : 1,
        record_length : 8805
        // Byte 293: Start of Model Name string, length unknown, MD380 is DR780, apparently
        // Byte 310, Model?
        // Byte 313: uint32le BCD frequency range, 48004000 = 400 to 480 MHz, 40003500 = 350 to 400 MHz, etc.
        //   - Note that when changing frequency range, rx/tx frequencies in Channels section must be updated
        // Byte 357 44013020 uint32be BCD - MCU version (or coincidence), CPS says D013.020
        // Byte 358 13020014 uint32be BCD - MCU version (or coincidence), CPS says D013.020
        // Byte 365 - 376: device ID?
        // md380tools .bin starts at byte 549; if we want to handle these, we'll need to subtract that from the offsets
        // Byte 556 Control?
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
                bit_offset : 5
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
                offset : 92,
				validate : (v) => {
					return (Validate.bcdbe(v) || v == '1515151515151515');
				}
            },
            pc_programming_password : { // If not set, all bytes 255 (looks like 127 to me), must be lowercase
                type : 'ascii',
                offset : 96,
                length : 8,
                validate : (v) => {
                    return (
                        Validate.ascii(v, 8) ||
                        v.split('').every((e) => e.charCodeAt(0) == 127)
                    );
                },
				transform : (v) => {
					if (v.split('').every((e) => e.charCodeAt(0) == 127)) {
						return '';
					} else if (v === '') {
						let ret = '';
						for (let n = 0; n < 8; n++) ret += 0x7F;
						return ret;
					}
				}
            },
            radio_name : {
                type : 'unicode',
                offset : 112,
                length : 32
            }
        }
    },
    uncharted_2 : {
        offset : 8949, // 8805 + 144
        records : 1,
        record_length : 32
    },
    menu_items : { // 'Menu Item' section
        offset : 8981,
        records : 1,
        record_length : 5,
        data : {
            menu_hang_time : { // 0 = Hang, 1 to 30 = seconds
                type : 'uint8',
                offset : 0
            },
            text_message : {
                type : 'bit',
                offset : 1,
                bit_offset : 0
            },
            call_alert : {
                type : 'bit',
                offset : 1,
                bit_offset : 1
            },
            edit : {
                type : 'bit',
                offset : 1,
                bit_offset : 2
            },
            manual_dial : {
                type : 'bit',
                offset : 1,
                bit_offset : 3
            },
            radio_check : {
                type : 'bit',
                offset : 1,
                bit_offset : 4
            },
            remote_monitor : {
                type : 'bit',
                offset : 1,
                bit_offset : 5
            },
            radio_enable : {
                type : 'bit',
                offset : 1,
                bit_offset : 6
            },
            radio_disable : {
                type : 'bit',
                offset : 1,
                bit_offset : 7
            },
            program_key : {
                type : 'bit',
                offset : 2,
                bit_offset : 0
            },
            scan : {
                type : 'bit',
                offset : 2,
                bit_offset : 1
            },
            edit_list : {
                type : 'bit',
                offset : 2,
                bit_offset : 2
            },
            missed : {
                type : 'bit',
                offset : 2,
                bit_offset : 3
            },
            answered : {
                type : 'bit',
                offset : 2,
                bit_offset : 4
            },
            outgoing_radio : {
                type : 'bit',
                offset : 2,
                bit_offset : 5
            },
            talkaround : {
                type : 'bit',
                offset : 2,
                bit_offset : 6
            },
            tone_or_alert : {
                type : 'bit',
                offset : 2,
                bit_offset : 7
            },
            power : {
                type : 'bit',
                offset : 3,
                bit_offset : 0
            },
            backlight : {
                type : 'bit',
                offset : 3,
                bit_offset : 1
            },
            intro_screen : {
                type : 'bit',
                offset : 3,
                bit_offset : 2
            },
            keyboard_lock : {
                type : 'bit',
                offset : 3,
                bit_offset : 3
            },
            led_indicator : {
                type : 'bit',
                offset : 3,
                bit_offset : 4
            },
            squelch : {
                type : 'bit',
                offset : 3,
                bit_offset : 5
            },
            vox : {
                type : 'bit',
                offset : 3,
                bit_offset : 7
            },
            password_and_lock : {
                type : 'bit',
                offset : 4,
                bit_offset : 0
            },
            display_mode : {
                type : 'bit',
                offset : 4,
                bit_offset : 1
            },
            program_radio : {
                type : 'bit',
                offset : 4,
                bit_offset : 2
            }
        }
    },
    uncharted_3 : {
        offset : 8986,
        records : 1,
        record_length : 13
    },
    button_definitions : {
        offset : 8999,
        records : 1,
        record_length : 4,
        data : {
            short_press_1 : {
                type : 'uint8',
                offset : 0,
                validate : (v) => (v >= 0 && v <= 38)
            },
            long_press_1 : {
                type : 'uint8',
                offset : 1,
                validate : (v) => (v >= 0 && v <= 38)
            },
            short_press_2 : {
                type : 'uint8',
                offset : 2,
                validate : (v) => (v >= 0 && v <= 38)
            },
            long_press_2 : {
                type : 'uint8',
                offset : 3,
                validate : (v) => (v >= 0 && v <= 38)
            }
        }
        // - Button command values:
        //      - 0 Unassigned
        //      - 1 All Alert Tones On/Off
        //      - 2 Emergency On
        //      - 3 Emergency Off
        //      - 4 High/Low Power
        //      - 5 Monitor
        //      - 6 Nuissance Delete
        //      - 7 One-Touch Access 1
        //      - 8 One-Touch Access 2
        //      - 9 One-Touch Access 3
        //      - 10 One-Touch Access 4
        //      - 11 One-Touch Access 5
        //      - 12 One-Touch Access 6
        //      - 13 Repeater/Talkaround
        //      - 14 Scan On/Off
        //      - 21 Tight/Normal Squelch
        //      - 22 Privacy On/Off
        //      - 23 Vox On/Off
        //      - 24 Zone Select
        //      - 30 Manual Dial for Private
        //      - 31 Lone Worker On/Off
        //      - 34 Record On/Off (Firmware)
        //      - 35 Record Playback (Firmware)
        //      - 36 Delete All Record (Firmware)
        //      - 38 1750 Hz tone burst
    },
    uncharted_4 : {
        offset : 9003,
        records : 1,
        record_length : 14
        // Byte 9014: Long-press duration, min 1000 max 3750
    },
	one_touch_access : {
		offset : 9017,
		records : 6,
		record_length : 4,
		data : {
			mode : { // 0 == none, 1 == digital, 2 == analog
				type : 'bitfield',
				offset : 0,
				bit_offset : 4,
				bit_count : 2
			},
			call_type : {
				// If 'mode' is analog, values 0-3 map to DTMF-1 to DTMF-4 (DTMF Signalling)
				// If 'mode' is digital, 0 == call, 1 == text message
				type : 'bitfield',
				offset : 0,
				bit_offset : 0,
				bit_count : 2
			},
			message : { // Key into Text Messages or DTMF Signalling
				type : 'uint8',
				offset : 1
			},
			contact : {
				type : 'uint8',
				offset : 2
			}
		}
	},
	quick_contact : {
		offset : 9041,
		records : 10,
		record_length : 2,
		data : {
			contact : {
				type : 'uint16le',
				offset : 0
			}
		}
	},
	uncharted_5 : {
		offset : 9061,
		records : 1,
		record_length : 64
	},
    text_messages : { // 'Text Message' section in CPS MD380
        offset : 9125,
        records : 50,
        record_length : 288,
		deletion_markers : [ { offset : 0, value : 0 } ],
        delete_hook : (codeplug, index) => {
            codeplug.one_touch_access.forEach(
                (e) => {
                    if (e.mode == 1 && e.call_type == 1) {
                        if (e.message == (index + 1)) {
                            e.mode = 0;
                        } else if (e.message > index + 1) {
                            e.message = e.message - 1;
                        }
                    }
                }
            );
            codeplug.text_messages.push(
                codeplug.text_messages.splice(index, 1)[0]
            );
            codeplug.text_messages.forEach((e, i) => e.index = i);
        },
        data : {
            text : {
                type : 'unicode',
                offset : 0,
                length : 288
            }
        }
    },
    uncharted_6 : {
        offset : 23525, // 9125 + (288 * 50)
        records : 1,
        record_length : 1472  // 24997 - (9125 + (288 * 50))

		// Privacy Setting, enhanced
		// 23525 ... 23540 key 1
		// 23541 ... 23556 key 2
		// 23557 ... 23572 key 3
		// 23573 ... 23588 key 4
		// 23589 ... 23604 key 5
		// 23605 ... 23620 key 6
		// 23621 ... 23636 key 7
		// 23637 ... 23652 key 8

		// 23653 ... 23668 unknown

		// Privacy Setting, basic
		// 23669 key 1
		// 23671 key 2
		// 23673 key 3
		// 23675 key 4
		// 23677 key 5
		// 23679 key 6
		// 23681 key 7
		// 23683 key 8
		// 23685 key 9
		// 23687 key 10
		// 23689 key 11
		// 23691 key 12
		// 23693 key 13
		// 23695 key 14
		// 23697 key 15
		// 23699 key 16

		// Digit Emergency System
		// 23701 Radio Disable Decode; bit
		// 23701 Radio Monitor Decode; bit
		// 23701 Emergency Remote Monitor Decode; bit
		// 23702 Remote Monitor Duration; uint8 or bitfield (127<<0) 10 - 120, mult 10
		// 23703 Tx Sync Wakeup TOT; bitfield (15<<0); n * 25 = duration ms
		// 23704 Tx Wakeup Message Limit; uint8 or bitfield (15<<0) 1 - 4
		// 23717 ... 23747 System Name
		// 23749 Alarm Type; bitfield
		// 23749 Alarm Mode; bitfield
		// 23750 Impolite Retries; uint8 or bitfield (15<<0) 1 - 15
		// 23751 Polite Retries; uint8 or bitfield (15<<0) 1 - 14, 15 = infinite
		// 23752 Hot Mic Duration; uint8 or bitfield (127<<0) 10 - 120, mult 10
		// 23753 ... 23754 Revert Channel
		// 23757 record #2 ...

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
        delete_hook : (codeplug, index) => {
            codeplug.one_touch_access.forEach(
                (e) => {
                    if (e.mode == 1 && e.contact == (index + 1)) {
                        e.mode = 0;
                    } else if (e.contact > (index + 1)) {
                        e.contact = e.contact - 1;
                    }
                }
            );
            codeplug.quick_contact.forEach(
                (e) => {
                    if (e == (index + 1)) {
                        e = 0;
                    } else if (e > (index + 1)) {
                        e = e - 1;
                    }
                }
            );

			codeplug.receive_groups.forEach(
				(e) => {
					let mi = [];
					for (let n = 1; n < 33; n++) {
						if (e['contact_' + n] == (index + 1)) {
							mi.push(n);
						} else if (e['contact_' + n] > (index + 1)) {
							e['contact_' + n] = e['contact_' + n] - 1;
						}
					}
					mi.forEach(
						(i) => {
							for (let n = i; n < 32; n++) {
								e['channel_' + n] = e['channel_' + (n + 1)];
							}
							e.channel_32 = 0;
						}
					);
				}
			);

            codeplug.receive_groups.forEach(
                (e) => {
                    Object.keys(e).forEach(
                        (ee, i) => {
                            if (ee.search(/^contact_/) == 0) {
                                if (e[ee] == (index + 1)) {
                                    for (let n = i; n < 32; n++) {
                                        e[n] = e[n + 1];
                                    }
                                    e.contact_32 = 0;
                                }
                            }
                        }
                    );
                }
            );
            codeplug.channels.forEach(
                (e) => {
                    if (e.contact_name == (index + 1)) {
                        e.contact_name = 0;
                    } else if (e.contact_name > (index + 1) && e.contact_name !== 65535) {
                        e.contact_name = e.contact_name - 1;
                    }
                }
            );
            codeplug.contacts.push(codeplug.contacts.splice(index, 1)[0]);
            codeplug.contacts.forEach((e, i) => e.index = i);
        },
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
                validate : (v) => v >= 0 && v < 4 // 0 seems to be valid for deleted contacts
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
        delete_hook : (codeplug, index) => {
            codeplug.channels.forEach(
                (e) => {
                    if (e.group_list == (index + 1)) {
                        e.group_list = 0;
                    } else if (e.group_list > (index + 1) && e.group_list !== 255) {
                        e.group_list = e.group_list - 1;
                    }
                }
            );
            codeplug.receive_groups.push(
                codeplug.receive_groups.splice(index, 1)[0]
            );
            codeplug.receive_groups.forEach((e, i) => e.index = i);
        },
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
        delete_hook : (codeplug, index) => {
            codeplug.zones.push(codeplug.zones.splice(index, 1)[0]);
			codeplug.zones.forEach((e, i) => e.index = i);
        },
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
        delete_hook : (codeplug, index) => {
            codeplug.channels.forEach(
                (e) => {
                    if (e.scan_list == (index + 1)) {
                        e.scan_list = 0;
                    } else if (e.scan_list > (index + 1)) {
                        e.scan_list = e.scan_list - 1;
                    }
                }
            );
            codeplug.scan_lists.push(codeplug.scan_lists.splice(index, 1)[0]);
			codeplug.scan_lists.forEach((e, i) => e.index = i);
        },
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
                validate : (v) => v === 0 || (v >= 2 && v <= 255)
            },
            priority_sample_time : { // n * 250 = time in ms, n >= 3
                type : 'uint8',
                offset : 40,
                validate : (v) => v === 0 || (v >= 3 && v <= 255)
            }
        }
    },
    uncharted_7 : {
        offset : 126997, // 10097 + (250 * 104)
        records : 1,
        record_length : 16
    },
    channels : { // 'Channels Information' section in CPS MD380
        offset : 127013,
        records : 1000,
        record_length : 64,
		deletion_markers : [ { offset : 16, value : 255 } ],
		delete_hook : (codeplug, index) => {
			codeplug.scan_lists.forEach(
				(e) => {
					let mi = [];
					for (let n = 1; n < 32; n++) {
						if (e['channel_' + n] == (index + 1)) {
							mi.push(n);
						} else if (e['channel_' + n] > (index + 1)) {
							e['channel_' + n] = e['channel_' + n] - 1;
						}
					}
					mi.forEach(
						(i) => {
							for (let n = i; n < 31; n++) {
								e['channel_' + n] = e['channel_' + (n + 1)];
							}
							e.channel_31 = 0;
						}
					);
				}
			);
			codeplug.zones.forEach(
				(e) => {
					let mi = [];
					for (let n = 1; n < 17; n++) {
						if (e['channel_' + n] == (index + 1)) {
							mi.push(n);
						} else if (e['channel_' + n] > (index + 1)) {
							e['channel_' + n] = e['channel_' + n] - 1;
						}
					}
					mi.forEach(
						(i) => {
							for (let n = i; n < 16; n++) {
								e['channel_' + n] = e['channel_' + (n + 1)];
							}
							e.channel_16 = 0;
						}
					);
				}
			);
			codeplug.channels.push(codeplug.channels.splice(index, 1)[0]);
			codeplug.channels.forEach((e, i) => e.index = i);
		},
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
                validate : (v) => v > 0 && v < 4 // '3' appears to be valid for deleted channels
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
                validate : (v) => v > 0 && v <= 3 // '3' appears to be valid for deleted channels
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
                validate : (v) => v >= 0 && v <= 3 // '3' appears to be valid for deleted channels
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
                validate : (v) => v >= 0 && v <= 3 // '3' appears to be valid for deleted channels
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
                validate : (v) => v >= 0 && v <= 3 // '3' appears to be valid for deleted channels
            },
            in_call_criteria : { // 0 always, 1 follow Admit Criteria
                type : 'bit',
                offset : 5,
                bit_offset : 5
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
                validate : (v) => (v >= 0 && v <= 32) || v === 63 // CPS MD380 allows up to 32 entries in 'Digit Emergency System'; 63 on a deleted channel
            },
            scan_list : { // 0 none, > 0 keys into scan_list
                type : 'uint8',
                offset : 11,
                validate : (v) => (v >= 0 && v <= 250) || v === 255 // 255 appears valid on a deleted or never-populated channel
            },
            group_list : { // 0 none, > 0 keys into receive_groups
                type : 'uint8',
                offset : 12,
                validate : (v) => (v >= 0 && v <= 250) || v === 255 // 255 appears valid on a deleted or never-populated channel
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
                offset : 16,
                validate : (v) => Validate.bcdle(v) || v === '1515151515151515'
            },
            transmit_frequency : { // Hz / 10
                type : 'bcdle',
                offset : 20,
                validate : (v) => Validate.bcdle(v) || v === '1515151515151515'
            },
            ctcss_dcs_decode : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'uint16le',
                offset : 24
            },
            ctcss_dcs_encode : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'uint16le',
                offset : 26
            },
            ctcss_dcs_decode_parsed : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'bcdt',
                offset : 24
            },
            ctcss_dcs_encode_parsed : { // { tone : Number, mode : Number } - see comments in ./reader.js readBCDT
                type : 'bcdt',
                offset : 26
            },
            receive_signalling_system : { // Key into DTMF Signalling, system 1-4, wherever that may be stored
                type : 'bitfield',
                offset : 28,
                bit_offset : 0,
                bit_count : 3,
                validate : (v) => (v >= 0 && v <= 4) || v === 7 // 7 appears to be valid on a deleted channel
            },
            transmit_signalling_system : { // Key into DTMF Signalling, system 1-4, wherever that may be stored
                type : 'bitfield',
                offset : 29,
                bit_offset : 0,
                bit_count : 3,
                validate : (v) => (v >= 0 && v <= 4) || v === 7 // 7 appears to be valid on a deleted channel
            },
            name : {
                type : 'unicode',
                offset : 32,
                length : 32
            }
        }
    },
    uncharted_8 : {
        offset : 191013,
        records : 1,
        record_length : 71696

		// DTMF Signalling System

		// System 1
		// 197157 First Digit Delay (100 - 2550) uint8, value = n * 10
		// 197158 First Digit Time (30 - 2550) ""
		// 197159 Digit Duration Time ""
		// 197160 Digit Interval Time ""
		// 197161 *# Digit Time (0 - 2550) ""
		// 197162 D Key Assignment (0 = 'D Key', 1 - 2550) ""
		// 197163 Next Sequence (.2 - 25.5) uint8, value = n * .1
		// 197164 Auto Reset Time (1 - 255) uint8
		// 197165 DTMF Side Tone (bit)
		// 197165 PTT ID (bitfield)
		// 197165 Group Code (bitfield)
		// 197173 ... 197188 Key-Up Encode
		// 197189 ... 197204 Key-Down Encode
		// 197205 System 2 ...
		// 197253 System 3 ...
		// 192301 System 4 ...

		// Encode
		// 197349 ... 197364 Encode 1
		// ... 15 bytes each
		// 197845 ... 197860 Encode 32

		// Decode
		// Decode 1
		// 197861 ... 197876 DTMF ID
		// 197877 Response type; bitfield
		// 197878 Decode Type; bit
		// 197879 Ack; bit
		// 197880 Ack Delay Time; uint16 prolly; value * 50 = ms, 0 = off
		// 197885 Decode 2 ...
		// ...
		// 198029 Decode 8
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
module.exports = Map;
