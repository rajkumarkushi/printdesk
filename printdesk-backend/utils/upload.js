const multer = require("multer");
const path = require("path");

const LOGO_DIR = path.join(__dirname, "..", "uploads", "logos");
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

const createLogoUpload = (filenameFn) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, LOGO_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${filenameFn(req)}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only PNG and JPG logos are supported"));
      }
    },
  });
};

module.exports = { createLogoUpload };
