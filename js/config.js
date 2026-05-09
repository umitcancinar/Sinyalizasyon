/* config.js — Merkezi API URL yapılandırması */
(function () {
    // HER ZAMAN production Vercel sunucusuna bağlan
    window.SINYAL_API = 'https://sinyal-backend-new.vercel.app/api';
    window.IS_PRODUCTION = true;

    console.log('[Config] API:', window.SINYAL_API);
})();
