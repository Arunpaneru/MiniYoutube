import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from "../utils/fileUpload.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

//Function that calls access token generation and refresh token generation methods
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // console.log("access token obtained is",accessToken)
    // console.log("access token obtained is",refreshToken)

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, "something went wrong in token generation");
  }
};
// USER REGISTRATION

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  // CHECKING THE FIELDS ARE EMPTY OR NOT

  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }
  // const existedUser = User.findOne({
  //     "userName":username,
  //     "email":email
  // })
  //checking existeduser based on username and email

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "avatar file is missing");
  }
  const avatar = await fileUploadOnCloudinary(avatarLocalPath);
  const coverImage = await fileUploadOnCloudinary(coverImageLocalPath);

  // console.log("avatar response is",avatar);
  // console.log("coverImage response is",coverImage);

  if (!avatar) {
    throw new apiError(400, "avatar is missing");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  //removing pw and refresh token when user is created

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registration done"));
});

//USER LOGIN

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  if (!(userName || email)) {
    throw new apiError(400, "username or email required");
  }
  //finding user based on username or email

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new apiError(404, "user does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "invalid user credentidals");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //options for cookies
  //this makes cookies modifiable from server only i.e httpOnly and secure

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "login sucessful"
      )
    );
});

//USER LOGOUT

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "user logged out"));
});

//RefreshingAccessToken

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw apiError(401, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh Token");
    }

    if (incommingRefreshToken !== user?.refreshToken) {
      throw new apiError("refresh access token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new apiResponse(
          200,
          { accessToken, newRefreshToken },
          "access token refreshed Sucessfully"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "invalid refresh token");
  }
});

//password change
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(401, "Incorrect old password ");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new apiResponse(200, {}, "password changed"));
});

//getting current user

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json( new apiResponse(200, req.user, "current user fetched sucessfully"));
});

//update textbased data

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, userName, email } = await req.body;

  if (!fullName || !userName || !email) {
    throw new apiError(400, "all fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        userName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new apiResponse(200, user, "accountDetails updated sucessfully"));
});

//updating files data
const updateAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalPath = await req.files?.path

   if(!avatarLocalPath)
   {
    throw new apiError(400,"avatar file is required")
   }
   const avatar = await fileUploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
throw new apiError(400,"during avatar updation error occured while uploading avatar")
   }

   const user = await User.findByIdAndUpdate(req.user._id,{
    $set:{
      avatar:avatar.url
    }
   },
  {
    new:true
  }
  ).select("-password")
return res.status(200).json( new apiResponse(200,user,"avatar updated sucessfully"))
}) 
//update coverImage
const updateCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = await req.files?.path

  if(!coverImageLocalPath)
  {
   throw new apiError(400,"coverImage file is required")
  }
  const coverImage = await fileUploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
throw new apiError(400,"during coverImage updation error occured while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(req.user._id,{
   $set:{
    coverImage:coverImage.url
   }
  },
 {
   new:true
 }
 ).select("-password")
return res.status(200).json(new apiResponse(200,user,"coverImage updated sucessfully"))
}) 

//getting user profile
const getUserChannelProfile = asyncHandler(async(req,res) => {
  const {userName} = req.params

  if(!userName?.trim()){
    throw new apiError(400,"username is missing")
  }

 const channel = await User.aggregate([{$match:{
  userName: userName?.toLowerCase()
 }},{
  $lookup:{
    from: "subscriptions",
    localField: "_id",
    foreignField:"channel",
    as:"subscribers"
  }
 }, 
{
  $lookup:{
    from : "subscriptions",
    localField: "_id",
    foreignField:"subscriber",
    as:"subscribedTo"
  }
},
{
  $addFields : {
    subcribersCount:{
          $size:"$subscribers"
    },
    
      channelSubscribedToCount : {
        $size : "subscribedTo"
      },
      isSubscribed:{
        $cond : {
          if : {$in:[req.user?._id ,"$subscribers.subscriber"]},
          then:true,
          else:false
        }
      }
    
  }
},{
  $project:{
    fullName:1,
    userName:1,
    email:1,
    subcribersCount:1,
    channelSubscribedToCount:1,
    avatar:1,
    coverImage:1
  }
}
])
if(!channel?.length){
  throw new apiError(404,"channel does not exist")
}
return res.status(200).json(new apiResponse(200,channel[0],"User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) => {
  const user = await User.aggregate([
    {
      $match:{
        _id: new mongooseAggregatePaginate.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from: "videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from: "users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    userName:1,
                    avatar:1
                  }
                },
                {
                  $addFields:{
                    owner:{
                      $first:"$owner"
                    }
                  }
                }
              ]

            }
          }
        ]
      }
    },
  ]) 
  return res.status(200).json(apiResponse(200,user[0].watchHistory,"watchHistory fetched sucessfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
