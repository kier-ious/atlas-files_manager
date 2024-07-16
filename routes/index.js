const express = require('express');
const AuthController = require('../controllers/AuthController');
const UsersController = require('../controllers/UsersController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

// Users routes
router.post('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

// Files routes
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getFileById);
router.get('/files', FilesController.getFiles);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFileData);

module.exports = router;
