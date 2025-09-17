const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Inicializa o banco de dados
require('./scripts/db');

// Rotas da sua API
const authRoutes = require('./scripts/routes/authRoutes');
const contentRoutes = require('./scripts/routes/contentRoutes');
const userRoutes = require('./scripts/routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares essenciais
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --------------------------------------------------------------------------
// ORDEM CRÍTICA: ROTAS DA API DEVEM VIR ANTES DOS ARQUIVOS ESTÁTICOS
// --------------------------------------------------------------------------

// 1. Usar as rotas da sua API (TODAS as rotas da API aqui)
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', userRoutes); 

// 2. Servir arquivos estáticos do frontend (sua pasta 'public')
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'html')));

// 3. Rota padrão para a página inicial (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

// Este middleware deve ser o ÚLTIMO na cadeia para capturar requisições que não foram tratadas por NADA acima.
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'html', '404.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});