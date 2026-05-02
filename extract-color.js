const fs = require('fs');
const str = fs.readFileSync('template_docx/word/document.xml', 'utf8');
const fillMatches = [...str.matchAll(/w:fill="([0-9a-fA-F]{6})"/g)];
const colorMatches = [...str.matchAll(/w:color w:val="([0-9a-fA-F]{6})"/g)];
const themeMatches = [...str.matchAll(/w:themeColor="([^"]+)"/g)];
const shadeMatches = [...str.matchAll(/w:themeShade="([^"]+)"/g)];

console.log('Fill:', [...new Set(fillMatches.map(m => m[1]))]);
console.log('Color:', [...new Set(colorMatches.map(m => m[1]))]);
console.log('Theme:', [...new Set(themeMatches.map(m => m[1]))]);
console.log('Shade:', [...new Set(shadeMatches.map(m => m[1]))]);
