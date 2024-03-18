import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from "../utils/fileUpload.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // CHECKING THE FIELDS ARE EMPTY OR NOT
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }
  // const existedUser = User.findOne({
  //     "userName":username,
  //     "email":email
  // })
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "avatar file is missing");
  }
  const avatar = fileUploadOnCloudinary(avatarLocalPath);
  const coverImage = fileUploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "avatar is missing");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.totoLowerCase(),
  })
  //removing pw and refresh token when user is created
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new apiError(500, "Something went wrong while registering user")
  }
return res.status(201).json(new apiResponse(200,createdUser,"User registration done"))
})


export { registerUser };
