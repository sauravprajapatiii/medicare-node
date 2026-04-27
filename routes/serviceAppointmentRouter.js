import { clerkMiddleware, requireAuth } from "@clerk/express";
import express from "express";
import {
  cancelServiceAppointment,
  confirmServicePayment,
  createServiceAppointment,
  getServiceAppointmentById,
  getServiceAppointments,
  getServiceAppointmentsByPaitents,
  getServiceAppointmentStats,
  updateServiceAppointment,
} from "../controllers/serviceAppointmentController.js";
const serviceAppointmentRouter = express.Router();
serviceAppointmentRouter.get("/", getServiceAppointments);
serviceAppointmentRouter.get("/confirm", confirmServicePayment);
serviceAppointmentRouter.get("/stats/summary", getServiceAppointmentStats);

//auth

serviceAppointmentRouter.post(
  "/",
  clerkMiddleware(),
  requireAuth(),
  createServiceAppointment,
);
serviceAppointmentRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getServiceAppointmentsByPaitents,
);
serviceAppointmentRouter.get("/:id", getServiceAppointmentById);
serviceAppointmentRouter.put("/:id", updateServiceAppointment);
serviceAppointmentRouter.post("/:id/cancel", cancelServiceAppointment);
export default serviceAppointmentRouter;
