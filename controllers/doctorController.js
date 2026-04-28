import mongoose from "mongoose";
import Doctor from "../models/doctor.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + (mm || 0);
};

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule).forEach(([date, slots]) => {
    if (!Array.isArray(slots)) return;
    const uniq = Array.from(new Set(slots));
    uniq.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    out[date] = uniq;
  });
  return out;
}

function parseScheduleInput(s) {
  if (!s) return {};
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return {};
    }
  }
  return dedupeAndSortSchedule(s || {});
}

function normalizeDocForClient(raw = {}) {
  const doc = { ...raw };

  // convert Mongoose Map to plain object
  if (doc.schedule && typeof doc.schedule.forEach === "function") {
    const obj = {};
    doc.schedule.forEach((val, key) => {
      obj[key] = Array.isArray(val) ? val : [];
    });
    doc.schedule = obj;
  } else if (!doc.schedule || typeof doc.schedule !== "object") {
    doc.schedule = {};
  }

  doc.availability =
    doc.availability === undefined ? "Available" : doc.availability;
  doc.patients = doc.patients ?? "";
  doc.rating = doc.rating ?? 0;
  doc.fee = doc.fee ?? doc.fees ?? 0;

  return doc;
}

//create doctor
export async function createDoctor(req, res) {
  try {
    const { name, password, email } = req.body;
    const body = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "all fields are required",
      });
    }
    const emailLC = (email || "").toLowerCase();
    if (await Doctor.findOne({ email: emailLC })) {
      return res.status(409).json({
        success: false,
        message: "email already in use ",
      });
    }
    let imageUrl = req.body.imageUrl || null;
    let imagePublicId = req.body.imagePublicId || null;
    if (req.file?.path) {
      try {
        const uploaded = await uploadToCloudinary(req.file.path, "doctors");

        if (!uploaded) {
          throw new Error("Cloudinary upload failed");
        }

        existing.imageUrl =
          uploaded.secure_url || uploaded.url || existing.imageUrl;

        existing.imagePublicId =
          uploaded.public_id || uploaded.publicId || existing.imagePublicId;
      } catch (err) {
        console.error("🔥 CLOUDINARY ERROR:", err);
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
        });
      }
    }
    // const schedule = parseScheduleInput(req.body.schedule);
    if (body.schedule !== undefined) {
      try {
        existing.schedule = parseScheduleInput(body.schedule);
      } catch (e) {
        console.error("🔥 schedule error:", e);
        return res.status(400).json({
          success: false,
          message: "Invalid schedule format",
        });
      }
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const doc = new Doctor({
      email: emailLC,
      password: hashedpassword,
      name: body.name,
      specialization: body.specialization || "",
      imageUrl,
      imagePublicId,
      availability: body.availability || "Available",
      experience: body.experience || "",
      qualifications: body.qualifications || "",
      location: body.location || "",
      about: body.about || "",
      fee: body.fee !== undefined ? Number(body.fee) : 0,
      schedule,
      success: body.success || "",
      patients: body.patients || "",
      rating: body.rating !== undefined ? Number(body.rating) : 0,
    });
    await doc.save();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn("JWT secret is not defined");
      return res.status(500).json({
        success: false,
        message: "server misconfigured",
      });
    }
    const token = jwt.sign(
      {
        id: doc._id.toString(),
        email: doc.email,
        role: "doctor",
      },
      secret,
      { expiresIn: "7d" },
    );
    const out = normalizeDocForClient(doc.toObject());
    delete out.password;
    return res.status(201).json({
      success: true,
      data: out,
      token,
    });
  } catch (error) {
    console.log("create doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

//to get doctor
export const getDoctors = async (req, res) => {
  try {
    const { q = "", limit: limitRaw = 200, page: pageRaw = 1 } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 200));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const match = {};
    if (q && typeof q === "string" && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      match.$or = [
        { name: re },
        { specialization: re },
        { speciality: re },
        { email: re },
      ];
    }

    const docs = await Doctor.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments",
        },
      },
      {
        $addFields: {
          appointmentsTotal: { $size: "$appointments" },
          appointmentsCompleted: {
            $size: {
              $filter: {
                input: "$appointments",
                as: "a",
                cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] },
              },
            },
          },
          appointmentsCanceled: {
            $size: {
              $filter: {
                input: "$appointments",
                as: "a",
                cond: { $eq: ["$$a.status", "Canceled"] },
              },
            },
          },
          earnings: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$appointments",
                    as: "a",
                    cond: { $in: ["$$a.status", ["Confirmed", "Completed"]] },
                  },
                },
                as: "p",
                in: { $ifNull: ["$$p.fees", 0] },
              },
            },
          },
        },
      },
      { $project: { appointments: 0 } },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const normalized = docs.map((d) => ({
      _id: d._id,
      id: d._id,
      name: d.name || "",
      specialization: d.specialization || d.speciality || "",
      fee: d.fee ?? d.fees ?? d.consultationFee ?? 0,
      imageUrl: d.imageUrl || d.image || d.avatar || null,
      appointmentsTotal: d.appointmentsTotal || 0,
      appointmentsCompleted: d.appointmentsCompleted || 0,
      appointmentsCanceled: d.appointmentsCanceled || 0,
      earnings: d.earnings || 0,
      availability: d.availability ?? "Available",
      schedule: d.schedule && typeof d.schedule === "object" ? d.schedule : {},
      patients: d.patients ?? "",
      rating: d.rating ?? 0,
      about: d.about ?? "",
      experience: d.experience ?? "",
      qualifications: d.qualifications ?? "",
      location: d.location ?? "",
      success: d.success ?? "",
      raw: d,
    }));

    const total = await Doctor.countDocuments(match);
    return res.json({
      success: true,
      data: normalized,
      doctors: normalized,
      meta: { page, limit, total },
    });
  } catch (err) {
    console.error("getDoctors:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
//get doctor by id
export async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id).select("-password").lean();
    if (!doc)
      return res.status(404).json({
        success: false,
        message: "doctor not found",
      });
    return res.status(200).json({
      success: true,
      data: normalizeDocForClient(doc),
    });
  } catch (error) {
    console.error("get doctorbyId error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

//update doctor
export async function updateDoctor(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    console.log("🔥 UPDATE HIT");
    console.log("body:", req.body);
    console.log("file:", req.file);

    if (!req.doctor || String(req.doctor._id || req.doctor.id) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this doctor",
      });
    }

    const existing = await Doctor.findById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      if (uploaded) {
        const previousPublicId = existing.imagePublicId;
        existing.imageUrl =
          uploaded.secure_url || uploaded.url || existing.imageUrl;
        existing.imagePublicId =
          uploaded.public_id || uploaded.publicId || existing.imagePublicId;
        if (previousPublicId && previousPublicId !== existing.imagePublicId) {
          deleteFromCloudinary(previousPublicId).catch((e) =>
            console.warn("deleteFromCloudinary warning:", e?.message || e),
          );
        }
      }
    } else if (body.imageUrl) {
      existing.imageUrl = body.imageUrl;
    }

    // if (body.schedule) existing.schedule = parseScheduleInput(body.schedule);
    if (body.schedule !== undefined) {
      try {
        existing.schedule = parseScheduleInput(body.schedule);
      } catch (e) {
        console.error("Schedule parse error:", e);
        return res.status(400).json({
          success: false,
          message: "Invalid schedule format",
        });
      }
    }
    const updatable = [
      "name",
      "specialization",
      "experience",
      "qualifications",
      "location",
      "about",
      "fee",
      "availability",
      "success",
      "patients",
      "rating",
    ];
    // updatable.forEach((k) => {
    //   if (body[k] !== undefined) existing[k] = body[k];
    // });
    for (const k of updatable) {
      if (body[k] !== undefined) {
        if (["fee", "rating", "patients", "success"].includes(k)) {
          const num = Number(body[k]);

          if (isNaN(num)) {
            return res.status(400).json({
              success: false,
              message: `${k} must be a number`,
            });
          }

          existing[k] = num;
        } else {
          existing[k] = body[k];
        }
      }
    }
    if (body.email && body.email !== existing.email) {
      const other = await Doctor.findOne({ email: body.email.toLowerCase() });
      if (other && other._id.toString() !== id)
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      existing.email = body.email.toLowerCase();
    }
    // const hashedPass = await bcrypt.hash(body.password, 10);
    // if (body.password) existing.password = hashedPass;
    if (body.password) {
      const hashedPass = await bcrypt.hash(body.password, 10);
      existing.password = hashedPass;
    }
    await existing.save();

    const out = normalizeDocForClient(existing.toObject());
    delete out.password;
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("🔥 FULL updateDoctor ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack, // 👈 temporary (remove in production)
    });
  }
}
//to delete doctor
export async function deleteDoctor(req, res) {
  try {
    const { id } = req.params;
    const existing = await Doctor.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      if (!existing.imagePublicId) {
        try {
          await deleteFromCloudinary(existing.imagePublicId);
        } catch (error) {
          console.warn("delete doctor error:", error);
        }
      }
    }
    await Doctor.findByIdAndDelete(id);
    return res.json({ success: true, message: " Doctor Deleted Successfully" });
  } catch (err) {
    console.error("deleteDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
//to toggle availability
export async function toggleAvailibility(req, res) {
  try {
    const { id } = req.params;

    if (!req.doctor || String(req.doctor._id || req.doctor.id) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this doctor availability",
      });
    }
    const doc = await Doctor.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: "Doctor not found" });
    }
    if (typeof doc.availability === "boolean")
      doc.availability = !doctor.availability;
    else
      doc.availability =
        doc.availability === "Available" ? "Unavailable" : "Available";
    doc.save();
    // const out = normalizeDocForClient(doc.toObject());
    const out = normalizeDocForClient(existing?.toObject?.() || existing);
    delete out.password;
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("toggleAvailibilityDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// login

export async function doctorLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const doc = await Doctor.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!doc) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ✅ FIXED: compare hashed password
    const isMatch = await bcrypt.compare(password, doc.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Server misconfigured",
      });
    }

    const token = jwt.sign(
      {
        id: doc._id.toString(),
        email: doc.email,
        role: "doctor",
      },
      secret,
      { expiresIn: "7d" },
    );

    const out = doc.toObject();
    delete out.password;

    return res.json({
      success: true,
      token,
      data: out, // ✅ send cleaned data
    });
  } catch (err) {
    console.error("doctorLogin error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
