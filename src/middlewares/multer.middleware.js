import multer from "multer";
//storage CONTAINS VALUE RETURNED BY CALLBACK FUNCTION cb . 
//cb RETURNS THE COMPLETE LOCAL FILE PATH
const storage = multer.diskStorage({
  //ALL THE INFO SUCH AS HEADER,JSON DATA. BUT JSONDATA  DOESN'T CONTAIN FILE 
  //.FILE WILL BE RECEIVE IN file.
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });
