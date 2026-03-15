const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:/Users/karth/Avensong/2026 Avensong Amenity Access Packet.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
});
