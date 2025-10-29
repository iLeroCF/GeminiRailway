// handlers/eventHandler.js

const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    console.log("[BİLGİ] Olaylar (events) taranıyor...");
    
    try {
        const eventsPath = path.join(__dirname, '..', 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            // Yeni v14 formatını kontrol et: { name, once, execute }
            if (event.name && typeof event.execute === 'function') {
                if (event.once) {
                    // Olay bir kez çalışacaksa
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    // Olay her tetiklendiğinde çalışacaksa
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                console.log(`[OLAY] ${event.name} (${file}) yüklendi.`);
            } else {
                console.warn(`[UYARI] ${file} geçerli bir olay (event) yapısı içermiyor, atlandı.`);
            }
        }
    } catch (err) {
        console.error("[HATA] 'events' klasörü okunurken bir hata oluştu. Klasörün var olduğundan emin olun.", err);
    }
};