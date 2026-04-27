import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.js";
const JWT_SECRET = process.env.JWT_SECRET;
export default async function doctorAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Doctor not authorized ,token missing",
    });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role && payload.role !== "doctor") {
      return res.status(403).jaon({
        success: false,
        message: "Access diened",
      });
    }
    const doctor = await Doctor.findById(payload.id).select("-password");
    if (!doctor)
      return res
        .status(401)
        .json({ success: false, message: "Doctor not found" });

    req.doctor = doctor;
    next();
  } catch (error) {
    console.error("Doctor JWT verification failed.", error);
    return res.status(401).json({
      success: false,
      message: "token invalid or missing",
    });
  }
}
