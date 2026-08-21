document.addEventListener("DOMContentLoaded", function () {

    alert("navigation.js carregou!");

    const produtos = document.getElementById("btnProdutos");
    const lista = document.getElementById("listaProdutos");

    const pedido = document.getElementById("btnPedido");
    const areaPedido = document.getElementById("conteudoPedido");

    produtos.onclick = function () {
        lista.style.display =
            lista.style.display === "none" ? "flex" : "none";
    };

    pedido.onclick = function () {
        areaPedido.style.display =
            areaPedido.style.display === "none" ? "block" : "none";
    };

});
