import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "easylease-secret-key-change-in-production";

// Middleware to verify JWT token
export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Middleware to check if user is manager (admin)
export const isManager = (req, res, next) => {
  if (req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Manager role required.",
    });
  }

  next();
};

// Middleware to check if user is owner
export const isOwner = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Owner role required.",
    });
  }

  next();
};

// Middleware to check if user is tenant
export const isTenant = (req, res, next) => {
  if (req.user.role !== "tenant") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Tenant role required.",
    });
  }

  next();
};

// Middleware to check if user is manager or owner
export const isManagerOrOwner = (req, res, next) => {
  if (!["manager", "owner"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Manager or Owner role required.",
    });
  }

  next();
};

// Middleware to check if user is admin or accessing their own data
export const isAdminOrOwner = (req, res, next) => {
  const requestedUserId = req.params.id;

  if (req.user.role === "admin" || req.user.id === requestedUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied",
  });
};
