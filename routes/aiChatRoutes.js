const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const {saveChatInstance, getAllInstances, getChatInstance, deleteChatInstance, uploadAIFile,getChatHistory,chat} = require('../controllers/aiChatController');
const multer = require('multer');

// Error handling middleware
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
  
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
  });

router.post('/', saveChatInstance);
 router.get('/', getAllInstances);
 router.get('/:id', getChatInstance);
 router.delete('/:id', asyncHandler(deleteChatInstance));
 router.post('/:id/upload', upload.single('file'), asyncHandler(uploadAIFile));
 router.get('/:id/history', asyncHandler(getChatHistory));
 router.post('/:id/chat', chat);
// router.post('/:id/history', aiChatController.history);
// router.post('/:id/documents', aiChatController.verifydocuments);

module.exports = router;