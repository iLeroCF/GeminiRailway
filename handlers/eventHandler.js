// handlers/eventHandler.js

const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    console.log("[BİLGİ] Olaylar (events) taranıyor...");
    
    try {
        const eventFiles = fs.readdirSync(path.join(__dirname, '..', 'events')).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const eventName = file.split('.')[0]; // Dosya adı (örn: guildMemberAdd)
            const eventHandler = require(path.join(__dirname, '..', 'events', file));
            
            // Olayı 'client.on' ile kaydet
            client.on(eventName, eventHandler.bind(null, client));
            console.log(`[OLAY] ${eventName} yüklendi.`);
        }
    } catch (err) {
        console.error("[HATA] 'events' klasörü okunurken bir hata oluştu. Klasörün var olduğundan emin olun.", err);
    }
};