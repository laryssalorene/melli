// scripts/routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController'); // Garanta que este caminho está correto
const auth = require('../middleware/auth'); // Garanta que este caminho está correto

// =========================================================
// Rotas de Módulos (Corrigidas para incluir '/content')
// =========================================================
router.get('/content/modulos', auth.verifyToken, contentController.getAllModules); // <--- CORREÇÃO AQUI
router.get('/content/modulo/:id_modulo', auth.verifyToken, contentController.getModuleById); // <--- CORREÇÃO AQUI

// =========================================================
// Rotas de Unidades (Corrigidas para incluir '/content')
// =========================================================
router.get('/content/modulo/:id_modulo/units', auth.verifyToken, contentController.getUnitsByModuleId); // <--- CORREÇÃO AQUI
router.get('/content/unidade/:id_unidade', auth.verifyToken, contentController.getUnitById); // <--- CORREÇÃO AQUI

// =========================================================
// Rotas de Questões (Corrigidas para incluir '/content')
// =========================================================
router.get('/content/unidade/:id_unidade/questions', auth.verifyToken, contentController.getQuestionsByUnitId); // <--- CORREÇÃO AQUI
router.get('/content/questao/:id_questao', auth.verifyToken, contentController.getQuestionById); // <--- CORREÇÃO AQUI

// =========================================================
// Rotas de Progresso (Corrigidas para incluir '/content')
// =========================================================
router.post('/content/units/:unitId/complete', auth.verifyToken, contentController.updateUserProgress); // <--- CORREÇÃO AQUI
router.get('/content/progress/unit/:unitId', auth.verifyToken, contentController.getUnitProgress); // <--- CORREÇÃO AQUI
router.get('/content/progress/:id_modulo/allunits', auth.verifyToken, contentController.getModuleUnitsProgress); // <--- CORREÇÃO AQUI

module.exports = router;