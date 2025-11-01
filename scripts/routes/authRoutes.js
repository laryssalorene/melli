// scripts/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Importa SOMENTE o authController. O verifyToken não pertence aqui.
const { authController } = require('../controllers/authController'); 

// Rotas de autenticação (register e login)
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;