// scripts/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Caminho CORRIGIDO: '../controllers/'

// Rota para registro de novo usuário
router.post('/register', authController.register);

// Rota para login de usuário existente
router.post('/login', authController.login);

module.exports = router;