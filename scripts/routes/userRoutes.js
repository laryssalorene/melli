// scripts/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth'); // Importe o middleware de autenticação

// Rota para obter o perfil do usuário logado
// Esta rota estará em /api/users/profile (devido ao app.use('/api/users', userRoutes) no server.js)
// E ela é protegida pelo middleware verifyToken
router.get('/profile', verifyToken, userController.getProfile);

// Você pode adicionar outras rotas de usuário aqui, por exemplo:
// router.put('/profile', verifyToken, userController.updateProfile); // Exemplo de atualização de perfil

module.exports = router;