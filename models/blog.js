const mongoose=require("mongoose");
const Schema=mongoose.Schema;


const blogSchema = new Schema({
    B_image:{
        type:String,
        required:true,
       
    }    
    ,
    B_title:{
        type:String,
        required:true,
    }    
    ,
    B_description:{
        type:String,
        required:true,
    }    
    ,
    created_at:{
        type: Date,
        default: Date.now,
    }
});

const Blog =mongoose.model("blog",blogSchema);
module.exports=Blog;