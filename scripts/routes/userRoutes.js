// scripts/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth'); // Importe o middleware de autenticação

// =======================================================
// ROTAS DE AUTENTICAÇÃO E REGISTRO
// =======================================================

// Rota para registrar um novo usuário
// POST /api/users/register
router.post('/register', userController.register);

// Rota para login de usuário
// POST /api/users/login
router.post('/login', userController.login);

// =======================================================
// ROTAS DE REDEFINIÇÃO DE SENHA (NOVAS)
// =======================================================

// Rota para solicitar o link de redefinição de senha
// POST /api/users/forgot-password
router.post('/forgot-password', userController.requestPasswordReset);

// Rota para redefinir a senha usando o token recebido no e-mail
// POST /api/users/reset-password/:token
router.post('/reset-password/:token', userController.resetPassword);

// =======================================================
// ROTAS DE PERFIL DE USUÁRIO (PROTEGIDAS)
// =======================================================

// Rota para obter o perfil do usuário logado
// GET /api/users/profile
// Esta rota é protegida pelo middleware verifyToken
router.get('/profile', verifyToken, userController.getProfile);

// NOVA ROTA: Obter ranking de usuários
// GET /api/users/ranking
// Esta rota também será protegida, pois só usuários logados devem ver o ranking
router.get('/ranking', verifyToken, userController.getRanking); // <--- ADICIONE ESTA LINHA

module.exports = router;