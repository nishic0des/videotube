import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";
import dotenv from "dotenv";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File uploaded on cloudinary. File src:" + response.url);
    // delete after uploading
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destory(publicId);
    console.log("Deleted from Cloudinary", publicId);
  } catch (error) {
    console.log("Error deleting from Cloudinary", error);
    return null;
  }
};

const deleteOnCloudinaryImage = async (oldFilePublicId) => {
  try {
    if (!oldFilePublicId) return null;
    // delete the file on cloudinary.
    const public_id = oldFilePublicId.split("/").pop().split(".")[0];
    const response = await cloudinary.uploader.destroy(public_id, {
      invalidate: true,
      resource_type: "raw",
    });
    console.log(
      "File deleted on cloudinary",
      oldFilePublicId,
      "public_id",
      public_id
    );
    return response;
  } catch (error) {
    return error;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary, deleteOnCloudinaryImage };
