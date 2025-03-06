const mongoose=require("mongoose");
const Schema=mongoose.Schema;


const courseSchema = new Schema({
    
    C_image:{
        type:String,
        required:true,
    }
    ,
    C_title:{
        type:String,
        required:true,
    }    
    ,
    C_description:{
        type:String,
        required:true,
    }    
    ,
    duration:{
        type:String,
    }
});

const Course =mongoose.model("course",courseSchema);
module.exports=Course;