// scripts/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // NOVO: Seu controlador de autenticação

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
