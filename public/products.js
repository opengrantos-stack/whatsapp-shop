let produtos = [];
let lojasVitrine = [];
let lojaSelecionada = null;


// ==================== CARREGAR LOJAS ====================

async function carregarLojasVitrine() {

    const seletor = document.getElementById("seletorLojaVitrine");
    const mensagem = document.getElementById("mensagemSelecaoLoja");

    if (!seletor) {
        return;
    }

    try {

        const resposta = await fetch("/api/lojas");
        const lojas = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                lojas.erro || "Não foi possível carregar as lojas."
            );
        }

        lojasVitrine = lojas;

        seletor.innerHTML =
            '<option value="">Selecione uma loja</option>';

        lojas.forEach(function (loja) {

            const opcao = document.createElement("option");

            opcao.value = loja.id;
            opcao.textContent = loja.nome;

            seletor.appendChild(opcao);
        });

        mensagem.textContent =
            lojas.length
                ? "Selecione uma loja para ver os produtos e serviços."
                : "Ainda não existem lojas disponíveis.";

    } catch (erro) {

        console.error("Erro ao carregar lojas:", erro);

        mensagem.textContent =
            "Não foi possível carregar as lojas.";
    }
}


// ==================== CARREGAR PRODUTOS DA LOJA ====================

async function carregarProdutosDaLoja(lojaId) {

    try {

        const resposta =
            await fetch("/api/lojas/" + lojaId + "/produtos");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar produtos da loja.");
        }

        const dados = await resposta.json();

        produtos = dados.map(produto => ({
            ...produto,
            id: Number(produto.id),
            preco: Number(produto.preco),
            loja_id: Number(produto.loja_id)
        }));

        mostrarProdutos();

    } catch (erro) {

        console.error(
            "Erro ao carregar produtos da loja:",
            erro
        );

        produtos = [];

        mostrarProdutos();
    }
}


// ==================== SELEÇÃO DA LOJA ====================

function configurarSelecaoLoja() {

    const seletor =
        document.getElementById("seletorLojaVitrine");

    const mensagem =
        document.getElementById("mensagemSelecaoLoja");

    if (!seletor) {
        return;
    }

    seletor.addEventListener("change", async function () {

        const lojaId = seletor.value;

        if (!lojaId) {

            lojaSelecionada = null;
            produtos = [];

            mensagem.textContent =
                "Selecione uma loja para ver os produtos e serviços.";

            mostrarProdutos();

            return;
        }

        lojaSelecionada =
            lojasVitrine.find(
                loja => String(loja.id) === String(lojaId)
            );

        if (lojaSelecionada) {

            mensagem.textContent =
                "Loja selecionada: " +
                lojaSelecionada.nome;

        }

        await carregarProdutosDaLoja(lojaId);
    });
}


// ==================== INICIALIZAÇÃO ====================

async function inicializarVitrine() {

    await carregarLojasVitrine();

    configurarSelecaoLoja();

}

document.addEventListener(
    "DOMContentLoaded",
    inicializarVitrine
);
