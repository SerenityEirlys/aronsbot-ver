import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { pool } from '../../db/mysql.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ticketsetup')
        .setDescription('Setup the ticket system')
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Category cho tickets')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('logs')
                .setDescription('Kênh để gửi logs ticket')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('supportrole')
                .setDescription('Role hỗ trợ ticket')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const category = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('logs');
        const supportRole = interaction.options.getRole('supportrole');

        try {
            // Lưu config vào database
            await pool.query(
                'REPLACE INTO ticket_configs (guild_id, category_id, log_channel_id, support_role_id) VALUES (?, ?, ?, ?)',
                [interaction.guild.id, category.id, logChannel.id, supportRole.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🎫 Support Ticket System')
                .setDescription('Click the button below to create a new ticket')
                .setColor('#0099ff')
                .setFooter({ text: 'Arons Support System' });

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('Create Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

            await interaction.channel.send({
                embeds: [embed],
                components: [button]
            });

            await interaction.reply({
                content: 'Ticket system has been set up successfully!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in ticketsetup:', error);
            await interaction.reply({
                content: 'An error occurred while setting up the ticket system!',
                ephemeral: true
            });
        }
    },
}; 