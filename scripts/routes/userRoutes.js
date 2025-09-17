// scripts/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth'); // Middleware de autenticação

// Rota para buscar o perfil do usuário logado
router.get('/profile', authenticateToken, userController.getProfile);

module.exports = router;