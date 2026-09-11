const fs = require('fs');
const { parseRows } = require('./parseRows.cjs');

// Block 1: 2026/09/09 to 2026/08/27
const block1 = fs.readFileSync(__dirname + '/input1.html', 'utf8');

// We will save blocks 2, 3, and 4 and parse all together.
console.log("Block 1 parsed count:", parseRows(block1).length);
