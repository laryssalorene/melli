// scripts/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth'); // Importe o middleware de autenticação (CORRETO)

// REMOVA as rotas de register e login daqui, elas pertencem a authRoutes.js

// =======================================================
// ROTAS DE REDEFINIÇÃO DE SENHA
// =======================================================

router.post('/forgot-password', userController.requestPasswordReset); // Usando forgot-password para ser mais claro
router.post('/reset-password/:token', userController.resetPassword); // Token na URL, usando o controller correto

// Rota de recuperação de nickname
router.post('/recover-nickname', userController.requestNicknameRecovery);

// =======================================================
// ROTAS DE PERFIL DE USUÁRIO (PROTEGIDAS)
// =======================================================

router.get('/profile', verifyToken, userController.getProfile);
router.get('/ranking', verifyToken, userController.getRanking); 
router.put('/profile', verifyToken, userController.updateProfile);
router.delete('/account', verifyToken, userController.deleteAccount);


module.exports = router;