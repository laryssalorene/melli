// scripts/routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth'); 

console.log("ContentController imported in routes:", Object.keys(contentController)); 

// ======================================================================================
// ROTAS DE CONTEÚDO (MÓDULOS, UNIDADES, QUESTÕES E PROGRESSO)
// ======================================================================================

router.get('/modules', verifyToken, contentController.getAllModules);
router.get('/modulo/:id', verifyToken, contentController.getModuleById); 
router.get('/modulo/:id/units', verifyToken, contentController.getUnitsByModuleId); 

// Rota para obter detalhes de uma unidade específica
// MUDADO: parâmetro de ':id' para ':id_unidade' para consistência
router.get('/unidade/:id_unidade', verifyToken, contentController.getUnitById); // <--- MUDANÇA AQUI

// Rota para obter APENAS as questões de uma unidade específica (já estava correta no parâmetro)
router.get('/unidade/:id_unidade/questions', verifyToken, contentController.getQuestionsByUnitId); 

router.get('/question/:id_questao', verifyToken, contentController.getQuestionById); 

router.post('/progress/:id_modulo/:id_unidade', verifyToken, contentController.updateUserProgress);
router.get('/progress/:id_modulo/:id_unidade', verifyToken, contentController.getUnitProgress);

module.exports = router;