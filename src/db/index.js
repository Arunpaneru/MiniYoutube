import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB= async()=>{
try {
 const connectedInstance= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)  
 console.log(`\n MOngoDB connected !!DB HOST:${connectedInstance.connection.host}`)
} catch (error) {
    console.error ("MONGODB Database connection error",error)
    process.exit(1)
}
}

export default connectDB;