// server.js (CORRIGIDO)
require('dotenv').config(); 

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Importar os modelos do banco de dados (isso já garante que db.js é executado e inicializa tabelas)
const UserModel = require('./scripts/models/Usuario');
const ProgressoModel = require('./scripts/models/Progresso');
const MascoteModel = require('./scripts/models/Mascote');

// Importar as rotas
const userRoutes = require('./scripts/routes/userRoutes');
const contentRoutes = require('./scripts/routes/contentRoutes');
const authRoutes = require('./scripts/routes/authRoutes'); // Importar o roteador de autenticação

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); 
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(process.cwd(), 'public');
console.log('PUBLIC_DIR (calculado):', PUBLIC_DIR); 
app.use(express.static(PUBLIC_DIR));

// =======================================================
// INICIALIZAÇÃO DO BANCO DE DADOS (AGORA SIMPLIFICADA)
// =======================================================
async function initializeDatabase() {
    try {
        console.log("Iniciando verificação/criação de tabelas do banco de dados...");
        
        console.log("Adicionando mascotes padrão se não existirem...");
        await MascoteModel.addMascote('Melli', 'Um simpático robô-ajudante.', '/img/mascotes/melli.png');
        await MascoteModel.addMascote('Hero', 'Um super-herói corajoso.', '/img/mascotes/hero.png');
        await MascoteModel.addMascote('Amigo', 'Um animal de estimação leal.', '/img/mascotes/amigo.png');
        console.log("Mascotes padrão verificados/adicionados.");

        console.log("Tabelas do banco de dados verificadas/criadas com sucesso (via scripts/db.js).");
        console.log("Dados de conteúdo (JSONs) serão carregados sob demanda pelo ContentService.");

    } catch (error) {
        console.error("ERRO FATAL: Falha ao inicializar o banco de dados:", error);
        process.exit(1);
    }
}

// =======================================================
// ROTAS DA API - APÓS OS ARQUIVOS ESTÁTICOS
// =======================================================
app.use('/api/auth', authRoutes); // Todas as rotas de autenticação (register, login)
app.use('/api/users', userRoutes); // Todas as rotas de gerenciamento de usuário (perfil, redefinição, etc.)
app.use('/api', contentRoutes); // Outras rotas de conteúdo

// =======================================================
// ROTA DE FALLBACK PARA O index.html (SPA)
// =======================================================
app.get('*', (req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'html', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Erro ao enviar index.html na rota fallback:', err);
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