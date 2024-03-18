import {v2 as cloudinary} from 'cloudinary';
import fs from"fs"

 //CLOUDINARY CONFIGURATION         
cloudinary.config({ 
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
  api_key:process.env.CLOUDINARY_API_KEY , 
  api_secret:process.env.CLOUDINARY_API_SECRET,
});
//UPLOADING FILE TO CLOUDINARY
const fileUploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return "file path doesn't exist"
        //FILE UPLOADING 
       const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //FILE UPLOADING DONE
        console.log("file is uploaded sucessfully on the cloudinary.the response url is",response.url);
        return response;
        
    } catch (error) {
        //REMOVING THE TEMPORARILYSTORED FILE WHILE FILE UPLOAD GET FAILED
       fs.unlinkSync(localFilePath) 
    }
}