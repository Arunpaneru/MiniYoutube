// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({path:'./env'})

connectDB()
.then(()=>{

    app.on("error",(err)=>{
        console.log("Error:",err);
    })
    app.listen(process.env.PORT || 4000,()=>{
        console.log(`server is running at :${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed",err)
})