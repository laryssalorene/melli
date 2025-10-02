// scripts/controllers/contentController.js
const contentService = require('../services/contentService');
const ProgressoModel = require('../models/Progresso'); // Para interagir com o DB de progresso

const contentController = {
    // =========================================================
    // Módulos
    // =========================================================
    getAllModules: async (req, res) => {
        try {
            const id_usuario = req.userId || null; 
            const modules = await contentService.getAllModulesWithProgressSummary(id_usuario);
            res.status(200).json(modules);
        } catch (error) {
            console.error('Erro ao buscar todos os módulos:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulos.' });
        }
    },

    getModuleById: async (req, res) => {
        try {
            const moduleId = req.params.id_modulo; // <-- CORRIGIDO AQUI: Usa 'id_modulo' da rota
            const id_usuario = req.userId || null; 

            const module = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.status(200).json(module);
        } catch (error) {
            console.error(`Erro ao buscar módulo ${req.params.id_modulo}:`, error); // <-- CORRIGIDO AQUI
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulo.' });
        }
    },

    // =========================================================
    // Unidades
    // =========================================================
    getUnitsByModuleId: async (req, res) => {
        try {
            const moduleId = req.params.id_modulo; // <-- CORRIGIDO AQUI: Usa 'id_modulo' da rota
            const id_usuario = req.userId || null; 

            const moduleDetails = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!moduleDetails || !moduleDetails.unidades) {
                return res.status(200).json([]); 
            }
            res.status(200).json(moduleDetails.unidades);
        } catch (error) {
            console.error(`Erro ao buscar unidades do módulo ${req.params.id_modulo}:`, error); // <-- CORRIGIDO AQUI
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as unidades.' });
        }
    },

    getUnitById: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; // <-- CORRIGIDO AQUI: Usa 'id_unidade' da rota
            const unitWithDetails = await contentService.getUnitByIdWithDetails(unitId);

            if (!unitWithDetails) {
                return res.status(404).json({ message: 'Unidade não encontrada.' });
            }
            res.status(200).json(unitWithDetails);
        } catch (error) {
            console.error(`Erro ao buscar unidade ${unitId}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar unidade.' });
        }
    },

    // =========================================================
    // Questões
    // =========================================================
    getQuestionsByUnitId: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; // <-- CORRIGIDO AQUI: Usa 'id_unidade' da rota
            const questions = await contentService.getQuestionsForUnit(unitId);

            if (!questions || questions.length === 0) {
                return res.status(200).json([]);
            }
            res.status(200).json(questions);
        } catch (error) {
            console.error(`Erro ao buscar questões da unidade ${unitId}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as questões.' });
        }
    },

    getQuestionById: async (req, res) => {
        try {
            const questionId = req.params.id_questao; // <-- CORRIGIDO AQUI: Usa 'id_questao' da rota
            const question = await contentService.getQuestionById(questionId);
            if (!question) {
                return res.status(404).json({ message: 'Questão não encontrada.' });
            }
            res.status(200).json(question);
        } catch (error) {
            console.error(`Erro ao buscar questão ${questionId}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar a questão.' });
        }
    },

    // =========================================================
    // Progresso do Usuário (interage diretamente com ProgressoModel)
    // =========================================================
    updateUserProgress: async (req, res) => {
        try {
            const id_usuario = req.userId;
            const unitId = req.params.unitId; // <-- CORRIGIDO AQUI: Usa 'unitId' da rota /units/:unitId/complete

            // id_modulo, pontuacao e concluido vêm do corpo da requisição
            const { id_modulo, pontuacao, concluido } = req.body; 

            if (!id_usuario || !unitId || id_modulo === undefined || concluido === undefined || pontuacao === undefined) {
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para atualizar o progresso.' });
            }
            
            const updatedProgress = await ProgressoModel.setUnidadeConcluida(
                id_usuario,
                parseInt(id_modulo, 10), // id_modulo agora vem do body
                parseInt(unitId, 10), // unitId do params
                concluido,
                pontuacao
            );
            res.status(200).json({ message: 'Progresso atualizado com sucesso!', progress: updatedProgress });

        } catch (error) {
            console.error('Erro ao atualizar progresso do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar progresso.' });
        }
    },

    getUnitProgress: async (req, res) => {
        try {
            const id_usuario = req.userId;
            const unitId = req.params.unitId; // <-- CORRIGIDO AQUI: Usa 'unitId' da rota /progress/unit/:unitId

            if (id_usuario === undefined || isNaN(parseInt(unitId, 10))) {
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para buscar o progresso da unidade.' });
            }

            // Precisamos do id_modulo para buscar o progresso.
            // O ProgressoModel.getProgressoByUnit espera id_modulo.
            // Vamos buscar a unidade para inferir o id_modulo.
            const unitDetails = await contentService.getUnitById(unitId); // Usar o novo método getUnitById
            if (!unitDetails || !unitDetails.id_modulo) {
                return res.status(404).json({ message: 'Unidade não encontrada para inferir o módulo.' });
            }
            const id_modulo = unitDetails.id_modulo;

            const progress = await ProgressoModel.getProgressoByUnit(
                id_usuario,
                parseInt(id_modulo, 10), // id_modulo inferido
                parseInt(unitId, 10)
            );

            res.status(200).json(progress);
        } catch (error) {
            console.error('Erro ao buscar progresso da unidade:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar progresso da unidade.' });
        }
    },
    
    getModuleUnitsProgress: async (req, res) => {
        try {
            const id_usuario = req.userId || null;
            const moduleId = req.params.id_modulo; // <-- CORRIGIDO AQUI: Usa 'id_modulo' da rota

            if (!id_usuario) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            if (isNaN(parseInt(moduleId, 10))) {
                return res.status(400).json({ message: 'ID do módulo inválido.' });
            }

            const progresso = await ProgressoModel.getProgressoUsuarioPorModulo(id_usuario, parseInt(moduleId, 10));
            res.status(200).json({ progresso });
        } catch (error) {
            console.error(`Erro ao buscar progresso do módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar progresso do módulo.' });
        }
    }
};

module.exports = contentController;