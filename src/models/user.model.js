import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Fullname is required"],
      trim: true,
      index: true,
    },

    avatar: {
      type: String, //cloudinary url
      required: true,
    },

    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "video",
      },
    ],

    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
//this method hash the password using bcrypt just before saving data to db
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
   this.password = await bcrypt.hash(this.password, 10);
  next();
});
//this function compares the password and the encrypted pw using the bcrypt
userSchema.methods.isPasswordCorrect= async function (password){
   return await bcrypt.compare(password,this.password)
}
//this method generates the ACCESS_TOKEN
userSchema.methods.generateAccessToken = function (){
 return jwt.sign({
    _id:this._id,
    email:this.email,
    userName:this.fullname,
    fullName:this.fullName
  },process.env.ACCESS_TOKEN_SECRET,
  {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
  })
}
//this method generates the REFRESH_TOKEN
userSchema.methods.generateRefreshToken= function (){
  return jwt.sign({
    _id:this._id,

  },
  process.env.REFRESJ_TOKEN_SECRET,
  {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  })
}
export const User = mongoose.model("User", userSchema);
