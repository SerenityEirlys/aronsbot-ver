import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import 'dotenv/config';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        // Defer reply immediately
        await interaction.deferReply();

        // Check if user has permission (server admin or bot owner)
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isBotOwner = process.env.ADMIN_ID?.split(',').includes(interaction.user.id);

        if (!isAdmin && !isBotOwner) {
            const noPermEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ Insufficient Permissions')
                .setDescription('You need to be a server administrator or bot owner to use this command.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Check if target is valid
        if (!targetMember) {
            const invalidUserEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('Could not find that user!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [invalidUserEmbed], ephemeral: true });
        }

        // Check if user can be kicked
        if (!targetMember.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permission Error')
                .setDescription('I cannot kick this user! They may have higher permissions than me.')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            await targetMember.kick(reason);

            const kickEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('👢 User Kicked Successfully')
                .setDescription(`${targetUser} has been kicked from the server.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Kicked User', value: `${targetUser.tag}`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '⏰ Kick Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setImage('https://media.tenor.com/wZw3YW1Yl4wAAAAC/anime-kick.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();

            await interaction.editReply({ embeds: [kickEmbed] });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('There was an error trying to kick this user!')
                .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif')
                .setFooter({ text: '🎨 Developer: Hitori | Design: Arons' })
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
