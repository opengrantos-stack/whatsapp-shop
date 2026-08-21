let carrinho = [];

const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const listaProdutos = document.getElementById("listaProdutos");
const listaCarrinho = document.getElementById("listaCarrinho");
const totalElemento = document.getElementById("total");
const btnWhatsApp = document.getElementById("btnWhatsApp");

nomeLoja.textContent = lojaConfig.nome;
descricaoLoja.textContent = lojaConfig.descricao;

function formatarPreco(valor) {
    return valor.toLocaleString("pt-PT") + " " + lojaConfig.moeda;
}

function mostrarProdutos() {
    listaProdutos.innerHTML = "";

    produtos.forEach(produto => {
        const card = document.createElement("article");
        card.className = "produto";

        let imagem = "";

        if (produto.imagem) {
            imagem = `
                <div class="produto-imagem">
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
            `;
        } else {
            imagem = `
                <div class="produto-imagem">
                    Sem imagem
                </div>
            `;
        }

        card.innerHTML = `
            ${imagem}

            <div class="produto-conteudo">
                <h2>${produto.nome}</h2>

                <p class="produto-descricao">
                    ${produto.descricao}
                </p>

                <div class="preco">
                    ${formatarPreco(produto.preco)}
                </div>

                <button
                    class="btn btn-adicionar"
                    onclick="adicionarAoCarrinho(${produto.id})">
                    Adicionar ao pedido
                </button>
            </div>
        `;

        listaProdutos.appendChild(card);
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
