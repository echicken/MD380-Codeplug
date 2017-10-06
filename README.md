# MD380-Codeplug
Classes for handling .rdt codeplug files for Tytera MD-380 (and possibly other) radios.

### Warning

This software can be used to generate a .rdt codeplug file which can be written
to a Tytera MD-380 radio.  This has not been thoroughly tested yet, and there
may be a risk of damage to your radio.  You have been warned, and it ain't my
fault if you hose your radio, mkay?

### Codeplug

```js
const fs = require('fs');
const Codeplug = require('/path/to/MD380-Codeplug/index.js');

// Load an existing codeplug
const codeplug = new Codeplug(fs.readFileSync('/path/to/some/codeplug.rdt'));

// Show the current radio name
console.log(codeplug.settings.radio_name);

// Change the radio name
codeplug.settings.radio_name = 'Poopypants';

// Write the modified codeplug to another file
fs.writeFileSync('/path/to/my/newcodeplug.rdt', codeplug.serialize());
```
