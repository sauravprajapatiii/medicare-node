import multer from "multer";
import path from "path";
import fs from "fs";
const uploadDir = uploads;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
} //ensures folder exists

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
//file filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(new Error("only image file are allowed"), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fieldSize: 5 * 1024 * 1024,
  },
});
export default upload;
