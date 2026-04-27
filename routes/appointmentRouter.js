// import { requireAuth } from "@clerk/clerk-sdk-node";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import express from "express";
import {
  cancelAppointment,
  confirmPayment,
  createAppointment,
  getAppointment,
  getAppointmentByPatient,
  getAppointmentsByDoctor,
  getRegisteredUserCount,
  getStats,
  updateAppointmment,
} from "../controllers/appointmentController.js";
const appointmentRouter = express.Router();
appointmentRouter.get("/", getAppointment);
appointmentRouter.get("/confirm", confirmPayment);
appointmentRouter.get("/stats/summary", getStats);

//auth routes
appointmentRouter.post(
  "/",
  clerkMiddleware(),
  requireAuth(),
  createAppointment,
);
appointmentRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getAppointmentByPatient,
);
appointmentRouter.get("/doctor/:doctorId", getAppointmentsByDoctor);
appointmentRouter.get("/paitents/count", getRegisteredUserCount);
appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.put("/:id", updateAppointmment);
export default appointmentRouter;
