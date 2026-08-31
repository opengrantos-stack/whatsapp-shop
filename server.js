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
            CREATE TABLE IF NOT EXISTS gc_angglobal_stores (
                id BIGSERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descricao TEXT DEFAULT '',
                logo TEXT DEFAULT '',
                whatsapp TEXT DEFAULT '',
                ativo BOOLEAN DEFAULT TRUE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_products (
                id BIGINT PRIMARY KEY,
                tipo VARCHAR(20) NOT NULL,
                nome TEXT NOT NULL,
                descricao TEXT NOT NULL,
                preco NUMERIC(15,2) NOT NULL,
                imagem TEXT DEFAULT '',
                loja_id BIGINT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_products
            ADD COLUMN IF NOT EXISTS loja_id BIGINT
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_gc_angglobal_products_loja
            ON gc_angglobal_products(loja_id)
        `);

        console.log('Banco de dados do GC-AngGlobal preparado para múltiplas lojas.');
    } catch (erro) {
        console.error('Erro ao preparar banco:', erro.message);
    }
}

app.get('/api/produtos', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, tipo, nome, descricao, preco, imagem, loja_id
            FROM gc_angglobal_products
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
        token: 'gc-angglobal-admin'
    });
});


function verificarAdmin(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (autorizacao !== 'Bearer gc-angglobal-admin') {
        return res.status(401).json({
            erro: 'É necessário entrar como administrador.'
        });
    }

    next();
}


// ==================== API DE LOJAS ====================

app.get('/api/lojas', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, nome, descricao, logo, whatsapp, ativo, criado_em
            FROM gc_angglobal_stores
            WHERE ativo = TRUE
            ORDER BY criado_em DESC
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar lojas:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível carregar as lojas.'
        });
    }
});


app.post('/api/lojas', verificarAdmin, async (req, res) => {
    try {
        const {
            nome,
            descricao,
            logo,
            whatsapp
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                erro: 'O nome da loja é obrigatório.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO gc_angglobal_stores
            (nome, descricao, logo, whatsapp)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, descricao, logo, whatsapp, ativo, criado_em
        `, [
            nome,
            descricao || '',
            logo || '',
            whatsapp || ''
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Loja criada com sucesso.',
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao criar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível criar a loja.'
        });
    }
});


app.put('/api/lojas/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            descricao,
            logo,
            whatsapp,
            ativo
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                erro: 'O nome da loja é obrigatório.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET
                nome = $1,
                descricao = $2,
                logo = $3,
                whatsapp = $4,
                ativo = COALESCE($5, ativo)
            WHERE id = $6
            RETURNING id, nome, descricao, logo, whatsapp, ativo, criado_em
        `, [
            nome,
            descricao || '',
            logo || '',
            whatsapp || '',
            ativo,
            id
        ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Loja não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Loja atualizada.',
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao editar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível editar a loja.'
        });
    }
});


app.delete('/api/lojas/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET ativo = FALSE
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Loja não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Loja desativada.'
        });

    } catch (erro) {
        console.error('Erro ao desativar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível desativar a loja.'
        });
    }
});


// Produtos por loja
app.get('/api/lojas/:id/produtos', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT id, tipo, nome, descricao, preco, imagem, loja_id
            FROM gc_angglobal_products
            WHERE loja_id = $1
            ORDER BY criado_em DESC
        `, [id]);

        res.json(resultado.rows);

    } catch (erro) {
        console.error('Erro ao buscar produtos da loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível carregar os produtos da loja.'
        });
    }
});


app.post('/api/produtos', verificarAdmin, async (req, res) => {
    try {
        const {
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem,
            loja_id
        } = req.body;

        if (!id || !tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        await pool.query(`
            INSERT INTO gc_angglobal_products
            (id, tipo, nome, descricao, preco, imagem, loja_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                tipo = EXCLUDED.tipo,
                nome = EXCLUDED.nome,
                descricao = EXCLUDED.descricao,
                preco = EXCLUDED.preco,
                imagem = EXCLUDED.imagem,
                loja_id = EXCLUDED.loja_id
        `, [
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem || '',
            loja_id || null
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço guardado.'
        });

    } catch (erro) {
        console.error('ERRO COMPLETO AO GUARDAR:', erro);
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
            imagem,
            loja_id
        } = req.body;

        if (!tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_products
            SET
                tipo = $1,
                nome = $2,
                descricao = $3,
                preco = $4,
                imagem = $5,
                loja_id = $6
            WHERE id = $7
            RETURNING id, tipo, nome, descricao, preco, imagem, loja_id
        `, [
            tipo,
            nome,
            descricao,
            preco,
            imagem || '',
            loja_id || null,
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
            DELETE FROM gc_angglobal_products
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
