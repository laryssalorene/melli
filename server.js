// server.js
require('dotenv').config(); // DEVE SER A PRIMEIRA LINHA EXECUTÁVEL

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
// const jwt = require('jsonwebtoken'); // Removido, pois não é usado diretamente aqui. JWT_SECRET é usado em auth.js

const cors = require('cors');

// Importar os modelos do banco de dados (apenas os que ainda usam o DB)
const UserModel = require('./scripts/models/Usuario');
const ProgressoModel = require('./scripts/models/Progresso');
const MascoteModel = require('./scripts/models/Mascote');

// <<-- REMOVIDO: const contentDataLoader = require('./scripts/data/contentDataLoader'); -->>
// O ContentService agora gerencia o carregamento de JSONs internamente e sob demanda.

// Importar as rotas
const userRoutes = require('./scripts/routes/userRoutes');
const contentRoutes = require('./scripts/routes/contentRoutes');
const authRoutes = require('./scripts/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Habilita o CORS para todas as rotas
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Servir arquivos estáticos (agora 'public' será a base)

// =======================================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// =======================================================
async function initializeDatabase() { // Renomeado para refletir que agora só inicializa o DB
    try {
        console.log("Iniciando verificação/criação de tabelas do banco de dados...");
        // Ordem importa por causa das chaves estrangeiras!
        await MascoteModel.createTable();
        await UserModel.createTable();
        await ProgressoModel.createTable();
        
        console.log("Adicionando mascotes padrão se não existirem...");
        await MascoteModel.addMascote('Melli', 'Um simpático robô-ajudante.', '/img/mascotes/melli.png');
        await MascoteModel.addMascote('Hero', 'Um super-herói corajoso.', '/img/mascotes/hero.png');
        await MascoteModel.addMascote('Amigo', 'Um animal de estimação leal.', '/img/mascotes/amigo.png');
        console.log("Mascotes padrão verificados/adicionados.");

        console.log("Tabelas do banco de dados verificadas/criadas com sucesso.");

        // <<-- REMOVIDO: contentDataLoader.loadData(); -->>
        // <<-- REMOVIDO: console.log("Dados de conteúdo (módulos, unidades, questões) carregados dos arquivos JSON."); -->>
        // A mensagem de carregamento dos JSONs virá do contentService na primeira vez que for acessado.
        console.log("Dados de conteúdo (JSONs) serão carregados sob demanda pelo ContentService.");

    } catch (error) {
        console.error("ERRO FATAL: Falha ao inicializar o banco de dados:", error);
        process.exit(1); // Encerra a aplicação se o banco de dados não puder ser inicializado
    }
}

// =======================================================
// ROTAS DA API
// =======================================================
app.use('/api/auth', authRoutes);     // Rotas de autenticação (cadastro, login)
app.use('/api/users', userRoutes);    // Rotas relacionadas ao perfil do usuário (getProfile)
app.use('/api', contentRoutes);       // Rotas de conteúdo (módulos, unidades, etc.)

// Rota principal para a página inicial (servir home.html na raiz)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
});

// =======================================================
// INICIAR SERVIDOR APÓS INICIALIZAÇÃO DO DB
// =======================================================
initializeDatabase().then(() => { // <<-- Renomeado para initializeDatabase
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}).catch(err => {
    console.error("ERRO: Aplicação não pôde ser iniciada devido a falha no DB.", err);
    process.exit(1);
});