document.addEventListener("DOMContentLoaded", function () {

    const btnProdutos = document.getElementById("btnProdutos");
    const listaProdutos = document.getElementById("listaProdutos");
    const setaProdutos = document.getElementById("setaProdutos");

    const btnPedido = document.getElementById("btnPedido");
    const conteudoPedido = document.getElementById("conteudoPedido");
    const setaPedido = document.getElementById("setaPedido");

    btnProdutos.addEventListener("click", function () {
        listaProdutos.classList.toggle("fechado");

        setaProdutos.textContent =
            listaProdutos.classList.contains("fechado") ? "▼" : "▲";
    });

    btnPedido.addEventListener("click", function () {
        conteudoPedido.classList.toggle("fechado");

        setaPedido.textContent =
            conteudoPedido.classList.contains("fechado") ? "▼" : "▲";
    });

});
