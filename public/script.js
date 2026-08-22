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
                    ${produto.tipo === "servico" ? "Solicitar serviço" : "Adicionar ao pedido"}
                </button>

                <div
                    class="acoes-admin"
                    data-admin-id="${produto.id}"
                    style="display:none; margin-top:10px;">

                    <button
                        class="btn btn-editar"
                        onclick="editarProduto(${produto.id})">
                        ✏️ Editar
                    </button>

                    <button
                        class="btn btn-eliminar"
                        onclick="eliminarProduto(${produto.id})">
                        🗑️ Eliminar
                    </button>

                </div>
            </div>
        `;

        listaProdutos.appendChild(card);
    });

    const adminLogado =
        localStorage.getItem("whatsapp_shop_admin_token") ===
        "whatsapp-shop-admin";

    document.querySelectorAll(".acoes-admin").forEach(area => {
        area.style.display = adminLogado ? "block" : "none";
    });
}

async function eliminarProduto(id) {

    const token = localStorage.getItem(
        "whatsapp_shop_admin_token"
    );

    if (token !== "whatsapp-shop-admin") {
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

function editarProduto(id) {

    const token = localStorage.getItem(
        "whatsapp_shop_admin_token"
    );

    if (token !== "whatsapp-shop-admin") {
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
