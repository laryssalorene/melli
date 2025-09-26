// scripts/services/contentService.js
const path = require('path');
const fs = require('fs/promises'); // Usando fs/promises para readFile assíncrono

// Caminhos para os arquivos JSON (relativos a scripts/services/)
const MODULES_FILE_PATH = path.join(__dirname, '..', 'data', 'modules.json');
const UNITS_FILE_PATH = path.join(__dirname, '..', 'data', 'units.json');
const QUESTIONS_FILE_PATH = path.join(__dirname, '..', 'data', 'questions.json');

// Importe o modelo Progresso (que interage com o DB)
const ProgressoModel = require('../models/Progresso'); // Renomeado para ProgressoModel para clareza

// Cache para armazenar o conteúdo dos JSONs após a primeira leitura
let cachedContent = null;

/**
 * Carrega todos os dados de módulos, unidades e questões dos arquivos JSON.
 * Usa um cache para evitar leituras repetidas do disco.
 * @returns {Promise<object>} Um objeto contendo modules, units e questions.
 */
async function loadAllContent() {
    if (cachedContent) {
        return cachedContent;
    }

    try {
        console.log('Carregando dados de conteúdo dos arquivos JSON...');
        const modulesData = await fs.readFile(MODULES_FILE_PATH, 'utf8');
        const unitsData = await fs.readFile(UNITS_FILE_PATH, 'utf8');
        const questionsData = await await fs.readFile(QUESTIONS_FILE_PATH, 'utf8'); // Garantindo await aqui também
        
        const allModules = JSON.parse(modulesData);
        const allUnits = JSON.parse(unitsData);
        const allQuestions = JSON.parse(questionsData);

        // Processa as questões para aninhar as respostas
        const questionsWithAnswers = allQuestions.map(q => {
            // Se as respostas já vêm aninhadas no JSON, como no seu exemplo, 
            // basta retornar 'q'. Caso contrário, aqui seria a lógica para agrupá-las.
            return q;
        });

        cachedContent = {
            modules: allModules,
            units: allUnits,
            questions: questionsWithAnswers // Usa as questões processadas
        };

        console.log('Dados de conteúdo (módulos, unidades, questões) carregados e em cache.');
        return cachedContent;

    } catch (error) {
        console.error('ERRO: Falha ao carregar o conteúdo dos arquivos JSON:', error);
        // É crucial relançar o erro para que o ponto de inicialização do servidor possa tratá-lo
        throw new Error('Falha ao carregar conteúdo do curso. Verifique os arquivos JSON e suas permissões: ' + error.message);
    }
}

const contentService = {
    /**
     * Retorna todos os módulos com um resumo de progresso para um usuário específico.
     * Ideal para a página inicial (home.html) que lista os módulos.
     * @param {number|null} id_usuario - ID do usuário logado, ou null se não estiver logado.
     * @returns {Promise<Array>} Lista de módulos com informações de progresso.
     */
    getAllModulesWithProgressSummary: async (id_usuario) => {
        const { modules, units } = await loadAllContent();
        
        // Se o usuário não estiver logado (id_usuario é null), userProgress será um array vazio.
        const userProgress = id_usuario ? await ProgressoModel.getProgressoUsuario(id_usuario) : [];

        return modules.map(module => {
            const moduleUnits = units.filter(u => u.id_modulo === module.id_modulo);
            const total_unidades = moduleUnits.length;
            let unidades_concluidas = 0;

            moduleUnits.forEach(unit => {
                const progressRecord = userProgress.find(p => 
                    p.id_modulo === module.id_modulo && p.id_unidade === unit.id_unidade && p.concluido === 1
                );
                if (progressRecord) {
                    unidades_concluidas++;
                }
            });
            // Calcula a porcentagem e garante que não há divisão por zero
            const percent = total_unidades > 0 ? Math.round((unidades_concluidas / total_unidades) * 100) : 0;
            
            return {
                id_modulo: module.id_modulo,
                nome_modulo: module.nome_modulo,
                descricao: module.descricao,
                ordem: module.ordem,
                // Adiciona o objeto 'progress' conforme o frontend espera
                progress: {
                    totalUnits: total_unidades,
                    completedUnits: unidades_concluidas,
                    percent: percent
                }
            };
        });
    },

    /**
     * Retorna os detalhes de um módulo específico, incluindo suas unidades e o progresso do usuário nelas.
     * Ideal para a página de detalhes do módulo.
     * @param {number} id_modulo - ID do módulo.
     * @param {number|null} id_usuario - ID do usuário logado, ou null se não estiver logado.
     * @returns {Promise<object|null>} Objeto do módulo com array de unidades, cada uma com status de progresso.
     */
    getModuleByIdWithUnitsAndProgress: async (id_modulo, id_usuario) => {
        const { modules, units } = await loadAllContent(); 
        const moduleId = parseInt(id_modulo, 10); // Garante que o ID é um número

        const module = modules.find(m => m.id_modulo === moduleId);
        if (!module) return null;

        const moduleUnits = units.filter(u => u.id_modulo === moduleId).sort((a, b) => a.ordem - b.ordem); // Ordena as unidades
        const userProgress = id_usuario ? await ProgressoModel.getProgressoUsuario(id_usuario) : [];

        const unitsWithProgress = moduleUnits.map(unit => {
            const progressRecord = userProgress.find(p => 
                p.id_modulo === moduleId && p.id_unidade === unit.id_unidade
            );
            return {
                ...unit,
                concluido: !!progressRecord?.concluido, // Convert to boolean (true se 1, false se 0 ou undefined)
                pontuacao: progressRecord ? progressRecord.pontuacao : 0
            };
        });

        return { ...module, unidades: unitsWithProgress };
    },

    /**
     * Retorna os detalhes de uma unidade específica, incluindo todas as suas questões.
     * @param {number} id_unidade - ID da unidade.
     * @returns {Promise<object|null>} Objeto da unidade com array de questões aninhadas.
     */
    getUnitByIdWithDetails: async (id_unidade) => { 
        const { units, questions } = await loadAllContent();
        const unitId = parseInt(id_unidade, 10);

        const unit = units.find(u => u.id_unidade === unitId);
        if (!unit) return null;

        const unitQuestions = questions.filter(q => q.id_unidade === unitId);
        
        // Retorna a unidade com suas questões aninhadas
        return { ...unit, questoes: unitQuestions };
    },

    /**
     * Retorna uma questão específica por ID.
     * @param {number} id_questao - ID da questão.
     * @returns {Promise<object|null>} Objeto da questão.
     */
    getQuestionById: async (id_questao) => {
        const { questions } = await loadAllContent();
        const questionId = parseInt(id_questao, 10);
        return questions.find(q => q.id_questao === questionId);
    },

    /**
     * Registra ou atualiza o progresso de um usuário em uma unidade.
     * @param {number} id_usuario - ID do usuário.
     * @param {number} id_modulo - ID do módulo da unidade.
     * @param {number} id_unidade - ID da unidade.
     * @param {boolean} concluido - True se a unidade foi concluída, false caso contrário.
     * @param {number} [pontuacao=0] - Pontuação obtida na unidade.
     * @returns {Promise<object>} O registro de progresso atualizado.
     */
    updateUserProgress: async (id_usuario, id_modulo, id_unidade, concluido, pontuacao = 0) => {
        // Valida se a unidade existe antes de registrar o progresso
        const { units } = await loadAllContent();
        const unitExists = units.some(u => u.id_modulo === id_modulo && u.id_unidade === id_unidade);
        if (!unitExists) {
            throw new Error(`Unidade com ID ${id_unidade} no módulo ${id_modulo} não encontrada.`);
        }
        
        // O ProgressoModel lida com a inserção/atualização no banco de dados
        return ProgressoModel.updateProgresso(id_usuario, id_modulo, id_unidade, concluido, pontuacao);
    },

    /**
     * Obtém o progresso de um usuário em uma unidade específica.
     * @param {number} id_usuario - ID do usuário.
     * @param {number} id_modulo - ID do módulo.
     * @param {number} id_unidade - ID da unidade.
     * @returns {Promise<object|null>} Objeto de progresso ou null.
     */
    getProgressoByUnit: async (id_usuario, id_modulo, id_unidade) => {
        return ProgressoModel.getProgressoByUnit(id_usuario, id_modulo, id_unidade);
    }
};

module.exports = contentService;