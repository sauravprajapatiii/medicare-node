import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const uploadToCloudinary = async (filePath, folder = "doctors") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    console.error("cloudinary error", error);
  }
};
export async function deleteFromCloudinary(publicId) {
  try {
    if (!publicId) {
      return;
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("cloudinary delete error:", error);
  }
}
export default cloudinary;
