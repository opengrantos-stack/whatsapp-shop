document.getElementById('btnWhatsApp').addEventListener('click', function(e) {
    e.preventDefault();
    const url = `https://wa.me/${lojaConfig.numeroWhatsApp}?text=${encodeURIComponent(lojaConfig.mensagemPadrao + 'Produto Exemplo')}`;
    window.open(url, '_blank');
});
