// scripts/routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticateToken } = require('../middleware/auth');

// Rotas protegidas que exigem um token JWT válido

// Rota para obter todos os módulos com progresso do usuário (do JSON)
router.get('/modules', authenticateToken, contentController.getAllModules);

// Rota para obter detalhes de um módulo específico (com unidades e seu progresso)
router.get('/modules/:id', authenticateToken, contentController.getModuleDetails); // 'id' aqui é id_modulo

// Rota para obter as unidades de um módulo específico
// ATENÇÃO: A URL do frontend é '/modules/1/units', então a rota DEVE ser assim:
router.get('/modules/:id/units', authenticateToken, contentController.getUnitsByModuloId);

// Rota para obter os detalhes de uma unidade específica (com suas questões)
router.get('/modules/:id/units/:unitId', authenticateToken, contentController.getUnitDetails);

// Rota para marcar uma unidade como concluída e registrar pontuação
router.post('/modules/:id/units/:unitId/complete', authenticateToken, contentController.markUnitAsComplete);

module.exports = router;