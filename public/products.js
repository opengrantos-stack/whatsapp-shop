const produtosIniciais = [
    {
        id: 1,
        tipo: "produto",
        nome: "Produto Exemplo",
        descricao: "Descrição do produto ou serviço.",
        preco: 1500,
        imagem: ""
    },
    {
        id: 2,
        tipo: "produto",
        nome: "Outro Produto",
        descricao: "Outro exemplo de produto.",
        preco: 5000,
        imagem: ""
    },
    {
        id: 3,
        tipo: "servico",
        nome: "Serviço Exemplo",
        descricao: "Serviço prestado pela empresa.",
        preco: 10000,
        imagem: ""
    }
];

let produtos = JSON.parse(
    localStorage.getItem("whatsappShopProdutos")
) || produtosIniciais;
