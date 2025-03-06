const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const floorSchema = new Schema({
    // serial_no: {
    //     type: Number,
    //     required: true,
    //     unique: true
    // },
    floor_name: {
        type: String,
        required: true,
        unique: true ,
    },
    total_rooms: {
        type: Number,
        required: true,
        default: 0
    },
    occupied_rooms:{
        type: Number,
        required: true,
        default: 0
    },
    total_beds: {
        type: Number,
        required: true,
        default: 0
    },
    occupied_beds:{
        type: Number,
        required: true,
        default: 0
    },
    active_number: {
        type: Number,
        required: true,
        default: 0
    }
});
        
// Automatically update floor data when a room is added/updated
floorSchema.methods.updateRoomData = function (rooms) {
    this.total_rooms = rooms.length;
    this.occupied_rooms = rooms.filter(room => room.isOccupied).length;
    this.total_beds = rooms.reduce((sum, room) => sum + room.total_beds, 0);
    this.occupied_beds = rooms.reduce((sum, room) => sum + room.occupied_beds, 0);
    return this.save();
};

const Floor = mongoose.model("Floor", floorSchema);
module.exports = Floor;
