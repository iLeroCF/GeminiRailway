// managers/giveawayManager.js

const { GiveawaysManager } = require('discord-giveaways');

module.exports = (client) => {
    console.log("[BİLGİ] Çekiliş Yöneticisi (GiveawaysManager) başlatılıyor...");

    // Veritabanı ile entegre özel GiveawaysManager sınıfı
    const GiveawayManagerWithOwnDatabase = class extends GiveawaysManager {
        async getAllGiveaways() {
            return client.db.get('giveaways') || [];
        }
        async saveGiveaway(messageId, giveawayData) {
            client.db.push('giveaways', giveawayData);
            return true;
        }
        async editGiveaway(messageId, giveawayData) {
            const giveaways = client.db.get('giveaways') || [];
            const newGiveawaysArray = giveaways.map((gw) => (gw.messageId === messageId ? giveawayData : gw));
            client.db.set('giveaways', newGiveawaysArray);
            return true;
        }
        async deleteGiveaway(messageId) {
            const newGiveawaysArray = (client.db.get('giveaways') || []).filter((gw) => gw.messageId !== messageId);
            client.db.set('giveaways', newGiveawaysArray);
            return true;
        }
    };

    // Client üzerine çekiliş yöneticisini ekle
    client.giveawaysManager = new GiveawayManagerWithOwnDatabase(client, {
        default: {
            botsCanWin: false,
            exemptPermissions: ['ManageMessages', 'Administrator'],
            embedColor: '#FF0000',
            embedColorEnd: '#000000',
            reaction: '🎉',
            messages: {
                giveaway: '🎉 **ÇEKİLİŞ** 🎉',
                giveawayEnded: '🎉 **ÇEKİLİŞ BİTTİ** 🎉',
                title: '{this.prize}',
                drawing: 'Kalan süre: {timestamp}',
                inviteToParticipate: 'Katılmak için 🎉 tepkisine tıkla!',
                winMessage: 'Tebrikler, {winners}! **{this.prize}** kazandınız!',
                noWinner: 'Yeterli katılım olmadığı için kazanan belirlenemedi!',
                hostedBy: 'Çekilişi yapan: {this.hostedBy}',
                winners: 'Kazanan(lar):',
                endedAt: 'Bittiği zaman'
            }
        }
    });

    console.log("[BİLGİ] Çekiliş Yöneticisi başarıyla yüklendi.");
};