let produtos = [];

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar produtos.");
        }

        const dados = await resposta.json();

        produtos = dados.map(produto => ({
            ...produto,
            id: Number(produto.id),
            preco: Number(produto.preco)
        }));

        mostrarProdutos();

    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);

        produtos = [{
            id: 999999,
            tipo: "produto",
            nome: "Produto de teste",
            descricao: "Este é apenas um produto temporário para testar a nova apresentação e a área de detalhes.",
            preco: 15000,
            imagem: ""
        }];

        mostrarProdutos();
    }
}

document.addEventListener("DOMContentLoaded", carregarProdutos);
