// scripts/controllers/contentController.js
const contentService = require('../services/contentService');
const ProgressoModel = require('../models/Progresso'); // Para interagir com o DB de progresso

const contentController = {
    // =========================================================
    // Módulos
    // =========================================================

    /**
     * Retorna todos os módulos com um resumo do progresso do usuário autenticado.
     * Requer autenticação (req.userId é esperado).
     */
    getAllModules: async (req, res) => {
        try {
            // req.userId é garantido pelo middleware 'verifyToken' para rotas protegidas
            const userId = req.userId; 
            const modules = await contentService.getAllModulesWithProgressSummary(userId);
            res.status(200).json(modules);
        } catch (error) {
            console.error('Erro ao buscar todos os módulos:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulos.' });
        }
    },

    /**
     * Retorna um módulo específico com suas unidades e o progresso do usuário para essas unidades.
     * Requer autenticação.
     */
    getModuleById: async (req, res) => {
        try {
            const moduleId = req.params.id_modulo; 
            // req.userId é garantido pelo middleware 'verifyToken'
            const userId = req.userId; 

            if (!moduleId) { // Adiciona validação básica do parâmetro
                return res.status(400).json({ message: 'ID do módulo é obrigatório.' });
            }

            const module = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, userId);

            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.status(200).json(module);
        } catch (error) {
            console.error(`Erro ao buscar módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulo.' });
        }
    },

    /**
     * Retorna as unidades de um módulo específico com detalhes de progresso para o usuário.
     * Esta rota foi criada para ser mais específica do que getModuleById se você só precisar das unidades.
     * Requer autenticação.
     */
    getUnitsByModuleId: async (req, res) => {
        try {
            const moduleId = req.params.id_modulo; 
            const userId = req.userId; // Do middleware de autenticação

            if (!moduleId) {
                return res.status(400).json({ message: 'ID do módulo é obrigatório.' });
            }

            // Reutiliza o serviço que já busca o módulo com unidades e progresso
            const moduleDetails = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, userId);

            if (!moduleDetails || !moduleDetails.unidades) {
                // Se o módulo não for encontrado ou não tiver unidades, retorna um array vazio.
                // Status 200 com array vazio é apropriado aqui, não 404.
                return res.status(200).json([]); 
            }
            res.status(200).json(moduleDetails.unidades);
        } catch (error) {
            console.error(`Erro ao buscar unidades do módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as unidades.' });
        }
    },


    // =========================================================
    // Unidades
    // =========================================================

    /**
     * Retorna uma unidade específica com seus detalhes (questões e explicações pré-questão).
     */
    getUnitById: async (req, res) => {
        try {
            const unitId = req.params.id_unidade;
            if (!unitId) { // Adiciona validação básica do parâmetro
                return res.status(400).json({ message: 'ID da unidade é obrigatório.' });
            }

            const unitWithDetails = await contentService.getUnitByIdWithDetails(unitId);

            if (!unitWithDetails) {
                return res.status(404).json({ message: 'Unidade não encontrada.' });
            }
            res.status(200).json(unitWithDetails);
        } catch (error) {
            console.error(`Erro ao buscar unidade ${req.params.id_unidade}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar unidade.' });
        }
    },

    // =========================================================
    // Questões
    // =========================================================

    /**
     * Retorna todas as questões de uma unidade específica, incluindo explicações pré-questão.
     */
    getQuestionsByUnitId: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; 
            if (!unitId) { // Adiciona validação básica do parâmetro
                return res.status(400).json({ message: 'ID da unidade é obrigatório.' });
            }

            const questions = await contentService.getQuestionsForUnit(unitId);

            // Retorna array vazio se não houver questões, mas com status 200
            if (!questions || questions.length === 0) {
                return res.status(200).json([]);
            }
            res.status(200).json(questions);
        } catch (error) {
            console.error(`Erro ao buscar questões da unidade ${req.params.id_unidade}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as questões.' });
        }
    },

    /**
     * Retorna uma questão específica com suas explicações pré-questão.
     */
    getQuestionById: async (req, res) => {
        try {
            const questionId = req.params.id_questao; 
            if (!questionId) { // Adiciona validação básica do parâmetro
                return res.status(400).json({ message: 'ID da questão é obrigatório.' });
            }

            const question = await contentService.getQuestionById(questionId);
            if (!question) {
                return res.status(404).json({ message: 'Questão não encontrada.' });
            }
            res.status(200).json(question);
        } catch (error) {
            console.error(`Erro ao buscar questão ${req.params.id_questao}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar a questão.' });
        }
    },

    // =========================================================
    // Progresso do Usuário (interage diretamente com ProgressoModel)
    // =========================================================

    /**
     * Atualiza o progresso do usuário para uma unidade específica.
     * Requer autenticação.
     * @param {object} req.body.id_modulo ID do módulo (vem do corpo da requisição).
     * @param {object} req.body.pontuacao Pontuação obtida na unidade.
     * @param {object} req.body.concluido Booleano indicando se a unidade foi completada.
     */
    updateUserProgress: async (req, res) => {
        try {
            const id_usuario = req.userId; // ID do usuário do token JWT
            const unitId = req.params.unitId; // ID da unidade do URL

            // id_modulo, pontuacao e concluido vêm do corpo da requisição
            const { id_modulo, pontuacao, concluido } = req.body; 

            // Validação de dados de entrada
            if (!id_usuario || !unitId || id_modulo === undefined || concluido === undefined || pontuacao === undefined) {
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para atualizar o progresso.' });
            }
            
            // Garante que pontuacao e IDs sejam números inteiros
            const parsedPontuacao = parseInt(pontuacao, 10);
            const parsedModuleId = parseInt(id_modulo, 10);
            const parsedUnitId = parseInt(unitId, 10);
            
            // 1. REGISTRAR PROGRESSO NO BANCO DE DADOS (mantendo a unicidade)
            const updatedProgress = await ProgressoModel.setUnidadeConcluida(
                id_usuario,
                parsedModuleId,
                parsedUnitId,
                concluido,
                parsedPontuacao 
            );

            // 2. ADICIONAR PONTOS AO SALDO GERAL DO USUÁRIO, se aplicável
            let pointsAddedResult = { changes: 0, totalPointsAdded: 0 };
            if (concluido && parsedPontuacao > 0) { 
                pointsAddedResult = await ProgressoModel.addUserPoints(id_usuario, parsedPontuacao); 
            }

            res.status(200).json({ 
                message: 'Progresso atualizado com sucesso!', 
                progress: updatedProgress, 
                id_modulo: parsedModuleId,
                id_unidade: parsedUnitId,
                points_awarded: pointsAddedResult.totalPointsAdded 
            });

        } catch (error) {
            console.error('Erro ao atualizar progresso do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar progresso.' });
        }
    },

    /**
     * Retorna o progresso de uma unidade específica para o usuário logado.
     * Requer autenticação.
     */
    getUnitProgress: async (req, res) => {
        try {
            const id_usuario = req.userId; 
            const unitId = req.params.unitId; 

            if (id_usuario === undefined || isNaN(parseInt(unitId, 10))) {
                return res.status(400).json({ message: 'Dados de usuário ou ID da unidade inválidos.' });
            }

            // Primeiro, precisamos encontrar o id_modulo da unidade para buscar o progresso
            const unitDetails = await contentService.getUnitById(unitId); 
            if (!unitDetails || !unitDetails.id_modulo) {
                return res.status(404).json({ message: 'Unidade não encontrada ou ID do módulo não definido.' });
            }
            const id_modulo = unitDetails.id_modulo;

            const progress = await ProgressoModel.getProgressoByUnit(
                id_usuario,
                parseInt(id_modulo, 10), 
                parseInt(unitId, 10)
            );

            // Se não houver progresso, retorna um objeto padrão de "não completado"
            if (!progress) {
                return res.status(200).json({ 
                    id_modulo: parseInt(id_modulo, 10),
                    id_unidade: parseInt(unitId, 10),
                    completo: false, 
                    pontuacao_unidade: 0, 
                    message: 'Progresso para esta unidade não encontrado.' 
                });
            }
            res.status(200).json(progress);
        } catch (error) {
            console.error('Erro ao buscar progresso da unidade:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar progresso da unidade.' });
        }
    },
    
    /**
     * Retorna o progresso de todas as unidades de um módulo para o usuário logado.
     * Requer autenticação.
     */
    getModuleUnitsProgress: async (req, res) => {
        try {
            const id_usuario = req.userId; 
            const moduleId = req.params.id_modulo; 

            if (!id_usuario) { // Embora protegido por middleware, é uma boa prática
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            if (isNaN(parseInt(moduleId, 10))) {
                return res.status(400).json({ message: 'ID do módulo inválido.' });
            }

            const progresso = await ProgressoModel.getProgressoUsuarioPorModulo(id_usuario, parseInt(moduleId, 10));
            res.status(200).json({ progresso }); // Retorna um objeto com a propriedade 'progresso'
        } catch (error) {
            console.error(`Erro ao buscar progresso do módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar progresso do módulo.' });
        }
    }
};

module.exports = contentController;