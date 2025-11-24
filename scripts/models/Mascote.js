// scripts/models/Mascote.js
const { run, get, all } = require('../db');

class Mascote {
    constructor(data) { // O construtor deve aceitar um objeto 'data' do DB
        this.id_mascote = data.id_mascote;
        this.nome = data.nome;
        this.descricao = data.descricao;
        // this.imagem_url = data.imagem_url; // Removido da tabela, então não passe aqui
    }

    static async createTable() {
        await run(`
            CREATE TABLE IF NOT EXISTS Mascote (
                id_mascote INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                descricao TEXT
                -- imagem_url TEXT -- Removido para simplificar, se não estiver no DB
            )
        `);
        console.log("Tabela 'Mascote' verificada/criada.");
    }

    /**
     * Encontra um mascote pelo seu nome.
     * @param {string} nome - O nome do mascote a ser encontrado.
     * @returns {Mascote|null} O objeto Mascote se encontrado, ou null.
     */
    static async findByName(nome) {
        const row = await get('SELECT id_mascote, nome, descricao FROM Mascote WHERE nome = ? COLLATE NOCASE', [nome]);
        return row ? new Mascote(row) : null;
    }

    /**
     * Insere um novo mascote no banco de dados se não existir.
     * @param {string} nome - O nome do mascote.
     * @param {string} descricao - A descrição do mascote.
     * @returns {Mascote|null} O objeto Mascote criado ou existente, ou null em caso de erro.
     */
    static async addMascote(nome, descricao) { 
        try {
            const existingMascote = await this.findByName(nome);
            if (existingMascote) {
                console.log(`Mascote com nome "${nome}" já existe, pulando inserção.`);
                return existingMascote;
            }

            const result = await run(
                'INSERT INTO Mascote (nome, descricao) VALUES (?, ?)',
                [nome, descricao]
            );
            // Retorna uma nova instância de Mascote para o recém-criado
            return new Mascote({ id_mascote: result.lastID, nome, descricao });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Mascote.nome')) {
                console.log(`Mascote com nome "${nome}" já existe (conflito UNIQUE), pulando inserção.`);
                return null; // Poderíamos tentar buscar novamente, mas o findByName já resolve isso.
            }
            throw err; 
        }
    }

    /**
     * Encontra um mascote pelo seu ID numérico.
     * @param {number} id - O ID numérico do mascote a ser encontrado.
     * @returns {Mascote|null} O objeto Mascote se encontrado, ou null.
     */
    static async findById(id) { 
        const row = await get('SELECT id_mascote, nome, descricao FROM Mascote WHERE id_mascote = ?', [id]);
        return row ? new Mascote(row) : null;
    }

    /**
     * Retorna todos os mascotes do banco de dados.
     * @returns {Array<Mascote>} Uma lista de objetos Mascote.
     */
    static async getAllMascotes() {
        const rows = await all('SELECT id_mascote, nome, descricao FROM Mascote ORDER BY id_mascote ASC');
        return rows.map(row => new Mascote(row));
    }
}

// =========================================================================
// Lógica de Inicialização: Popula com os nomes e descrições
// =========================================================================
Mascote.createTable().then(async () => {
    // === OS NOMES ABAIXO SÃO CRUCIAIS PARA BATER COM O SEU FRONTEND E DATABASE ===
    const mascotesIniciais = [
        { nome: 'Monstrinho Insulina', descricao: 'Monstrinho fofo que carrega insulina.' },
        { nome: 'Coelho Glicosímetro', descricao: 'Coelho glicosímetro.' },
        { nome: 'Caneta de insulina Aventureira', descricao: 'Caneta de insulina aventureira.' },
    ];

    console.log("Verificando e populando mascotes iniciais...");
    for (const mascoteData of mascotesIniciais) {
        // Agora addMascote só precisa do nome e descrição
        await Mascote.addMascote(mascoteData.nome, mascoteData.descricao);
    }
    console.log("População de mascotes iniciais concluída.");

}).catch(err => {
    console.error("Erro fatal ao inicializar tabela de Mascote:", err);
    process.exit(1);
});

module.exports = Mascote;