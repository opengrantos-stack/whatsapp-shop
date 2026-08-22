const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

async function prepararBanco() {
    if (!process.env.DATABASE_URL) {
        console.log('DATABASE_URL não configurada.');
        return;
    }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_products (
                id BIGINT PRIMARY KEY,
                tipo VARCHAR(20) NOT NULL,
                nome TEXT NOT NULL,
                descricao TEXT NOT NULL,
                preco NUMERIC(15,2) NOT NULL,
                imagem TEXT DEFAULT '',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Banco de dados do GC-AngGlobal preparado.');
    } catch (erro) {
        console.error('Erro ao preparar banco:', erro.message);
    }
}

app.get('/api/produtos', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, tipo, nome, descricao, preco, imagem
            FROM whatsapp_products
            ORDER BY criado_em DESC
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar produtos:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível carregar os produtos.'
        });
    }
});


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            erro: 'Senha incorreta.'
        });
    }

    res.json({
        sucesso: true,
        token: 'whatsapp-shop-admin'
    });
});


function verificarAdmin(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (autorizacao !== 'Bearer whatsapp-shop-admin') {
        return res.status(401).json({
            erro: 'É necessário entrar como administrador.'
        });
    }

    next();
}

app.post('/api/produtos', verificarAdmin, async (req, res) => {
    try {
        const {
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem
        } = req.body;

        if (!id || !tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        await pool.query(`
            INSERT INTO whatsapp_products
            (id, tipo, nome, descricao, preco, imagem)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                tipo = EXCLUDED.tipo,
                nome = EXCLUDED.nome,
                descricao = EXCLUDED.descricao,
                preco = EXCLUDED.preco,
                imagem = EXCLUDED.imagem
        `, [
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem || ''
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço guardado.'
        });

    } catch (erro) {
        console.error('Erro ao guardar:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível guardar o produto.'
        });
    }
});


app.put('/api/produtos/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tipo,
            nome,
            descricao,
            preco,
            imagem
        } = req.body;

        if (!tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        const resultado = await pool.query(`
            UPDATE whatsapp_products
            SET
                tipo = $1,
                nome = $2,
                descricao = $3,
                preco = $4,
                imagem = $5
            WHERE id = $6
            RETURNING id, tipo, nome, descricao, preco, imagem
        `, [
            tipo,
            nome,
            descricao,
            preco,
            imagem || '',
            id
        ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Produto/serviço não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço atualizado.',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao editar:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível editar o produto/serviço.'
        });
    }
});


app.delete('/api/produtos/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            DELETE FROM whatsapp_products
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Produto/serviço não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço eliminado.'
        });

    } catch (erro) {
        console.error('Erro ao eliminar:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível eliminar o produto/serviço.'
        });
    }
});

prepararBanco();

app.listen(port, () => {
    console.log('Servidor a rodar em http://localhost:' + port);
});
