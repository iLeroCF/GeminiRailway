// commands/Kayıt/kayıt.js

const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    // Slash Command tanımı (Bu dosya iki komutu birden yönetecek)
    // Bu 'data' özelliği doğrudan kullanılmayacak, ama yapı olarak burada durabilir.
    // deploy-commands.js bu dosyayı iki kez okuyup iki ayrı komut oluşturacak.
    data: [
        new SlashCommandBuilder()
            .setName('erkek')
            .setDescription('Bir üyeyi erkek olarak kaydeder.')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles) // Kayıt yetkilisi rolü olmayanlar için temel bir yetki
            .addUserOption(option => option.setName('üye').setDescription('Kaydedilecek üye.').setRequired(true))
            .addStringOption(option => option.setName('isim').setDescription('Üyenin ismi.').setRequired(true))
            .addIntegerOption(option => option.setName('yaş').setDescription('Üyenin yaşı.').setRequired(true)),
        new SlashCommandBuilder()
            .setName('kadın')
            .setDescription('Bir üyeyi kadın olarak kaydeder.')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
            .addUserOption(option => option.setName('üye').setDescription('Kaydedilecek üye.').setRequired(true))
            .addStringOption(option => option.setName('isim').setDescription('Üyenin ismi.').setRequired(true))
            .addIntegerOption(option => option.setName('yaş').setDescription('Üyenin yaşı.').setRequired(true))
    ],

    // Prefix Command tanımı
    name: "kayıt",
    aliases: ["e", "k", "erkek", "kadın"],
    category: "Kayıt",
    description: "Yeni üyeleri sunucuya kaydeder.",
    
    execute: async (client, interactionOrMessage, args) => {
        const isInteraction = !!interactionOrMessage.isChatInputCommand;
        const reply = (options) => isInteraction ? interactionOrMessage.reply(options) : interactionOrMessage.reply(options);
        const author = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
        const guild = interactionOrMessage.guild;
        const db = client.db;

        // 1. Sunucu ayarlarını hafızadan al
        const settings = client.settings.get(guild.id);
        
        // 2. Ayarlar yapılmış mı diye kontrol et
        if (!settings || !settings.kayıtStaffRolü || !settings.kayıtsızRolü || !settings.erkekRolü || !settings.kadınRolü || !settings.kayıtlıRolleri) {
            return reply({ content: "Kayıt sistemi ayarları tam olarak yapılmamış! Lütfen `/ayarla` komutunu kullanın.", ephemeral: true });
        }
        
        // 3. Yetki Kontrolü
        const staffMember = guild.members.cache.get(author.id);
        if (!staffMember.roles.cache.has(settings.kayıtStaffRolü) && !client.config.owners.includes(author.id)) {
            return reply({ content: "Bu komutu kullanmak için `Kayıt Yetkilisi` rolüne sahip olmalısınız.", ephemeral: true });
        }

        // 4. Cinsiyeti, kullanıcıyı ve diğer argümanları belirle
        let gender, genderRole, member, name, age;
        const commandName = isInteraction ? interactionOrMessage.commandName : interactionOrMessage.content.slice(client.config.prefix.length).trim().split(/ +/).shift().toLowerCase();

        if (["e", "erkek"].includes(commandName)) {
            gender = "Erkek";
            genderRole = settings.erkekRolü;
        } else if (["k", "kadın"].includes(commandName)) {
            gender = "Kadın";
            genderRole = settings.kadınRolü;
        } else {
             return reply({ content: `Hatalı kullanım! Lütfen \`.e/k @üye <isim> <yaş>\` veya \`/erkek , /kadın \` şeklinde kullanın.`, ephemeral: true });
        }

        if (isInteraction) {
            const user = interactionOrMessage.options.getUser('üye');
            member = guild.members.cache.get(user.id);
            name = interactionOrMessage.options.getString('isim');
            age = interactionOrMessage.options.getInteger('yaş');
        } else {
            member = interactionOrMessage.mentions.members.first() || guild.members.cache.get(args[0]);
            name = args.slice(1, -1).join(' ');
            age = args[args.length - 1];
        }

        // 5. Girdi Kontrolleri
        if (!member) return reply({ content: "Hatalı kullanım! Bir üye etiketlemelisiniz. (`/erkek üye:@Lero ...`)", ephemeral: true });
        if (!name || !age || (typeof age === 'string' && isNaN(age))) return reply({ content: "Hatalı kullanım! İsim ve yaş belirtmelisiniz. (`/erkek üye:@Lero isim:İsim yaş:Yaş`)", ephemeral: true });
        if (member.id === author.id) return reply({ content: "Kendinizi kaydedemezsiniz!", ephemeral: true });
        if (!member.roles.cache.has(settings.kayıtsızRolü)) return reply({ content: "Bu kullanıcı zaten sunucuya kayıtlı görünüyor (Kayıtsız rolü yok).", ephemeral: true });
        
        const finalName = `${name} | ${age}`;

        // 6. Kullanıcıyı Güncelle (Roller ve İsim)
        try {
            await member.setNickname(finalName);
            const rollerToAdd = [...settings.kayıtlıRolleri, genderRole];
            await member.roles.add(rollerToAdd);
            await member.roles.remove(settings.kayıtsızRolü);
        } catch (err) {
            console.error("[HATA] Kayıt sırasında rol/isim güncelleme hatası:", err);
            return reply({ content: "Kullanıcının rollerini veya ismini güncellerken bir hata oluştu. Lütfen botun yetkilerinin (özellikle rol hiyerarşisinin) tam olduğundan emin olun.", ephemeral: true });
        }

        // 7. Veritabanına İsim Geçmişini Kaydet
        const newNameEntry = {
            name: name,
            age: age,
            gender: gender,
            staff: author.id,
            date: Date.now()
        };
        db.push(`nameHistory_${member.id}`, newNameEntry);

        // 8. Veritabanına Yetkili İstatistiğini Kaydet
        const staffKey = `staffStats_${author.id}`;
        db.add(`${staffKey}_total`, 1);
        db.add(`${staffKey}_${gender.toLowerCase()}`, 1);

        // 9. Başarı Mesajı
        const embed = new EmbedBuilder()
            .setColor(gender === "Erkek" ? "Blue" : "Red")
            .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${member} başarıyla **${gender}** olarak kaydedildi.\nKullanıcının yeni ismi: **${finalName}**`)
            .setTimestamp();
            
        reply({ embeds: [embed] });
    }
};