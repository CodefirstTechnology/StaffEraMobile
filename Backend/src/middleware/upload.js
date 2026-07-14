const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

const uploadDir = path.join(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const isImage = allowedImageTypes.test(file.mimetype) || 
                  (file.mimetype.startsWith("image/") && allowedImageTypes.test(file.originalname.toLowerCase()));

  if (file.fieldname === "profilePhoto") {
    if (isImage && !file.mimetype.includes("gif")) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Profile photo must be a JPG, JPEG or PNG image"), false);
    }
  } else if (file.fieldname === "idProof") {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "ID proof must be a JPG, JPEG, PNG image or a PDF document"), false);
    }
  } else {
    if (isImage) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only image files are allowed"), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
