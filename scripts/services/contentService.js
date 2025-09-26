// scripts/services/contentService.js
const fs = require('fs').promises; // Usar promessas para async/await
const path = require('path');

// =======================================================
// AJUSTE DOS CAMINHOS DOS ARQUIVOS JSON AQUI (CORRIGIDO)
// =======================================================
// Seu `contentService.js` está em `melli/scripts/services`.
// A pasta `data` está em `melli/scripts/data`.
// Para chegar na pasta `data` a partir de `__dirname` (services),
// precisamos subir um nível (`..`) e então ir para a pasta `data`.
const DATA_DIR = path.resolve(__dirname, '..', 'data'); 

console.log('DATA_DIR (contentService - CORRIGIDO):', DATA_DIR);

// Definindo os caminhos completos para cada arquivo JSON
const MODULES_FILE = path.join(DATA_DIR, 'modules.json');
const UNITS_FILE = path.join(DATA_DIR, 'units.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json'); // Inclui as respostas agora

// Cache para armazenar o conteúdo dos arquivos JSON
let contentCache = {
    modules: [],
    units: [],
    questions: [] 
};

// Função para carregar todos os arquivos JSON de conteúdo
async function loadAllContent() {
    try {
        if (contentCache.modules.length === 0) {
            console.log("Carregando arquivos JSON de conteúdo...");
            const [modulesData, unitsData, questionsData] = await Promise.all([
                fs.readFile(MODULES_FILE, 'utf8').then(JSON.parse),
                fs.readFile(UNITS_FILE, 'utf8').then(JSON.parse),
                fs.readFile(QUESTIONS_FILE, 'utf8').then(JSON.parse)
            ]);

            contentCache = {
                modules: modulesData,
                units: unitsData,
                questions: questionsData
            };
            console.log("Arquivos JSON de conteúdo carregados com sucesso!");
        }
        return contentCache;
    } catch (error) {
        console.error('Erro ao carregar o conteúdo dos arquivos JSON:', error);
        throw new Error('Falha ao carregar conteúdo do curso. Verifique os arquivos JSON: ' + error.message);
    }
}

const contentService = {
    _ensureContentLoaded: async () => {
        if (contentCache.modules.length === 0) {
            await loadAllContent();
        }
    },

    getAllModulesWithProgressSummary: async (userId) => {
        await contentService._ensureContentLoaded();
        const { modules, units } = contentCache;
        
        return modules.map(m => ({
            ...m,
            progresso: userId ? {
                total_unidades: units.filter(u => u.id_modulo === m.id).length,
                unidades_concluidas: 0,
                porcentagem: 0
            } : null
        }));
    },

    getModuleByIdWithUnitsAndProgress: async (moduleId, userId) => {
        await contentService._ensureContentLoaded();
        const { modules, units, questions } = contentCache;

        const module = modules.find(m => m.id_modulo === parseInt(moduleId, 10));
        if (!module) return null;

        const moduleUnits = units.filter(unit => unit.id_modulo === parseInt(moduleId, 10));

        const unitsWithDetails = moduleUnits.map(unit => {
            const unitQuestions = questions.filter(q => q.id_unidade === unit.id_unidade);
            return {
                ...unit,
                questoes: unitQuestions,
                progresso: userId ? { concluido: false, pontuacao: 0 } : null
            };
        });

        return {
            ...module,
            unidades: unitsWithDetails
        };
    },

    getUnitByIdWithDetails: async (unitId) => {
        await contentService._ensureContentLoaded();
        const { units, questions } = contentCache;

        const unit = units.find(u => u.id_unidade === parseInt(unitId, 10));
        if (!unit) return null;

        const unitQuestions = questions.filter(q => q.id_unidade === parseInt(unitId, 10));

        return {
            ...unit,
            questoes: unitQuestions
        };
    },

    getQuestionsForUnit: async (unitId) => {
        await contentService._ensureContentLoaded();
        const { questions } = contentCache;
        return questions.filter(q => q.id_unidade === parseInt(unitId, 10));
    },

    getQuestionById: async (questionId) => {
        await contentService._ensureContentLoaded();
        const { questions } = contentCache;
        return questions.find(q => q.id_questao === parseInt(questionId, 10));
    }
};

module.exports = contentService;