let produtos = [];

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar produtos.");
        }

        produtos = await resposta.json();

        mostrarProdutos();

    } catch (erro) {
        console.error(erro);

        produtos = [];

        mostrarProdutos();
    }
}

document.addEventListener("DOMContentLoaded", carregarProdutos);
