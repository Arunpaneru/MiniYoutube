import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { apiError } from "./apiError";

//CLOUDINARY CONFIGURATION
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//UPLOADING FILE TO CLOUDINARY
const fileUploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "file path doesn't exist";
    //FILE UPLOADING
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("the response of cloudinary after uploading file is:",response)
    //FILE UPLOADING DONE
    // console.log("file is uploaded sucessfully on the cloudinary.the response url is",response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    //REMOVING THE TEMPORARILYSTORED FILE WHILE FILE UPLOAD GET FAILED
    fs.unlinkSync(localFilePath);
  }
};

const filedeleteFromCloudinary = async(deleting_id,resourcetype ="image") =>{
  try {
    if(!deleting_id){
      throw apiError(400,"id for deletion is empty")
    }
    await cloudinary.uploader.destroy(deleting_id,{
      resource_type:resourcetype
    })

  } catch (error) {
    throw apiError(404,"error occured during deletion of old file from cloudinary")
  }
}
export { fileUploadOnCloudinary,filedeleteFromCloudinarydeleteFromCloudinary };
