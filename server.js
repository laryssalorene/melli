// server.js
require('dotenv').config(); // DEVE SER A PRIMEIRA LINHA EXECUTÁVEL

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const cors = require('cors');

// Importar os modelos do banco de dados
const UserModel = require('./scripts/models/Usuario');
const ProgressoModel = require('./scripts/models/Progresso');
const MascoteModel = require('./scripts/models/Mascote');

// Importar as rotas
const userRoutes = require('./scripts/routes/userRoutes');
const contentRoutes = require('./scripts/routes/contentRoutes');
const authRoutes = require('./scripts/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Habilita o CORS para todas as rotas
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// =======================================================
// DEFINIÇÃO DA RAIZ DOS ARQUIVOS ESTÁTICOS
// =======================================================
// Se você está executando o 'npm run dev' da pasta 'melli',
// então 'process.cwd()' é 'C:\Users\larys\Downloads\mellijson\mellijson\melli'.
// A pasta 'public' está diretamente em 'melli'.
const PUBLIC_DIR = path.join(process.cwd(), 'public');

console.log('PUBLIC_DIR (calculado):', PUBLIC_DIR); // Para sua verificação

// Servir a pasta 'public' diretamente.
// Isso significa que 'public/html/index.html' será acessível em '/html/index.html',
// 'public/css/style.css' será acessível em '/css/style.css', etc.
app.use(express.static(PUBLIC_DIR));

// =======================================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// =======================================================
async function initializeDatabase() {
    try {
        console.log("Iniciando verificação/criação de tabelas do banco de dados...");
        await MascoteModel.createTable();
        await UserModel.createTable();
        await ProgressoModel.createTable(); // Certifique-se que ProgressoModel usa o nome de tabela correto
        
        console.log("Adicionando mascotes padrão se não existirem...");
        await MascoteModel.addMascote('Melli', 'Um simpático robô-ajudante.', '/img/mascotes/melli.png');
        await MascoteModel.addMascote('Hero', 'Um super-herói corajoso.', '/img/mascotes/hero.png');
        await MascoteModel.addMascote('Amigo', 'Um animal de estimação leal.', '/img/mascotes/amigo.png');
        console.log("Mascotes padrão verificados/adicionados.");

        console.log("Tabelas do banco de dados verificadas/criadas com sucesso.");
        console.log("Dados de conteúdo (JSONs) serão carregados sob demanda pelo ContentService.");

    } catch (error) {
        console.error("ERRO FATAL: Falha ao inicializar o banco de dados:", error);
        process.exit(1);
    }
}

// =======================================================
// ROTAS DA API - APÓS OS ARQUIVOS ESTÁTICOS
// =======================================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', contentRoutes); // Mantido '/api' como prefixo para contentRoutes


// =======================================================
// ROTA DE FALLBACK PARA O index.html (SPA)
// =======================================================
// Qualquer rota que não corresponder às rotas da API ou a um arquivo estático direto,
// será redirecionada para o index.html principal.
// SEU FRONTEND (JavaScript) DEVE ENTÃO LIDAR COM O ROTEAMENTO.
app.get('*', (req, res) => {
    // A rota raiz do HTML agora é 'public/html/index.html'
    const indexPath = path.join(PUBLIC_DIR, 'html', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Erro ao enviar index.html na rota fallback:', err);
            // Um 404 para o index.html aqui é mais provável se o caminho estiver errado.
            if (err.code === 'ENOENT') {
                 return res.status(404).send('Página inicial (index.html) não encontrada no servidor.');
            }
            res.status(500).send('Erro interno do servidor ao carregar a página.');
        }
    });
});


// =======================================================
// INICIAR SERVIDOR APÓS INICIALIZAÇÃO DO DB
// =======================================================
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}).catch(err => {
    console.error("ERRO: Aplicação não pôde ser iniciada devido a falha no DB.", err);
    process.exit(1);
});