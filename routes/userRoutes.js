const express = require('express');
const router = express.Router();
const Admin = require("../models/admin.js"); // Floor SCHEMA
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
////// admin dashboard


const moment = require("moment-timezone");

// Get current time in IST
const currentISTTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");


// POST route to signup User
router.post('/signup', async (req, res) =>{
    try {
        const {name,email,phone,hostelName,username,password} = req.body.user; // Assuming the request body contains the person data

        // Create a new Person document using the Mongoose model
        const newUser = new User({
            name:name,
            email:email,
            phone:phone,
            hostelName:hostelName,
            username:username,
            password:password,
            location:location,
            createdAt:  currentISTTime
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
        res.redirect('/login');
        // res.status(200).json({response:response,token:token});
        
    }
    catch (err) {
        console.log(err);
        return res.render("authPrivate/signup.ejs", { error: "An account with these details already exists.!" });
    }
});

// Login Route
router.post('/login', async(req, res) => {
    try {
        // Extract username and password from request body
        const {username,password} = req.body.user;

              // Find the user by username and check if status is "active"
        const user = await User.findOne({ username: username, status: "Active" });
        
        if (!user) {
          return res.render("authPrivate/login.ejs", { error: "Invalid username or password" });
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


// GET method to get the dashboard data
router.get('/', jwtAuthMiddleware, async (req, res) => {
  try {
      const userId = req.user.id; // This is your user ID from the token
      const user = await User.findById(userId);

      // ✅ Fetch all rooms, floors, and members related to the logged-in user
      const rooms = await Room.find({ user: userId });
      const floors = await Floor.find({ user: userId });

      // ✅ Fetch all members with payments populated
      const members = await Member.find({ user: userId })
          .populate("payments")
          .exec();

      // ✅ Calculate Total Beds
      const totalBeds = rooms.reduce((sum, room) => sum + room.sharing_capacity, 0);

      // ✅ Calculate Available Beds
      const availableBeds = totalBeds - rooms.reduce((sum, room) => sum + room.occupied_beds, 0);

      // ✅ Calculate Booked Rooms
      const bookedRooms = rooms.filter(room => room.occupied_beds > 0).length;

      // ✅ Calculate Total Rooms
      const totalRooms = rooms.length;

      // ✅ Calculate Total Students
      const totalStudents = members.length;

      // ✅ Calculate Revenue from Payments (Dynamically)
      let totalExpectedRevenue = 0;
      let totalFeesCollected = 0;
      let totalPendingAmount = 0;
      let totalAdvancedPaid = 0;
      let paidAccounts = 0;
      let dueAccounts = 0;

      members.forEach(member => {
          // ✅ Total Room Fees for Member
          const totalRoomFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);

          // ✅ Total Amount Paid for Member
          const totalPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

          // ✅ Calculate Due Amount (if paid amount < room fees)
          const dueAmount = totalRoomFees - totalPaid;

          // ✅ Calculate Advanced Paid Amount (if paid amount > room fees)
          const advancedPaid = totalPaid > totalRoomFees ? totalPaid - totalRoomFees : 0;

          // ✅ Track Revenue Data
          totalExpectedRevenue += totalRoomFees;
          totalFeesCollected += totalPaid;
          totalPendingAmount += dueAmount > 0 ? dueAmount : 0;
          totalAdvancedPaid += advancedPaid > 0 ? advancedPaid : 0;

          // ✅ Count Paid and Due Accounts
          if (totalPaid >= totalRoomFees) {
              paidAccounts++;
          } else {
              dueAccounts++;
          }
      });
      
      // ✅ Calculate Collection Percentage
      let feesCollectionCompleted = totalExpectedRevenue > 0
          ? ((totalFeesCollected / totalExpectedRevenue) * 100).toFixed(2)
          : 0;

      // ✅ Format Numbers in Indian Currency without Decimal (.00)
      const formatCurrency = (amount) => {
          return new Intl.NumberFormat("en-IN", {
              minimumFractionDigits: 0,   // ✅ Removed .00 (No decimal)
              maximumFractionDigits: 0    // ✅ Removed .00 (No decimal)
          }).format(amount);
      };

      // ✅ Render the dashboard.ejs file
      res.status(200).render('dashboard.ejs', {
          user,
          availableBeds,
          totalBeds,
          bookedRooms,
          totalRooms,
          totalStudents,
          totalPendingAmount: formatCurrency(totalPendingAmount),
          totalAdvancedPaid: formatCurrency(totalAdvancedPaid),
          totalFeesCollected: formatCurrency(totalFeesCollected),
          totalExpectedRevenue: formatCurrency(totalExpectedRevenue),
          balance: formatCurrency(totalExpectedRevenue - totalFeesCollected),
          feesCollectionCompleted,
          paidAccounts,
          dueAccounts
      });

  } catch (err) {
      console.error(err);
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
      

          router.post("/newroom", jwtAuthMiddleware, async (req, res) => {
            const userId = req.user.id;
            const user = await User.findById(userId);
          
            try {
              const { floor_id, room_number, room_fees, sharing_capacity, occupied_beds } = req.body.room;
          
              // Step 1: Find the floor by floor_id
              const floor = await Floor.findById(floor_id);
              if (!floor) {
                return res.status(404).send("Error: Floor not found.");
              }
          
              // ✅ Step 2: Check if the room with the same number exists
              const existingRoom = await Room.findOne({ room_number, floor_id });
              if (existingRoom) {
                return res.status(400).send(`<h1>Room number ${room_number} already exists on this floor.</h1>`);
              }
          
              // ✅ Step 3: Create a new room
              const newRoom = new Room({
                user: userId,
                floor_id,
                floor_name: floor.floor_name,
                room_number,
                room_fees,
                sharing_capacity,
                occupied_beds,
              });
          
              // ✅ Step 4: Save the new room
              await newRoom.save();
          
              // ✅ Step 5: Increment total_rooms and total_beds in the Floor collection
              await Floor.findByIdAndUpdate(floor_id, {
                $inc: {
                  total_rooms: 1,
                  total_beds: newRoom.sharing_capacity
                }
              });
          
              // ✅ Step 6: Redirect to the rooms page
              res.redirect("/user/allrooms");
              console.log("New Room Added:", newRoom);
          
            } catch (error) {
              console.error("Error saving room:", error);
          
              if (error.code === 11000) {
                res.status(400).send(`<h1>Room number ${room_number} already exists.</h1>`);
              } else if (error.name === "ValidationError") {
                res.status(400).send("Validation Error: " + error.message);
              } else {
                res.status(500).send("An unexpected error occurred. Please try again later.");
              }
            }
          });
          
            //////////////////////////////////////////////////////////////////////////////////
            router.get("/managerooms/:id/edit",jwtAuthMiddleware,async(req,res)=>{
                const userId = req.user.id; // This is your user ID from the token
            const user= await User.findById(userId)
      
              
                let {id}=req.params;
              const room = await Room.findById(id); 
              console.log(room);
              res.render("showPage/rooms/Edit-Room.ejs",{room,user});
            })
            
            // PUT route to update room details
            router.put("/manageroom/:id", jwtAuthMiddleware,async (req, res) => {
              const { id } = req.params;
            
              const room = await Room.findById(id); 
              console.log(room.sharing_capacity);
            
              await Floor.findByIdAndUpdate(room.floor_id, { $inc: {total_beds:-room.sharing_capacity} });
            
              const { room_fees, sharing_capacity }= req.body.room;
            
             console.log(sharing_capacity)
             await Floor.findByIdAndUpdate(room.floor_id, { $inc: {total_beds:sharing_capacity} });
              try {
                  const updatedRoom = await Room.findByIdAndUpdate(id,{
                      room_fees,
                      sharing_capacity
                  });
                  
            
                  res.redirect("/user/managerooms");  // Redirect after update
              } catch (error) {
                  console.error("Error updating room:", error);
                  res.status(500).send("Failed to update room details.");
              }
            });
             
            
            // //DELETE ROOM
            router.delete("/managerooms/:id",jwtAuthMiddleware,async(req,res)=>{
              let {id}=req.params;
              const room = await Room.findById(id);
              let deleteroom= await Room.findByIdAndDelete(id);
              // console.log(deletedMember);
               
            // Update the floor's -1 total_rooms
            // await Room.findByIdAndUpdate(member.assignedRoom_id, { $inc: {occupied_beds: -1 } });
             console.log(room)
            // Update the floor's total_rooms
                  await Floor.findByIdAndUpdate(room.floor_id,{ $inc: {total_rooms: -1,
                    occupied_beds:-room.occupied_beds,
                    total_beds:-room.sharing_capacity,
                    // occupied_beds,
                    active_number: -room.occupied_beds,
                  } });
            
                  if (room.sharing_capacity === room.occupied_beds) {
                    console.log(room.occupied_beds);
                    console.log("************************** Room Fulled *****************************");
                    await Floor.findByIdAndUpdate(room.floor_id, { $inc: { occupied_rooms: -1 } });
                    
                  } else {
                    console.log(room.occupied_beds);
                    console.log("************************** Room Not Fulled *****************************");
                  }
                  res.redirect("/user/managerooms");
            })
            
            
            // MEMBERS //////////////////////////////////////////////////////////////////////////////////////////////////
                // View all Members
                router.get("/members",jwtAuthMiddleware, async (req, res) => {
                    const userId = req.user.id; // Get the logged-in user's ID from token
                    const user= await User.findById(userId)
      
                    const members = await Member.find({ user: userId }).populate('payments');
                    console.log(members);
                  
                    res.render("showPage/memberData/Allmember.ejs", { allMembers: members,user });
                  });
                //////////////////////////////////////////////////////////////////////////
            // MEMBER Edit by ._id/
            // MEMBER Edit by _id
            router.get("/member-edit/:id/edit",jwtAuthMiddleware,async (req, res) => {
              try {
                const userId = req.user.id; // Get the logged-in user's ID from token
                const user= await User.findById(userId)
                const { id } = req.params;
            
                  // Fetch all rooms (in case you want to allow room reassignment during edit)
                  const rooms = await Room.find({});
            
                  // Find member by ID and populate payments
                   
            
                  const member = await Member.findById(id).populate('payments');
               
                  if (!member) {
                      return res.status(404).send("Member not found");
                  }
            
                  // Render edit page with member and rooms data
                  res.render("showPage/memberData/Edit-Allmember.ejs", { allMembers: member, rooms,user });
            
              } catch (error) {
                  console.error("❌ Error loading member edit page:", error);
                  res.status(500).send("Server Error: Unable to load member edit page.");
              }
            });
            
            //UPDATE ROUTE
            // UPDATE MEMBER ROUTE
            router.put("/member-edit/:id", jwtAuthMiddleware,async (req, res) => {
              try {
                  const {id} = req.params;
            
                  // Find and update the member using spread to safely update nested data
                  const updatedMember = await Member.findByIdAndUpdate(id,{ ...req.body.member },{ new: true });
            
                  if (!updatedMember) {
                      return res.status(404).send("Member not found");
                  }
            
                  console.log("✅ Member updated successfully:", updatedMember);
            
                  // You can redirect to a success page or back to member list
                  res.redirect("/user/members");  // Adjust based on your frontend structure
                //   res.send("updated")
            
              } catch (error) {
                  console.error("❌ Error updating member:", error);
                  res.status(500).send("Server Error: Unable to update member.");
              }
            });
            
            // //DELETE ROUTE
            router.delete("/member/:id", jwtAuthMiddleware,async(req,res)=>{
              let {id}=req.params;
            
              const member = await Member.findById(id);
              let deletemember= await Member.findByIdAndDelete(id);
              // console.log(deletedMember);
              
              const room = await Room.findById(member.assignedRoom_id);
              if (!room) return res.status(404).send("Error: ROOM not found.");
            
            // Update the floor's -1 total_rooms
            await Room.findByIdAndUpdate(member.assignedRoom_id, { $inc: {occupied_beds: -1 } });
            //  console.log(room)
            // Update the floor's total_rooms
            await Floor.findByIdAndUpdate(room.floor_id, { $inc: { active_number: -1,occupied_beds:-1 } });           
              res.redirect("/user/members");
            })

            
    //View Active Members 
    router.get("/activeMember", jwtAuthMiddleware,async(req,res)=>{
        
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)

        const allMembers=await Member.find({ user: userId });  
        res.render("showPage/memberData/activeMember.ejs",{allMembers,user});
      }) 
  
      // UPDATE MEMBER STATUS TO INACTIVE // WEHEN WE CLICK THE **LEFT** BUTTON THEN STATUS WILL BE CHANGE TO INACTIVE ////////////////////////////////////////////////////////////////////////
  router.get("/activeMember/:id",jwtAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
      // 1️⃣ Find the Member
      const member = await Member.findById(id);
      if (!member) {
        return res.status(404).send("Member not found.");
      }
      // 2️⃣ Update Member Status to "Inactive"
      member.status = "Inactive";
      member.leftDate = new Date(); // Optional: Track when the member left
  
      // 3️⃣ Save the Updated Member Document
      await member.save();
  
  
      const room = await Room.findById(member.assignedRoom_id);
      if (!room) return res.status(404).send("Error: ROOM not found.");
    
    // Update the floor's -1 total_rooms
    await Room.findByIdAndUpdate(member.assignedRoom_id, { $inc: {occupied_beds: -1 } });
    //  console.log(room)
    // Update the floor's total_rooms
    await Floor.findByIdAndUpdate(room.floor_id, { $inc: { active_number: -1,occupied_beds:-1 } });

      // ✅ Redirect or Respond
      res.redirect("/user/members"); // Redirect to members list or member details page
    } catch (error) {
      console.error("Error updating member status:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  // 
   
    // Add New Member
      router.get("/newmember", jwtAuthMiddleware,async(req,res)=>{

        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)

        const rooms= await Room.find({ user: userId });
        const floors = await Floor.find({ user: userId });
        
          res.render("showPage/memberData/newmember.ejs",{rooms,floors,user}); 
      })
       // Taking input values from student-new.ejs // route ->{"/admin/students/new"}
       router.post("/newMember", jwtAuthMiddleware, async (req, res) => {
        try {

            
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
        
      
          const { assignedRoom_id,name, fatherName, mobileNo, aadharNo, address, profession, joiningDate } = req.body.member;
          // const { totalFees, amountPaid, paymentMode, payableDate } = req.body.payment;
          // ✅ Step 1: Find the room
          const room = await Room.findById(assignedRoom_id);
          if (!room) return res.status(404).send("Error: ROOM not found.");
         
          // ✅ Step 2: Check for duplicate Mobile Number
          const existingMobile = await Member.findOne({ mobileNo, user: userId });
          if (existingMobile) {
            return res.status(400).send(`<h1>Mobile Number ${mobileNo} already exists for your account. Try with another Mobile Number....!</h1>`);
          }

          // ✅ Step 3: Check for duplicate Aadhar Number
          const existingAadhar = await Member.findOne({ aadharNo, user: userId });
          if (existingAadhar) {
            return res.status(400).send(`<h1>Aadhar Number ${aadharNo} already exists for your account. Try with another Aadhar Number....!</h1>`);
          }

          
          // ✅ Step 2: Create new member
          const newMember = new Member({
            user: userId,
            assignedRoom_id,
            name,
            fatherName,
            mobileNo,
            aadharNo,
            address,
            profession,
            joiningDate,
            assignedRoom: room.room_number,
            status: "Inactive",
          });
      
          // ✅ Step 3: Calculate due amount
          // const dueAmount = totalFees - amountPaid;
      
          // ✅ Step 4: Create new payment
          const newPayment = new Payment({
            // user: userId,
            memberId: newMember._id,
            roomId: assignedRoom_id,
            roomFees:room.room_fees,
          });
          console.log(room.floor_id);
  
         // ✅ Step 5: Save payment and push reference to member
  
          //if beds are fully 
         if( room.sharing_capacity==room.occupied_beds){
          console.log("BEDS ARE NOT Available");
          res.send("IN THIS ROOM ALL BEDS ARE ALREADY OCCUPIED ")
         }else{
          
          await newPayment.save();
          newMember.payments.push(newPayment._id);
          // ✅ Step 6: Save member
          await newMember.save();
             
        res.redirect("/user/newAdded/succesfully");
        console.log("✅ New member and payment added:",newMember, newPayment);
        console.log(room.occupied_beds);
        console.log(newPayment)
            if (room.sharing_capacity === room.occupied_beds + 1) {
              console.log(room.occupied_beds);
              console.log("************************** Room Fulled *****************************");
              await Floor.findByIdAndUpdate(room.floor_id, { $inc: { occupied_rooms: 1 } });
              
            } else {
              console.log(room.occupied_beds);
              console.log("************************** Room Not Fulled *****************************");
            }
         // Update the floor's total_rooms
         await Room.findByIdAndUpdate(assignedRoom_id, { $inc: {occupied_beds: 1 } });
         // console.log("Room added:", newRoom);
         // Update the floor's total_rooms
         await Floor.findByIdAndUpdate(room.floor_id, { $inc: { active_number: 1,occupied_beds:1 } });
         // console.log("Room added:", newRoom);
        
        }
       
        } catch (error) {
            console.error("❌ Error saving member:",error);
            res.send("<H1>DUPLICATE VALUE</H1>");
        }
      });
  
      router.get("/newAdded/succesfully", jwtAuthMiddleware, async(req,res)=>{
        
      
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
        res.render("showPage/memberData/newmemberADDED.ejs",{user});
      })
      
   ////////////////////////////////////////////////////////////////
            /////////////////PAYMENTS//////////////////
   /////////////////////////////////////////////////////////////////
   
   
   // ADD PAYMENT TO PARTICULAR MEMBER                         
   router.get("/members/:id/addpayment",jwtAuthMiddleware, async (req, res) => {
     const {id} = req.params;
     
     const userId = req.user.id; // This is your user ID from the token
     const user= await User.findById(userId)
   
     try {
       const member = await Member.findById(id).populate('payments');
       if (!member) return res.status(404).send("Error: Member not found.");
       // ✅ Calculate total fee
   
       const totalFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);
   
       // Sum of all amountPaid from payments
       
       const amountPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
   
       // Calculate dueAmount based on totalFees
       const dueAmount = amountPaid >= totalFees ? 0 : totalFees - amountPaid;
 
       // const totalFee = member.payments.reduce((sum,payment) => sum + payment.totalFees, 0)
       res.render("payments/addpayment.ejs", {member,dueAmount,user});
     } catch (err){
       console.error("Error fetching member:", err);
       res.status(500).send("Server Error");
     }
   });
   // ADD PAYMENT ENTRY /////////////////////////////////////////////////////
   router.post("/addpayment/:id",jwtAuthMiddleware, async (req, res) => {
    
    const userId = req.user.id; // This is your user ID from the token
    const user= await User.findById(userId)
   
    
    const { id } = req.params;
     const { amountPaid, paymentMode, paymentDate } = req.body.payment;
   
     try {
       const member = await Member.findById(id);
       if (!member){
         return res.status(404).send("Member not found.");
       }
       const newPayment = new Payment({
         memberId: id,
         amountPaid,
         paymentMode,
         paymentDate,
       });
   
       const savedPayment = await newPayment.save();
   
       member.payments.push(savedPayment._id);
       member.status = "Active";
       member.leftDate ="";
       await member.save();
       // ✅ Instead of rendering, redirect to the GET receipt route
       res.redirect(`/user/payment-receipt/${savedPayment._id}`);
     } catch (error) {
       console.error("Error adding payment:", error);
       res.status(500).send("Internal Server Error");
     }
   });


   router.get("/payment-receipt/:paymentId",jwtAuthMiddleware, async (req, res) => {
     const { paymentId } = req.params;
   
     const userId = req.user.id; // This is your user ID from the token
     const user= await User.findById(userId)
   
     try {
       const payment = await Payment.findById(paymentId);
       if (!payment) {
         return res.status(404).send("Payment not found.");
       }
   
       const member = await Member.findById(payment.memberId);
       if (!member) {
         return res.status(404).send("Member not found.");
       }
   
       // ✅ Render Payment Receipt Page from GET Route
       res.render("payments/paymentreciept.ejs", {
         member,
         payment,
         user
       });
     } catch (error) {
       console.error("Error loading payment receipt:", error);
       res.status(500).send("Internal Server Error");
     }
   });
   
   // SEARCH MEMBER /////////////////////////////////////////////////////////////////////////
   
   // Route to handle search by mobile or name
   router.post("/member/search",jwtAuthMiddleware, async (req, res) => {
     try {
       let searchQuery = req.body.name; // Taking input from request
    
       const userId = req.user.id; // This is your user ID from the token
       const user= await User.findById(userId)
       
       //✅ Search by name or mobile number + filter by user ID
       const members = await Member.find({
         user: userId,
         $or: [
           { name: { $regex: searchQuery, $options: "i" } }, // Search by Name (Case-insensitive)
           { mobileNo: searchQuery } // Search by Mobile Number (Exact Match)
         ]
       }).populate('payments');
     
       // If no matching member is found
       if (members.length === 0) {
         return res.render("showPage/memberData/searchedNotFoundMember.ejs", { user: user,
           errorMessage: "Member NOT FOUND" 
         });
       }
   
       // If member(s) found, render the search results page
       res.render("showPage/memberData/searchedMember.ejs", { allMembers: members ,user});
   
     } catch (error) {
       console.error("Error searching for member:", error);
   
       if (error.code === 11000) {
         res.status(400).send("Error: Duplicate entry detected. Please ensure unique values for unique fields.");
       } else if (error.name === "ValidationError") {
         res.status(400).send("Validation Error: " + error.message);
       } else {
         res.status(500).send("An unexpected error occurred. Please try again later.");
       }
     }
   });
     
   // PAYMENT STRUCTURE
   
   // SHOW ALL FEES RECORDR TO allrecords.ejs
 router.get("/allfeesrecords", jwtAuthMiddleware,async (req, res) => {
     try {
        
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
      
       const allMembers = await Member.find({user:userId})
         .populate("payments") // Populate payment details
         .exec();
   
       const membersWithFees = allMembers.map((member) => {
         // Sum of all roomFees from payments
         const totalFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);
   
         // Sum of all amountPaid from payments
         const amountPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
   
         // Calculate dueAmount based on totalFees
         const dueAmount = amountPaid >= totalFees ? 0 : totalFees - amountPaid;
         const advancedPaid = amountPaid > totalFees ? amountPaid - totalFees : 0;
   
         return {
           ...member.toObject(),
           totalFees,
           advancedPaid,
           amountPaid,
           dueAmount,
         };
       });
       
       res.render("payments/allrecords.ejs", { allMembers: membersWithFees ,user});
     } catch (err) {
       console.error("Error fetching records:", err);
       res.status(500).send("Internal Server Error");
     }
   });
   
   // search fees record of member
   // SEARCH FEES RECORDS BASED ON MEMBER NAME OR MOBILE NUMBER
 router.post("/searchfeesrecords",jwtAuthMiddleware, async (req, res) =>{
     try {
         
        const userId = req.user.id; // This is your user ID from the token
        const user= await User.findById(userId)
      
       const searchQuery = req.body.searchQuery; // input from form (name or mobile number)
       const filteredMembers = await Member.find({ 
        user: req.user.id, // Filter by userId
        $or: [
          { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive name search
          { mobileNo: searchQuery } // Exact match for mobile number
        ]
      }).populate("payments");
      
       const membersWithFees = filteredMembers.map((member) => {
         // Calculate totalFees (sum of roomFees)
         const totalFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);
   
         // Calculate amountPaid (sum of amountPaid)
         const amountPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
   
         // Calculate dueAmount and advancedPaid
         const dueAmount = amountPaid >= totalFees ? 0 : totalFees - amountPaid;
         const advancedPaid = amountPaid > totalFees ? amountPaid - totalFees : 0;
   
         return {
           ...member.toObject(),
           totalFees,
           advancedPaid,
           amountPaid,
           dueAmount,
         };
       });
   
       if (membersWithFees.length === 0) {
         return res.render("payments/allrecordsNotFound.ejs", {
           allMembers: [],
           errorMessage: "No records found for the search query.",
           user,
         });
       }
   
       res.render("payments/allrecords.ejs", {
         allMembers: membersWithFees,
         errorMessage: null,
         user
       });
     } catch (err) {
       console.error("Error searching fee records:", err);
       res.status(500).send("Internal Server Error");
     }
   });
   
   
   /////////////////////////////////////////////////////////////////////////////
   ////////////////////////////////////////////////////////////////////////////////////////////
   router.get('/payment-history/:memberId',jwtAuthMiddleware, async (req, res) => {
     const memberId = req.params.memberId;
     
     const userId = req.user.id; // This is your user ID from the token
     const user= await User.findById(userId)

     
     try {
       const member = await Member.findById(memberId);
       const payments = await Payment.find({ memberId }).sort({ paymentDate: -1 });
       res.render('payments/PaymentHistoryOfOne.ejs', { member, payments ,user});
     } catch (err) {
       console.error(err);
       res.status(500).send('Server Error');
     }
   });
   
    
   
   // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   // UPCOMING PAYMENTS///////////////////
router.get("/upcomingPayments",jwtAuthMiddleware, async (req, res) => {
     try {
          
     const userId = req.user.id; // This is your user ID from the token
     const user= await User.findById(userId)

       const today = new Date();
       const upcomingDays = [];
   
       // Generate day numbers for the next 5 days
       for (let i = 0; i <= 5; i++) {
         const date = new Date(today);
         date.setDate(today.getDate() + i);
         upcomingDays.push(date.getDate());
       }
        
       const members = await Member.find({user:userId}).populate('payments');
   
       // Filter members whose joining day matches any of the upcoming days
       const upcomingPayments = members.filter(member => {
         const joiningDay = new Date(member.joiningDate).getDate();
         return upcomingDays.includes(joiningDay);
       });
   
       res.render("payments/upcomingPayments.ejs", { allMembers: upcomingPayments ,user});
     } catch (err) {
       console.error("Error fetching upcoming payments:", err);
       res.status(500).send("Internal Server Error");
     }
   });
   
   //SHOW DUE AMOUNT//////////////////////////////////////
   router.get("/deureports",jwtAuthMiddleware,async(req,res)=>{
    
   try {
      
    const userId = req.user.id; // This is your user ID from the token
    const user= await User.findById(userId)

     const allMembers = await Member.find({user:userId})
       .populate("payments") // Populate payment details
       .exec();
   
     const membersWithFees = allMembers.map((member) => {
       // Sum of all roomFees from payments
       const totalFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);
   
       // Sum of all amountPaid from payments
       const amountPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
   
       // Calculate dueAmount based on totalFees
       const dueAmount = amountPaid >= totalFees ? 0 : totalFees - amountPaid;
       const advancedPaid = amountPaid > totalFees ? amountPaid - totalFees : 0;

       return {
         ...member.toObject(),
         totalFees,
         advancedPaid,
         amountPaid,
         dueAmount,
       };
     });
   
     res.render("payments/duesReport.ejs", { allMembers: membersWithFees,user });
   } catch (err) {
     console.error("Error fetching records:", err);
     res.status(500).send("Internal Server Error");
   }
   
   })
   
   
  

//Revenue///////////////////////////////////////const express = require('express');
  
    
// =================== REVENUE ROUTE ===================
router.get("/revenue", jwtAuthMiddleware, async (req, res) =>{
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        // ✅ Step 1: Find all members associated with the logged-in user
        const allMembers = await Member.find({ user: userId })
            .populate("payments")
            .exec();

        // ✅ Handle case if no members exist
        if (allMembers.length === 0) {
            return res.render("payments/revenue", {
                totalExpectedRevenue: 0,
                totalFeesCollected: 0,
                totalPendingAmount: 0,
                totalAdvancedPaid: 0,
                balance: 0,
                paidAccounts: 0,
                dueAccounts: 0,
                feesCollectionCompleted: 0,
                user
            });
        }

        // ✅ Step 2: Calculate revenue data dynamically from payments
        const membersWithFees = allMembers.map((member) => {
            // ✅ Calculate Total Fees (Room Fees)
            const totalFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);

            // ✅ Calculate Total Amount Paid
            const amountPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

            // ✅ Calculate Due Amount (if amount paid < total fees)
            const dueAmount = totalFees - amountPaid;

            // ✅ Calculate Advanced Paid (if amount paid > total fees)
            const advancedPaid = amountPaid > totalFees ? amountPaid - totalFees : 0;

            return {
                totalFees,
                amountPaid,
                dueAmount,
                advancedPaid
            };
        });

        // ✅ Step 3: Calculate Overall Revenue Data
        const totalExpectedRevenue = membersWithFees.reduce((sum, member) => sum + member.totalFees, 0);
        const totalFeesCollected = membersWithFees.reduce((sum, member) => sum + member.amountPaid, 0);
        const totalPendingAmount = membersWithFees.reduce((sum, member) => sum + member.dueAmount, 0);
        const totalAdvancedPaid = membersWithFees.reduce((sum, member) => sum + member.advancedPaid, 0);

        // ✅ Calculate Balance (Expected - Collected)
        const balance = totalExpectedRevenue - totalFeesCollected;

        // ✅ Calculate Collection Percentage
        let feesCollectionCompleted = totalExpectedRevenue > 0
            ? ((totalFeesCollected / totalExpectedRevenue) * 100).toFixed(2)
            : 0;

        // ✅ Count Paid & Due Accounts
        let paidAccounts = 0;
        let dueAccounts = 0;
        allMembers.forEach(member => {
            const totalMemberFees = member.payments.reduce((sum, payment) => sum + (payment.roomFees || 0), 0);
            const totalMemberPaid = member.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);

            if (totalMemberPaid >= totalMemberFees) {
                paidAccounts++;
            } else {
                dueAccounts++;
            }
        });

        // ✅ Format Numbers in Indian Currency without Decimal (.00)
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat("en-IN", {
                minimumFractionDigits: 0,   // ✅ Removed .00 (No decimal)
                maximumFractionDigits: 0    // ✅ Removed .00 (No decimal)
            }).format(amount);
        };

        // ✅ Step 8: Render the Revenue Page
        res.render("payments/revenue", {
            totalExpectedRevenue: formatCurrency(totalExpectedRevenue),
            totalFeesCollected: formatCurrency(totalFeesCollected),
            totalPendingAmount: formatCurrency(totalPendingAmount),
            totalAdvancedPaid: formatCurrency(totalAdvancedPaid),
            balance: formatCurrency(balance),
            paidAccounts,
            dueAccounts,
            feesCollectionCompleted,
            user
        });

    } catch (error) {
        console.log("Error in Revenue Route:", error);
        res.status(500).send("Server Error");
    }
});
 
/////Log Out//////route
    router.get("/logout",jwtAuthMiddleware,(req, res) => {
        res.clearCookie("token"); // Clear the JWT token from cookies
        res.redirect("/login");   // Redirect to login page
      });
      



module.exports = router;
