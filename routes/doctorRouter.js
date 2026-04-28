import express from "express";
import multer from "multer";
import {
  createDoctor,
  deleteDoctor,
  doctorLogin,
  getDoctorById,
  getDoctors,
  toggleAvailibility,
  updateDoctor,
} from "../controllers/doctorController.js";
import doctorAuth from "../middlewares/doctorAuth.js";
// const upload = multer({ dest: "uploads/" });
import upload from "../middlewares/multer.js";
const doctorRouter = express.Router();
doctorRouter.get("/", getDoctors);
doctorRouter.post("/login", doctorLogin);
doctorRouter.get("/:id", getDoctorById);
doctorRouter.post("/", upload.single("image"), createDoctor);
doctorRouter.post("/:id/toggle-availibility", doctorAuth, toggleAvailibility);
doctorRouter.put("/:id", doctorAuth, upload.single("image"), updateDoctor);
doctorRouter.put(
  "/:id",
  doctorAuth,
  (req, res, next) => {
    upload.single("image")(req, res, function (err) {
      if (err) {
        console.error("🔥 MULTER ERROR:", err);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  updateDoctor,
);
doctorRouter.delete("/:id", deleteDoctor);
export default doctorRouter;
