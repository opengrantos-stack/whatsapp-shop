document.addEventListener("DOMContentLoaded", function () {

    const btnGerir = document.getElementById("btnGerir");
    const formulario = document.getElementById("formularioProduto");
    const setaGerir = document.getElementById("setaGerir");

    const btnPublicar = document.getElementById("btnPublicar");
    const mensagem = document.getElementById("mensagemCadastro");

    btnGerir.addEventListener("click", function () {

        formulario.classList.toggle("fechado");

        setaGerir.textContent =
            formulario.classList.contains("fechado") ? "▼" : "▲";
    });

    btnPublicar.addEventListener("click", function () {

        const tipo = document.getElementById("tipoProduto").value;
        const nome = document.getElementById("nomeProduto").value.trim();
        const descricao = document.getElementById("descricaoProduto").value.trim();
        const preco = Number(document.getElementById("precoProduto").value);
        const arquivo = document.getElementById("imagemProduto").files[0];

        if (!nome || !descricao || !preco) {
            mensagem.textContent =
                "Preencha o tipo, nome, descrição e preço.";

            return;
        }

        function publicar(imagem) {

            const novoProduto = {
                id: Date.now(),
                tipo: tipo,
                nome: nome,
                descricao: descricao,
                preco: preco,
                imagem: imagem || ""
            };

            produtos.push(novoProduto);

            localStorage.setItem(
                "whatsappShopProdutos",
                JSON.stringify(produtos)
            );

            mostrarProdutos();

            mensagem.textContent =
                tipo === "servico"
                    ? "Serviço publicado com sucesso!"
                    : "Produto publicado com sucesso!";

            document.getElementById("nomeProduto").value = "";
            document.getElementById("descricaoProduto").value = "";
            document.getElementById("precoProduto").value = "";
            document.getElementById("imagemProduto").value = "";
        }

        if (arquivo) {

            const leitor = new FileReader();

            leitor.onload = function (evento) {
                publicar(evento.target.result);
            };

            leitor.readAsDataURL(arquivo);

        } else {
            publicar("");
        }
    });

});
