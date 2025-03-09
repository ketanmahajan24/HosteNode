const express = require('express');
const router = express.Router();
const User = require('../models/user');  // Adjust path if necessary
const {jwtAuthMiddleware,generateToken}=require('./../jwt.js') 




// ///////////////////////////////////////////
// SCHEMA CONNECTIN $ REQUIRE 
// ///////////////////////////////////////////
const Floor = require("../models/floor.js"); // Floor SCHEMA
const Room = require("../models/room.js"); // room SCHEMA
const Member = require("../models/member.js"); // room SCHEMA
const Payment = require("../models/payment.js"); // Payment SCHEMA
// const User = require('./models/user.js'); 
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////





// POST route to signup User
router.post('/signup', async (req, res) => {
    try {
        const {name,email,username,password} = req.body.user; // Assuming the request body contains the person data

        // Create a new Person document using the Mongoose model
        const newUser = new User({
            name:name,
            email:email,
            username:username,
            password:password
        });

        // Save the new user to the database
        const response = await newUser.save();
        
        console.log('data saved',newUser);

        const payload ={
            id:response.id,
            username:response.username
        }
        console.log(JSON.stringify(payload));
        const token=generateToken(payload);
        // console.log("Token is : ",token)

        res.status(200).json({response:response,token:token});
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login Route
router.post('/login', async(req, res) => {
    try {
        // Extract username and password from request body
        const {username,password} = req.body.user;

        // Find the user by username
        const user = await User.findOne({username: username}); 

        // If user does not exist or password does not match, return error
        if (!user || !(await user.comparePassword(password))){
            return res.status(401).json({error: 'Invalid username or password'});
        }
        // generate Token
        const payload = {
            id: user.id,
            username: user.username
        };
        const token = generateToken(payload);
        console.log("Login Successful");
         
        // ✅ Set Token in Cookie
        res.cookie('token', token, {
            httpOnly: true,  // Prevent XSS Attacks
            secure: false,   // Change to true in production with HTTPS
            sameSite: 'strict',
        });   
                   
                    // res.cookie('token', token, { httpOnly: true });
                    // Redirect to dashboard after successful login
                    res.redirect('/user');
 

    } catch(err){
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET method to get the person
router.get('/', jwtAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
        
        console.log(user);
        console.log(user.username);


      const data = await User.find();
      console.log('data fetched');

      res.status(200).render('dashboard.ejs',{user});
 
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
router.get("/profile",jwtAuthMiddleware,async(req,res)=>{
    try{
        userData=req.user;
        console.log("USER DATA",userData);
        const userId=userData.id;
        // const user = await User.findById(userId);
        // res.status(200).render('dashboard.ejs');
        res.status(200).send("heelo i m profile")
    }catch(err){
        console.error(err);
        res.status(500).json({error:"internal server "})
    }
})

/////////////// View all Floors//////////////////////////////////////////////////////////////////////////////////////////
    router.get("/floors",jwtAuthMiddleware,async(req,res)=>{

        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
            
        // Find floors where userId matches the creator
        const allFloors = await Floor.find({ user: userId });

        // console.log(user);
        res.status(200).render("showPage/floors/floor.ejs",{allFloors,user});
      })
      //all Floor
    router.get("/managefloor",jwtAuthMiddleware, async (req,res)=>{ 
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
            
        const allFloors = await Floor.find({ user: userId });
        res.status(200).render("showPage/floors/managefloor.ejs",{allFloors,user});
    })
    //Add New Floor
    router.get("/newfloor",jwtAuthMiddleware,async(req,res)=>{
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
    
        res.render("showPage/floors/newFloor.ejs",{user})
    })

    // Taking input values from newFloor // route ->{"/admin/students/new"}
    router.post("/newfloor",jwtAuthMiddleware, async (req, res) => {
        try {
        const { floor_name } = req.body.floor;
        // console.log(floor_name);

        const userId = req.user.id; // This is your user ID from the token

        //  Check if a floor with the same name already exists
       //  Check if a floor with the same name already exists for the user
                const existingFloor = await Floor.findOne({ 
                    floor_name: floor_name, 
                    user: userId 
                });
 
        if (existingFloor){
        return res.status(400).send(`<h1> ${floor_name} floor with this name already exists.</h1>`);
        }
        // Create a new student with the data from the request body
        const newFloor = new Floor(
            {floor_name:floor_name,
            user:userId, // Attach the user's ID from the token
            });

        // Attempt to save the student to the database
        await newFloor.save();
        
        // If successful, redirect to the students list page
        res.redirect("/user/floorS");
        console.log("New Floor Added:", newFloor);
        } catch (error){
        // Log the error to the console for debugging
        console.error("Error saving blog:", error);
        
        // Check if the error is a MongoDB duplicate key error
        if (error.code === 11000) {
            // Duplicate key error (for example, unique constraint on a field like prn)
            res.status(400).send("Error: Duplicate entry detected. Please ensure unique values for unique fields.");
        } else if (error.name === "ValidationError"){
            // Mongoose validation error
            res.status(400).send("Validation Error: " + error.message);
        } else {
            // General server error for other unexpected issues
            res.status(500).send("An unexpected error occurred. Please try again later.");
        }
        }
    });

    // DELETE FLOOR /////////////////////////////////////////
    // //DELETE ROUTE
    router.delete("/managefloor/:id",jwtAuthMiddleware,async(req,res)=>{
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
    
      let {id}=req.params;
    //   const floor = await Floor.find({ user: userId });
      let deletefloor= await Floor.findByIdAndDelete(id);
      // console.log(deletedMember);
      res.redirect("/user/managefloor");
    })

///////
// View all Rooms 
    router.get("/allrooms",jwtAuthMiddleware, async(req,res)=>{
        
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)

        const allRooms= await Room.find({ user: userId });
        const allFloors = await Floor.find({ user: userId });
        res.render("showPage/rooms/allrooms.ejs",{allRooms,allFloors,user});
    })

    
    // Manage all Rooms
    router.get("/managerooms",jwtAuthMiddleware,async (req,res)=>{
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)

        const allRooms= await Room.find({ user: userId });

        res.render("showPage/rooms/managerooms.ejs",{allRooms,user});
      })

      //Add New Room
           router.get("/newroom",jwtAuthMiddleware, async (req,res)=>{

            const userId = req.user.id; // This is your user ID from the token
            const user= await User.findById(userId)
            
            const floors= await Floor.find({ user: userId });
            res.render("showPage/rooms/newRoom.ejs",{floors,user});
          })
      









/////Log Out//////route
    router.get("/logout",jwtAuthMiddleware,(req, res) => {
        res.clearCookie("token"); // Clear the JWT token from cookies
        res.redirect("/login");   // Redirect to login page
      });
      



module.exports = router;
