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
const upload = multer({ dest: "uploads/" });
const doctorRouter = express.Router();
doctorRouter.get("/", getDoctors);
doctorRouter.post("/login", doctorLogin);
doctorRouter.get("/:id", getDoctorById);
doctorRouter.post("/", upload.single("image"), createDoctor);
doctorRouter.post("/:id/toggle-availibility", doctorAuth, toggleAvailibility);
doctorRouter.put("/:id", doctorAuth, upload.single("image"), updateDoctor);
doctorRouter.delete("/:id", deleteDoctor);
export default doctorRouter;
