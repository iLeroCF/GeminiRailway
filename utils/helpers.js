// utils/helpers.js

module.exports = (client) => {
    // Bu fonksiyonlar artık bir `guild` objesi alarak çalışacak ve her sunucuda kullanılabilir hale gelecek.
    client.findRole = (guild, id) => guild?.roles.cache.get(id);
    client.findChannel = (guild, id) => guild?.channels.cache.get(id);
    client.findEmoji = (guild, id) => guild?.emojis.cache.get(id);
};

// Eski kullanım (artık geçersiz): client.findRole('rol_id')
// Yeni kullanım: client.findRole(interaction.guild, 'rol_id')

// Eski kullanım (artık geçersiz): client.findRole('rol_id')
// Yeni kullanım: client.findRole(interaction.guild, 'rol_id')