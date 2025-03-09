const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roomSchema = new mongoose.Schema({

    floor_id:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",  // 🔑 Foreign key to Floor
      required: true
    },
    floor_name: {
        type: String,
        // required: true,
    
    },
  room_number: {
    type: String,
    unique: true,
    required: true,
  },
  room_fees:{
    type: Number,
    required: true,
  },
  sharing_capacity: {
    type: Number,
    required: true,
    default : 0

  },
   occupied_beds: {
    type: Number,
    required: true,
    default : 0

  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // This references the User collection
    required: true,
  }
  
});

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;
