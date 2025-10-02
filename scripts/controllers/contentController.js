// scripts/controllers/contentController.js
// Importa o serviço unificado que gerencia todo o conteúdo
const contentService = require('../services/contentService');
// Importa o modelo de Progresso para interagir com o DB, conforme sua arquitetura
const Progresso = require('../models/Progresso'); 

const contentController = {
    /**
     * Obtém uma lista de todos os módulos disponíveis, incluindo um resumo de progresso para o usuário logado.
     * Ideal para a página inicial (home.html).
     * @param {object} req - Objeto de requisição do Express (req.user pode conter o ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getAllModules: async (req, res) => {
        try {
            const id_usuario = req.user ? req.user.id_usuario : null; 
            const modules = await contentService.getAllModulesWithProgressSummary(id_usuario);
            res.status(200).json(modules);
        } catch (error) {
            console.error('Erro ao buscar todos os módulos:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulos.' });
        }
    },

    /**
     * Obtém os detalhes de um módulo específico por ID, incluindo suas unidades e o progresso do usuário nelas.
     * Corresponde à rota GET /api/content/modulo/:id_modulo.
     * @param {object} req - Objeto de requisição do Express (req.params.id_modulo para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getModuleById: async (req, res) => { 
        try {
            // CORREÇÃO: Usar req.params.id_modulo para corresponder à definição da rota
            const moduleId = req.params.id_modulo; 
            const id_usuario = req.user ? req.user.id_usuario : null; 

            const module = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.status(200).json(module);
        } catch (error) {
            // CORREÇÃO: Atualizar a mensagem de erro para usar id_modulo
            console.error(`Erro ao buscar módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulo.' });
        }
    },

    /**
     * Obtém todas as unidades de um módulo específico por ID do módulo (com informações de progresso).
     * Corresponde à rota GET /api/content/modulo/:id_modulo/unidades.
     * @param {object} req - Objeto de requisição do Express (req.params.id_modulo para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitsByModuleId: async (req, res) => {
        try {
            // CORREÇÃO: Usar req.params.id_modulo para corresponder à definição da rota
            const moduleId = req.params.id_modulo; 
            const id_usuario = req.user ? req.user.id_usuario : null; 

            const moduleDetails = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!moduleDetails || !moduleDetails.unidades || moduleDetails.unidades.length === 0) {
                return res.status(200).json([]); 
            }
            res.status(200).json(moduleDetails.unidades);
        } catch (error) {
            // CORREÇÃO: Atualizar a mensagem de erro para usar id_modulo
            console.error(`Erro ao buscar unidades do módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as unidades.' });
        }
    },

    /**
     * Obtém os detalhes de uma unidade específica por ID, incluindo suas questões.
     * Corresponde à rota GET /api/content/unidade/:id_unidade.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitById: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; 
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

    /**
     * Obtém todas as questões de uma unidade específica por ID da unidade.
     * Corresponde à rota GET /api/content/unidade/:id_unidade/questions.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionsByUnitId: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; 
            const questions = await contentService.getQuestionsForUnit(unitId); 

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
     * Retorna uma questão específica por ID.
     * Corresponde à rota GET /api/content/question/:id_questao.
     * @param {object} req - Objeto de requisição do Express (req.params.id_questao).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionById: async (req, res) => {
        try {
            const questionId = req.params.id_questao; 
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

    /**
     * Registra ou atualiza o progresso de um usuário em uma unidade.
     * Corresponde à rota POST /api/progress/:id_modulo/:id_unidade.
     * E também a POST /api/units/:id_unidade/complete.
     * @param {object} req - Objeto de requisição do Express (req.params para IDs, req.body para concluido/pontuacao, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    updateUserProgress: async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario; 
            
            let { unitId, id_modulo, id_unidade: id_unidade_from_params } = req.params;
            let final_id_unidade = unitId || id_unidade_from_params;

            const { concluido, pontuacao } = req.body; 

            console.log('[updateUserProgress] id_usuario:', id_usuario);
            console.log('[updateUserProgress] unitId (da rota /units/:unitId/complete):', unitId);
            console.log('[updateUserProgress] id_modulo (da rota /progress/:id_modulo/:id_unidade):', id_modulo); 
            console.log('[updateUserProgress] id_unidade_from_params (da rota /progress/:id_modulo/:id_unidade):', id_unidade_from_params);
            console.log('[updateUserProgress] final_id_unidade (resolvido):', final_id_unidade); 
            console.log('[updateUserProgress] concluido (do body):', concluido);
            console.log('[updateUserProgress] pontuacao (do body):', pontuacao);
            
            if (!id_modulo && final_id_unidade) { 
                const unitDetails = await contentService.getUnitByIdWithDetails(final_id_unidade); 
                if (unitDetails && unitDetails.id_modulo) {
                    id_modulo = unitDetails.id_modulo;
                    console.log('[updateUserProgress] id_modulo inferido da unidade:', id_modulo); 
                } else {
                    console.warn(`[updateUserProgress] Módulo não encontrado para unidade ${final_id_unidade}. Não será possível registrar progresso sem módulo.`); 
                    return res.status(400).json({ message: 'Não foi possível determinar o módulo da unidade.' });
                }
            }
            
            const parsedIdModulo = parseInt(id_modulo, 10);
            const parsedIdUnidade = parseInt(final_id_unidade, 10); 

            console.log('[updateUserProgress] parsedIdModulo:', parsedIdModulo, ' (isNaN:', isNaN(parsedIdModulo), ')'); 
            console.log('[updateUserProgress] parsedIdUnidade:', parsedIdUnidade, ' (isNaN:', isNaN(parsedIdUnidade), ')'); 

            if (id_usuario === undefined || isNaN(parsedIdModulo) || isNaN(parsedIdUnidade) || concluido === undefined) {
                console.error('[updateUserProgress] Falha na validação: Dados insuficientes ou inválidos.'); 
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para atualizar o progresso.' });
            }
            
            const updatedProgress = await Progresso.setUnidadeConcluida(
                id_usuario,
                parsedIdModulo,
                parsedIdUnidade,
                concluido,
                pontuacao
            );
            res.status(200).json({ 
                message: 'Progresso atualizado com sucesso!', 
                progress: updatedProgress,
                id_modulo: parsedIdModulo 
            });
        } catch (error) {
            console.error('Erro ao atualizar progresso do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar progresso.' });
        }
    },

    /**
     * Obtém o progresso de um usuário em uma unidade específica.
     * Corresponde à rota GET /api/content/progress/:id_modulo/:id_unidade.
     * @param {object} req - Objeto de requisição do Express (req.params para IDs, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitProgress: async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario;
            const { id_modulo, id_unidade } = req.params;

            const parsedIdModulo = parseInt(id_modulo, 10);
            const parsedIdUnidade = parseInt(id_unidade, 10);

            if (id_usuario === undefined || isNaN(parsedIdModulo) || isNaN(parsedIdUnidade)) {
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para buscar o progresso da unidade.' });
            }

            const progress = await Progresso.getProgressoByUnit(
                id_usuario,
                parsedIdModulo,
                parsedIdUnidade
            );

            res.status(200).json(progress);
        } catch (error) {
            console.error('Erro ao buscar progresso da unidade:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar progresso da unidade.' });
        }
    },

    /**
     * Obtém o progresso de todas as unidades de um módulo específico para o usuário logado.
     * Corresponde à rota GET /api/content/progress/:id_modulo/allunits.
     * @param {object} req - Objeto de requisição do Express (req.params.id_modulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getModuleUnitsProgress: async (req, res) => {
        try {
            const id_usuario = req.user ? req.user.id_usuario : null;
            const moduleId = req.params.id_modulo;

            if (!id_usuario) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            if (isNaN(parseInt(moduleId, 10))) {
                return res.status(400).json({ message: 'ID do módulo inválido.' });
            }

            const progresso = await Progresso.getProgressoUsuarioPorModulo(id_usuario, moduleId);
            res.status(200).json({ progresso });
        } catch (error) {
            console.error(`Erro ao buscar progresso do módulo ${req.params.id_modulo}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar progresso do módulo.' });
        }
    }
};

module.exports = contentController;