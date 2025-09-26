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
// DEFINIÇÃO DA RAIZ DO PROJETO E CAMINHOS (CORRIGIDO)
// =======================================================
// Seu server.js está em `C:\Users\larys\Downloads\mellijson\mellijson\melli\scripts\server.js`
// Para chegar na pasta `melli`, que é a raiz do seu projeto, precisamos subir um nível de `scripts`.
// Então, `path.resolve(__dirname, '..')` já aponta para `C:\Users\larys\Downloads\mellijson\mellijson\melli`.
// Minha interpretação anterior de que você estava executando de outro lugar estava errada.
// O problema era que a pasta `melli` NÃO ESTAVA SENDO CONSIDERADA PARTE DO `PROJECT_ROOT`
// Pelo que você me passou, a sua raiz do projeto É A PASTA ONDE ESTÁ `melli`, `public`, etc.
//
// Nova lógica: se o `server.js` está em `C:\Users\larys\Downloads\mellijson\mellijson\melli\scripts`,
// então o diretório do seu projeto *para o Express* é `C:\Users\larys\Downloads\mellijson\mellijson\melli`.
// O `path.resolve(__dirname, '..')` na verdade te leva para `C:\Users\larys\Downloads\mellijson\mellijson\melli`.
//
// O erro era que o comando `npm run dev` estava sendo executado de `C:\Users\larys\Downloads\mellijson\mellijson`
// ou que o `__dirname` estava se comportando de forma diferente do esperado pelo Nodemon/Node.
//
// Vamos consertar isso DEFINITIVAMENTE usando `process.cwd()` ou ajustando a profundidade.
//
// Se o seu `package.json` está em `C:\Users\larys\Downloads\mellijson\mellijson\melli`,
// então `process.cwd()` DEVE ser `C:\Users\larys\Downloads\mellijson\mellijson\melli`.
// E `server.js` está em `C:\Users\larys\Downloads\mellijson\mellijson\melli\scripts`.

// Opção 1: Usar `process.cwd()` se o `package.json` está na raiz `melli`
const PROJECT_ROOT = process.cwd(); // Este deve ser `C:\Users\larys\Downloads\mellijson\mellijson\melli` se você executa `npm run dev` DESTA PASTA.

// Opção 2: Se `npm run dev` é executado de `mellijson\mellijson`, e `melli` é um subdiretório.
// const PROJECT_ROOT = path.resolve(__dirname, '..'); // Volta para `melli`
// Se o PROJECT_ROOT ainda estiver errado, podemos forçar o caminho
// const PROJECT_ROOT = 'C:\\Users\\larys\\Downloads\\mellijson\\mellijson\\melli'; // Hardcoded para testar

console.log('PROJECT_ROOT (definido):', PROJECT_ROOT); // Para sua verificação

// Caminho para a pasta 'public'
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
console.log('PUBLIC_DIR (definido):', PUBLIC_DIR); // Para sua verificação

// Caminho absoluto para o index.html
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, 'html', 'index.html');
console.log('INDEX_HTML_PATH (definido):', INDEX_HTML_PATH); // Para sua verificação


// =======================================================
// CONFIGURAÇÃO DOS ARQUIVOS ESTÁTICOS - DEVE VIR PRIMEIRO
// =======================================================
// A partir da PUBLIC_DIR, os arquivos podem ser acessados diretamente.
// Ex: `public/styles/index.css` é acessível via `/styles/index.css`
app.use(express.static(PUBLIC_DIR)); 


// =======================================================
// ROTA PRINCIPAL PARA A PÁGINA INICIAL - APÓS OS ESTÁTICOS
// =======================================================
app.get('/', (req, res) => {
    res.sendFile(INDEX_HTML_PATH, (err) => {
        if (err) {
            console.error('Erro ao enviar index.html:', err);
            if (err.code === 'ENOENT') {
                return res.status(404).send('Página inicial não encontrada.');
            }
            res.status(500).send('Erro interno do servidor ao carregar a página.');
        }
    });
});


// =======================================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// =======================================================
async function initializeDatabase() {
    try {
        console.log("Iniciando verificação/criação de tabelas do banco de dados...");
        await MascoteModel.createTable();
        await UserModel.createTable();
        await ProgressoModel.createTable();
        
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
// ROTAS DA API - APÓS OS ESTÁTICOS E ROTA PRINCIPAL
// =======================================================
app.use('/api/auth', authRoutes);     // Rotas de autenticação (cadastro, login)
app.use('/api/users', userRoutes);    // Rotas relacionadas ao perfil do usuário (getProfile)
app.use('/api', contentRoutes);       // Rotas de conteúdo (módulos, unidades, etc.)


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