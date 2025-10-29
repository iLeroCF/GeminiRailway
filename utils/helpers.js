// utils/helpers.js

module.exports = (client) => {
    client.findRole = (id) => client.guilds.cache.get(client.config.guildID)?.roles.cache.get(id);
    client.findChannel = (id) => client.guilds.cache.get(client.config.guildID)?.channels.cache.get(id);
    client.findEmoji = (id) => client.guilds.cache.get(client.config.guildID)?.emojis.cache.get(id);
};