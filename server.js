// server.js (CORRIGIDO)
require('dotenv').config(); 

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Importar TODOS os modelos para garantir que suas tabelas sejam criadas
const UsuarioModel = require('./scripts/models/Usuario');
const MascoteModel = require('./scripts/models/Mascote');
const ProgressoModel = require('./scripts/models/Progresso'); // Importação correta

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
// INICIALIZAÇÃO DO BANCO DE DADOS (AGORA COMPLETA E CENTRALIZADA)
// =======================================================
async function initializeDatabase() {
    try {
        console.log("Iniciando verificação/criação de tabelas do banco de dados...");
        
        // Chamadas para criar TODAS as tabelas dos modelos
        await MascoteModel.createTable(); // Este modelo já deve popular seus mascotes padrão
        await UsuarioModel.createTable();
        await ProgressoModel.createTable(); // <--- AGORA ESTÁ AQUI!

        console.log("Todas as tabelas foram verificadas/criadas com sucesso.");
        // A lógica de adicionar mascotes padrão DEVE estar dentro de MascoteModel.createTable()
        // Ou em um script de populamento separado chamado AQUI.
        // Se MascoteModel.createTable() já inclui essa lógica, as mensagens abaixo podem ser removidas
        // para evitar duplicação ou confundir que elas estão sendo feitas aqui.
        // Por hora, vou mantê-las apenas como indicação que isso DEVERIA acontecer.
        console.log("Mascotes padrão verificados/adicionados (se a lógica estiver no MascoteModel).");
        console.log("Dados de conteúdo (JSONs) serão carregados sob demanda pelo ContentService.");

    } catch (error) {
        console.error("ERRO FATAL: Falha ao inicializar o banco de dados:", error);
        process.exit(1); // Encerra o processo se o DB não puder ser inicializado
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