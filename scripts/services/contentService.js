// scripts/services/contentService.js
const fs = require('fs').promises;
const path = require('path');
const ProgressoModel = require('../models/Progresso'); // Importa o modelo de progresso

const DATA_DIR = path.resolve(__dirname, '..', 'data'); 

console.log('DATA_DIR (contentService):', DATA_DIR);

const MODULES_FILE = path.join(DATA_DIR, 'modules.json');
const UNITS_FILE = path.join(DATA_DIR, 'units.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const EXPLICATIONS_FILE = path.join(DATA_DIR, 'explicacoes.json'); // Corrigido para EXPLANATIONS_FILE (singular)

let contentCache = {
    modules: [],
    units: [],
    questions: [],
    explanations: []
};

// =========================================================
// Funções de Carregamento e Cache
// =========================================================
async function loadAllContent() {
    try {
        if (contentCache.modules.length === 0) {
            console.log("Carregando arquivos JSON de conteúdo...");
            const [modulesData, unitsData, questionsData, explanationsData] = await Promise.all([
                fs.readFile(MODULES_FILE, 'utf8').then(JSON.parse),
                fs.readFile(UNITS_FILE, 'utf8').then(JSON.parse),
                fs.readFile(QUESTIONS_FILE, 'utf8').then(JSON.parse),
                fs.readFile(EXPLICATIONS_FILE, 'utf8').then(JSON.parse) // Usando EXPLICATIONS_FILE
            ]);

            contentCache = {
                modules: modulesData,
                units: unitsData,
                questions: questionsData,
                explanations: explanationsData
            };
            console.log("Arquivos JSON de conteúdo carregados com sucesso!");
            console.log('Total de módulos carregados:', contentCache.modules.length);
            console.log('Total de unidades carregadas:', contentCache.units.length);
            console.log('Total de questões carregadas:', contentCache.questions.length);
            console.log('Total de explicações carregadas:', contentCache.explanations.length);
        }
        return contentCache;
    } catch (error) {
        console.error('Erro ao carregar o conteúdo dos arquivos JSON:', error);
        throw new Error('Falha ao carregar conteúdo do curso. Verifique os arquivos JSON: ' + error.message);
    }
}

// Chamar a função de carregamento para popular o cache quando o serviço é inicializado
// Não chamamos aqui, pois o _ensureContentLoaded fará isso sob demanda.
// loadAllContent(); // <--- Remova esta chamada direta aqui. Deixe o _ensureContentLoaded gerenciar.

const contentService = {
    _ensureContentLoaded: async () => {
        if (contentCache.modules.length === 0) { // Verifica se o cache está vazio
            await loadAllContent();
        }
    },

    // =========================================================
    // Métodos para Módulos
    // =========================================================
    async getAllModulesWithProgressSummary(userId) {
        await contentService._ensureContentLoaded();
        const { modules, units } = contentCache;

        if (!userId) {
            return modules.map(m => ({
                ...m,
                total_unidades: units.filter(u => u.id_modulo === m.id_modulo).length,
                unidades_concluidas: 0,
                progresso_percentual: 0
            }));
        }

        const allUserProgress = await ProgressoModel.getProgressoUsuario(userId);

        return modules.map(module => {
            const unitsInModule = units.filter(u => u.id_modulo === module.id_modulo);
            const totalUnits = unitsInModule.length;

            let completedUnits = 0;
            if (totalUnits > 0) {
                completedUnits = unitsInModule.filter(unit => {
                    const progress = allUserProgress.find(p => 
                        p.id_unidade === unit.id_unidade && 
                        p.id_modulo === module.id_modulo
                    );
                    return progress && progress.completo;
                }).length;
            }

            return {
                ...module,
                total_unidades: totalUnits,
                unidades_concluidas: completedUnits,
                progresso_percentual: totalUnits > 0 ? parseFloat(((completedUnits / totalUnits) * 100).toFixed(2)) : 0
            };
        });
    },

    async getModuleByIdWithUnitsAndProgress(moduleId, userId) {
        await contentService._ensureContentLoaded();
        const { modules, units } = contentCache;

        const module = modules.find(m => m.id_modulo === parseInt(moduleId, 10));
        if (!module) return null;

        let moduleUnits = units.filter(unit => unit.id_modulo === parseInt(moduleId, 10));

        if (userId) {
            const moduleProgress = await ProgressoModel.getProgressoUsuarioPorModulo(userId, parseInt(moduleId, 10));
            moduleUnits = moduleUnits.map(unit => {
                const progress = moduleProgress.find(p => p.id_unidade === unit.id_unidade);
                return {
                    ...unit,
                    concluido: progress ? progress.completo : false,
                    pontuacao: progress ? progress.pontuacao_unidade : 0
                };
            });
        } else {
            moduleUnits = moduleUnits.map(unit => ({ ...unit, concluido: false, pontuacao: 0 }));
        }

        return {
            ...module,
            unidades: moduleUnits
        };
    },

    // =========================================================
    // Métodos para Unidades
    // =========================================================
    async getUnitById(unitId) { 
        await contentService._ensureContentLoaded();
        const { units } = contentCache;
        return units.find(u => u.id_unidade === parseInt(unitId, 10));
    },

    async getUnitByIdWithDetails(unitId) { 
        await contentService._ensureContentLoaded();
        const { units, questions, explanations } = contentCache;

        const unit = units.find(u => u.id_unidade === parseInt(unitId, 10));
        if (!unit) return null;

        let unitQuestions = questions.filter(q => q.id_unidade === parseInt(unitId, 10));

        unitQuestions = unitQuestions.map(question => {
            const preExplanationsEntry = explanations.find(e => e.id_questao === question.id_questao && e.tipo === 'pre_questao');
            
            // CORREÇÃO AQUI: Acessar 'blocos' e verificar antes de sort
            const explanationBlocks = preExplanationsEntry && preExplanationsEntry.blocos 
                                        ? preExplanationsEntry.blocos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)) // Garante que 'ordem' existe
                                        : [];

            return {
                ...question,
                explicacoes_pre_questao: explanationBlocks
            };
        });

        return {
            ...unit,
            questoes: unitQuestions
        };
    },

    // =========================================================
    // Métodos para Questões
    // =========================================================
    async getQuestionsForUnit(unitId) {
        await contentService._ensureContentLoaded();
        const { questions, explanations } = contentCache;

        let unitQuestions = questions.filter(q => q.id_unidade === parseInt(unitId, 10));

        unitQuestions = unitQuestions.map(question => {
            const preExplanationsEntry = explanations.find(e => e.id_questao === question.id_questao && e.tipo === 'pre_questao');
            
            // CORREÇÃO AQUI: Acessar 'blocos' e verificar antes de sort
            const explanationBlocks = preExplanationsEntry && preExplanationsEntry.blocos
                                        ? preExplanationsEntry.blocos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                                        : [];

            return {
                ...question,
                explicacoes_pre_questao: explanationBlocks
            };
        });
        return unitQuestions;
    },

    async getQuestionById(questionId) {
        await contentService._ensureContentLoaded();
        const { questions, explanations } = contentCache;

        let question = questions.find(q => q.id_questao === parseInt(questionId, 10));
        if (!question) return null;

        const preExplanationsEntry = explanations.find(e => e.id_questao === question.id_questao && e.tipo === 'pre_questao');
        
        // CORREÇÃO AQUI: Acessar 'blocos' e verificar antes de sort
        const explanationBlocks = preExplanationsEntry && preExplanationsEntry.blocos
                                    ? preExplanationsEntry.blocos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                                    : [];

        question.explicacoes_pre_questao = explanationBlocks;

        return question;
    }
};

module.exports = contentService;