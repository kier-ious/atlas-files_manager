const express = require('express');

const AuthController = require('../controllers/AuthController');

const UsersController = require('../controllers/UsersController');

const router = express.Router();

// Users routes
router.post('/users', UsersController.postNew);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', AuthController.getMe);

module.exports = router;
