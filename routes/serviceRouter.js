import express from "express";
import multer from "multer";
import {
  createService,
  deleteService,
  getServiceByid,
  getServices,
  updateService,
} from "../controllers/serviceController.js";
const upload = multer({ dest: "/temp" });
const serviceRouter = express.Router();
serviceRouter.get("/", getServices);
serviceRouter.post("/", upload.single("image"), createService);

serviceRouter.get("/:id", getServiceByid);
serviceRouter.put("/:id", upload.single("image"), updateService);
serviceRouter.delete("/:id", deleteService);
export default serviceRouter;
