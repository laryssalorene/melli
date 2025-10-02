const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const auth = require('../middleware/auth');

// Rotas de Módulos
router.get('/modulos', auth.verifyToken, contentController.getAllModules);
router.get('/modulo/:id_modulo', auth.verifyToken, contentController.getModuleById);

// Rotas de Unidades
router.get('/modulo/:id_modulo/units', auth.verifyToken, contentController.getUnitsByModuleId); // Pode ser usada no futuro se precisar listar unidades sem as questões
router.get('/unidade/:id_unidade', auth.verifyToken, contentController.getUnitById);

// Rotas de Questões
router.get('/unidade/:id_unidade/questions', auth.verifyToken, contentController.getQuestionsByUnitId);
router.get('/questao/:id_questao', auth.verifyToken, contentController.getQuestionById); // Se precisar pegar uma questão individual

// Rotas de Progresso
router.post('/units/:unitId/complete', auth.verifyToken, contentController.updateUserProgress);
router.get('/progress/unit/:unitId', auth.verifyToken, contentController.getUnitProgress); // Rota para pegar progresso de UMA unidade
// =========================================================
// NOVO: Rota para obter o progresso de todas as unidades de um módulo para o usuário logado
// =========================================================
router.get('/progress/:id_modulo/allunits', auth.verifyToken, contentController.getModuleUnitsProgress);


module.exports = router;