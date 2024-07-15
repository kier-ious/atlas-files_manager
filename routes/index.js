const express = require('express');
const AuthController = require('../controllers/AuthController');
const UsersController = require('../controllers/UsersController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();

// Users routes
router.post('/users', UsersController.postNew);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

// Files routes
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getFileById);
router.get('/files', FilesController.getFiles);

module.exports = router;
