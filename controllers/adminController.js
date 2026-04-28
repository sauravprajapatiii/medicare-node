import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = await bcrypt.hash("admin123", 10);
// process.env.ADMIN_PASSWORD_HASH ||
// "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"; // hash of 'admin123'
const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "admin-jwt-secret";

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
  console.warn(
    "[ADMIN AUTH] Using default admin credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in .env for production.",
  );
}

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }
    console.log("Entered username:", username);
    console.log("Expected username:", ADMIN_USERNAME);

    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    console.log("Password match:", isMatch);
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ role: "admin", username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("adminLogin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: token missing",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: not an admin",
      });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: invalid token",
    });
  }
};
