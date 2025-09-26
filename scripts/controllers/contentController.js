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
     * Corresponde à rota GET /api/modulo/:id.
     * @param {object} req - Objeto de requisição do Express (req.params.id para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getModuleById: async (req, res) => { // Renomeado para getModuleById para bater com a rota
        try {
            const moduleId = req.params.id; // Pega o ID do módulo da URL. Nome do parâmetro na rota: ':id'
            const id_usuario = req.user ? req.user.id_usuario : null; 

            const module = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.status(200).json(module);
        } catch (error) {
            console.error(`Erro ao buscar módulo ${req.params.id}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulo.' });
        }
    },

    /**
     * Obtém todas as unidades de um módulo específico por ID do módulo (com informações de progresso).
     * Corresponde à rota GET /api/modulo/:id/units.
     * @param {object} req - Objeto de requisição do Express (req.params.id para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitsByModuleId: async (req, res) => {
        try {
            const moduleId = req.params.id; // Pega o ID do módulo da URL. Nome do parâmetro na rota: ':id'
            const id_usuario = req.user ? req.user.id_usuario : null; 

            const moduleDetails = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!moduleDetails || !moduleDetails.unidades || moduleDetails.unidades.length === 0) {
                return res.status(200).json([]); 
            }
            res.status(200).json(moduleDetails.unidades);
        } catch (error) {
            console.error(`Erro ao buscar unidades do módulo ${req.params.id}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as unidades.' });
        }
    },

    /**
     * Obtém os detalhes de uma unidade específica por ID, incluindo suas questões.
     * Corresponde à rota GET /api/unidade/:id_unidade.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitById: async (req, res) => {
        try {
            // O parâmetro da rota é ':id_unidade' (conforme contentRoutes.js)
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
     * Corresponde à rota GET /api/unidade/:id_unidade/questions.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionsByUnitId: async (req, res) => {
        try {
            // O parâmetro da rota é ':id_unidade' (conforme contentRoutes.js)
            const unitId = req.params.id_unidade; 
            const questions = await contentService.getQuestionsForUnit(unitId); // Usando um método mais direto

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
     * Corresponde à rota GET /api/question/:id_questao.
     * @param {object} req - Objeto de requisição do Express (req.params.id_questao).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionById: async (req, res) => {
        try {
            const questionId = req.params.id_questao; // Parâmetro da rota é ':id_questao'
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
            // id_modulo pode vir da rota, ou ser inferido/padrão
            let { id_modulo, id_unidade } = req.params; 
            const { concluido, pontuacao } = req.body; 

            // Se id_modulo não foi fornecido na rota (ex: /units/:id_unidade/complete),
            // tentamos obter o id_modulo da unidade.
            if (!id_modulo && id_unidade) {
                const unitDetails = await contentService.getUnitByIdWithDetails(id_unidade);
                if (unitDetails && unitDetails.id_modulo) {
                    id_modulo = unitDetails.id_modulo;
                } else {
                    console.warn(`[updateUserProgress] Módulo não encontrado para unidade ${id_unidade}. Usando id_modulo padrão (1).`);
                    id_modulo = 1; // Fallback para um módulo padrão ou erro se preferir
                }
            }
            
            // Garantir que os IDs são números
            const parsedIdModulo = parseInt(id_modulo, 10);
            const parsedIdUnidade = parseInt(id_unidade, 10);

            if (id_usuario === undefined || isNaN(parsedIdModulo) || isNaN(parsedIdUnidade) || concluido === undefined) {
                return res.status(400).json({ message: 'Dados insuficientes ou inválidos para atualizar o progresso.' });
            }
            
            // Chamar o método do Progresso model diretamente para persistir no DB
            const updatedProgress = await Progresso.setUnidadeConcluida(
                id_usuario,
                parsedIdModulo,
                parsedIdUnidade,
                concluido,
                pontuacao
            );
            res.status(200).json({ message: 'Progresso atualizado com sucesso!', progress: updatedProgress });
        } catch (error) {
            console.error('Erro ao atualizar progresso do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar progresso.' });
        }
    },

    /**
     * Obtém o progresso de um usuário em uma unidade específica.
     * Corresponde à rota GET /api/progress/:id_modulo/:id_unidade.
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

            // Chamar o método do Progresso model diretamente
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
    }
};

module.exports = contentController;