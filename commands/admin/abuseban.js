import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('abuseban')
        .setDescription('Ban a user from all mutual servers')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        await interaction.deferReply();

        // Check if user has ban permission
        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            const noPermEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ Insufficient Permissions')
                .setDescription('You need BAN_MEMBERS permission to use this command.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Get all mutual guilds where the bot has permissions
            const mutualGuilds = interaction.client.guilds.cache.filter(guild => 
                guild.members.cache.has(targetUser.id) && 
                guild.members.me.permissions.has('BAN_MEMBERS')
            );

            if (mutualGuilds.size === 0) {
                const noGuildsEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ No Mutual Servers')
                    .setDescription('No mutual servers found where I can ban this user.')
                    .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                    .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                    .setTimestamp();
                return interaction.editReply({ embeds: [noGuildsEmbed], ephemeral: true });
            }

            let successCount = 0;
            let failCount = 0;

            // Attempt to ban from each mutual guild
            for (const [, guild] of mutualGuilds) {
                try {
                    await guild.members.ban(targetUser.id, { reason });
                    successCount++;
                } catch {
                    failCount++;
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔨 Mass Ban Results')
                .setDescription(`Attempted to ban ${targetUser} from all mutual servers.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Banned User', value: `${targetUser.tag}`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '✅ Successful Bans', value: `${successCount}`, inline: true },
                    { name: '❌ Failed Bans', value: `${failCount}`, inline: true },
                    { name: '⏰ Ban Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setImage('https://media.tenor.com/yPUAJMwL2IQAAAAC/ban-hammer.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('An unexpected error occurred while executing the command.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
