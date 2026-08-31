document.addEventListener("DOMContentLoaded", function () {

    const produtos = document.getElementById("btnProdutos");
    const lista = document.getElementById("listaProdutos");
    const setaProdutos = document.getElementById("setaProdutos");

    const pedido = document.getElementById("btnPedido");
    const areaPedido = document.getElementById("conteudoPedido");
    const setaPedido = document.getElementById("setaPedido");

    produtos.addEventListener("click", function () {
        lista.classList.toggle("fechado");

        setaProdutos.textContent =
            lista.classList.contains("fechado") ? "▼" : "▲";
    });

    pedido.addEventListener("click", function () {
        areaPedido.classList.toggle("fechado");

        setaPedido.textContent =
            areaPedido.classList.contains("fechado") ? "▼" : "▲";
    });

});
