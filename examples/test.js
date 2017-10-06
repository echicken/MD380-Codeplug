'use strict';

const fs = require('fs');

const Codeplug = require('../index.js');

const codeplug = new Codeplug();//fs.readFileSync('../lib/default1.rdt'));

console.log(codeplug.settings);
console.log(codeplug.text_messages);
console.log(codeplug.contacts);
console.log(codeplug.receive_groups);
console.log(codeplug.zones);
console.log(codeplug.scan_lists);
console.log(codeplug.channels);

codeplug.settings.radio_name = 'Poopypants';
const  buf = codeplug.serialize();
fs.writeFileSync('./poopypants.rdt', buf);
