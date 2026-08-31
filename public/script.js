let carrinho = [];

const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const logoLoja = document.getElementById("logoLoja");
const listaProdutos = document.getElementById("listaProdutos");
const listaCarrinho = document.getElementById("listaCarrinho");
const totalElemento = document.getElementById("total");
const btnWhatsApp = document.getElementById("btnWhatsApp");

nomeLoja.textContent = lojaConfig.nome;
descricaoLoja.textContent = lojaConfig.descricao;

if (lojaConfig.logo) {
    logoLoja.src = lojaConfig.logo;
} else {
    logoLoja.style.display = "none";
}

function formatarPreco(valor) {
    return valor.toLocaleString("pt-PT") + " " + lojaConfig.moeda;
}

function mostrarProdutos() {
    listaProdutos.innerHTML = "";

    if (produtos.length === 0) {
        listaProdutos.innerHTML = `
            <div class="sem-produtos">
                Ainda não existem produtos ou serviços publicados.
            </div>
        `;
        return;
    }

    produtos.forEach(produto => {
        const card = document.createElement("article");
        card.className = "produto";

        const icone = produto.imagem
            ? `
                <div class="produto-visual">
                    <img
                        src="${produto.imagem}"
                        alt="${produto.nome}"
                    >
                </div>
            `
            : `
                <div class="produto-visual produto-sem-imagem">
                    <span>
                        ${produto.tipo === "servico" ? "🛠️" : "📦"}
                    </span>
                </div>
            `;

        card.innerHTML = `
            ${icone}

            <div class="produto-conteudo">
                <h2>${produto.nome}</h2>

                <button
                    class="btn btn-ver-produto"
                    type="button"
                    onclick="verDetalhesProduto(${produto.id})">
                    Ver produto
                </button>
            </div>
        `;

        listaProdutos.appendChild(card);
    });
}

async function eliminarProduto(id) {

    const token = localStorage.getItem(
        "gc_angglobal_admin_token"
    );

    if (token !== "gc-angglobal-admin") {
        return;
    }

    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        return;
    }

    const confirmar = confirm(
        'Tem certeza que deseja eliminar "' +
        produto.nome +
        '"?'
    );

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(
            "/api/produtos/" + id,
            {
                method: "DELETE",
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível eliminar."
            );
        }

        await carregarProdutos();

        alert(
            "Produto/serviço eliminado com sucesso."
        );

    } catch (erro) {

        console.error(erro);

        alert(
            erro.message ||
            "Não foi possível eliminar o produto/serviço."
        );
    }
}


function verDetalhesProduto(id) {
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        return;
    }

    const detalhes = document.getElementById("detalhesProduto");
    const conteudo = document.getElementById("detalhesProdutoConteudo");

    const adminLogado =
        localStorage.getItem("gc_angglobal_admin_token") ===
        "gc-angglobal-admin";

    const imagem = produto.imagem
        ? `
            <div class="detalhes-imagem">
                <img
                    src="${produto.imagem}"
                    alt="${produto.nome}"
                >
            </div>
        `
        : `
            <div class="detalhes-imagem detalhes-sem-imagem">
                <span>
                    ${produto.tipo === "servico" ? "🛠️" : "📦"}
                </span>
            </div>
        `;

    const acoesAdmin = adminLogado
        ? `
            <div class="acoes-admin-detalhes">
                <button
                    class="btn btn-editar"
                    type="button"
                    onclick="editarProduto(${produto.id}); fecharDetalhesProduto();">
                    Editar
                </button>

                <button
                    class="btn btn-eliminar"
                    type="button"
                    onclick="eliminarProduto(${produto.id});">
                    Eliminar
                </button>
            </div>
        `
        : "";

    conteudo.innerHTML = `
        ${imagem}

        <div class="detalhes-info">

            <div class="detalhes-tipo">
                ${produto.tipo === "servico" ? "SERVIÇO" : "PRODUTO"}
            </div>

            <h2>${produto.nome}</h2>

            <div class="detalhes-preco">
                ${formatarPreco(produto.preco)}
            </div>

            <div class="detalhes-descricao">
                ${produto.descricao}
            </div>

            <button
                class="btn btn-adicionar detalhes-btn-adicionar"
                type="button"
                onclick="adicionarAoCarrinho(${produto.id}); fecharDetalhesProduto();">
                ${produto.tipo === "servico"
                    ? "Solicitar serviço"
                    : "Adicionar ao pedido"}
            </button>

            ${acoesAdmin}

        </div>
    `;

    detalhes.classList.remove("fechado");

    document.body.classList.add("produto-aberto");
}

function fecharDetalhesProduto() {
    const detalhes = document.getElementById("detalhesProduto");

    if (detalhes) {
        detalhes.classList.add("fechado");
    }

    document.body.classList.remove("produto-aberto");
}

document.addEventListener("DOMContentLoaded", () => {
    const btnFechar = document.getElementById("fecharDetalhesProduto");

    if (btnFechar) {
        btnFechar.addEventListener("click", fecharDetalhesProduto);
    }
});

function editarProduto(id) {

    const token = localStorage.getItem(
        "gc_angglobal_admin_token"
    );

    if (token !== "gc-angglobal-admin") {
        return;
    }

    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        return;
    }

    document.getElementById("tipoProduto").value =
        produto.tipo;

    document.getElementById("nomeProduto").value =
        produto.nome;

    document.getElementById("descricaoProduto").value =
        produto.descricao;

    document.getElementById("precoProduto").value =
        produto.preco;

    document.getElementById("imagemProduto").value = "";

    const formulario =
        document.getElementById("formularioProduto");

    formulario.classList.remove("fechado");

    const setaGerir =
        document.getElementById("setaGerir");

    setaGerir.textContent = "▲";

    const btnPublicar =
        document.getElementById("btnPublicar");

    btnPublicar.textContent = "Guardar alterações";

    btnPublicar.dataset.editandoId = id;

    const mensagem =
        document.getElementById("mensagemCadastro");

    mensagem.textContent =
        "A editar: " + produto.nome;

    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        return;
    }

    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1
        });
    }

    atualizarCarrinho();
}

function alterarQuantidade(id, quantidade) {
    const item = carrinho.find(item => item.id === id);

    if (!item) {
        return;
    }

    item.quantidade += quantidade;

    if (item.quantidade <= 0) {
        carrinho = carrinho.filter(item => item.id !== id);
    }

    atualizarCarrinho();
}

function calcularTotal() {
    return carrinho.reduce(
        (total, item) => total + (item.preco * item.quantidade),
        0
    );
}

function atualizarCarrinho() {
    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = `
            <p class="carrinho-vazio">
                O seu pedido está vazio.
            </p>
        `;

        totalElemento.textContent =
            "Total: " + formatarPreco(0);

        btnWhatsApp.style.display = "none";

        return;
    }

    listaCarrinho.innerHTML = "";

    carrinho.forEach(item => {
        const elemento = document.createElement("div");
        elemento.className = "item-carrinho";

        const subtotal = item.preco * item.quantidade;

        elemento.innerHTML = `
            <div>
                <strong>${item.nome}</strong><br>
                ${formatarPreco(subtotal)}
            </div>

            <div class="quantidade">
                <button onclick="alterarQuantidade(${item.id}, -1)">
                    −
                </button>

                <strong>${item.quantidade}</strong>

                <button onclick="alterarQuantidade(${item.id}, 1)">
                    +
                </button>
            </div>
        `;

        listaCarrinho.appendChild(elemento);
    });

    totalElemento.textContent =
        "Total: " + formatarPreco(calcularTotal());

    btnWhatsApp.style.display = "block";
}

function finalizarPedido() {
    if (carrinho.length === 0) {
        return;
    }

    let mensagem = `Olá! Gostaria de fazer um pedido na ${lojaConfig.nome}.\n\n`;

    mensagem += "Meu pedido:\n";

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;

        mensagem +=
            `- ${item.nome} x${item.quantidade} — ${formatarPreco(subtotal)}\n`;
    });

    mensagem += `\nTotal: ${formatarPreco(calcularTotal())}`;

    const telefone = lojaConfig.numeroWhatsApp.replace(/\D/g, "");

    const url =
        `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
}

btnWhatsApp.addEventListener("click", finalizarPedido);

mostrarProdutos();
atualizarCarrinho();

function alternarProdutos() {
    const area = document.getElementById("listaProdutos");
    const seta = document.getElementById("setaProdutos");

    area.classList.toggle("fechado");

    if (area.classList.contains("fechado")) {
        seta.textContent = "▼";
    } else {
        seta.textContent = "▲";
    }
}

function alternarPedido() {
    const area = document.getElementById("conteudoPedido");
    const seta = document.getElementById("setaPedido");

    area.classList.toggle("fechado");

    if (area.classList.contains("fechado")) {
        seta.textContent = "▼";
    } else {
        seta.textContent = "▲";
    }
}
