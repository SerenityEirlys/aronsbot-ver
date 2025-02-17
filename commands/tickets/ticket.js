import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../db/mysql.js';
import { createTranscript } from '../../utils/transcript.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Đóng ticket hiện tại'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Thêm người dùng vào ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng cần thêm')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'close') {
            const channel = interaction.channel;
            const [rows] = await pool.query(
                'SELECT * FROM tickets WHERE channel_id = ? AND status = "open"',
                [channel.id]
            );

            if (!rows.length) {
                return interaction.reply({
                    content: 'Kênh này không phải là ticket!',
                    ephemeral: true
                });
            }

            // Tạo transcript
            const transcript = await createTranscript(channel);
            
            // Lấy thông tin config
            const [config] = await pool.query(
                'SELECT * FROM ticket_configs WHERE guild_id = ?',
                [interaction.guild.id]
            );

            // Gửi transcript vào log channel
            const logChannel = interaction.guild.channels.cache.get(config[0].log_channel_id);
            if (logChannel) {
                await logChannel.send({
                    content: `Ticket #${rows[0].ticket_id} đã được đóng bởi ${interaction.user.tag}`,
                    files: [transcript]
                });
            }

            // Cập nhật trạng thái ticket trong database
            await pool.query(
                'UPDATE tickets SET status = "closed", closed_at = NOW() WHERE channel_id = ?',
                [channel.id]
            );

            await channel.delete();
        }

        if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            await interaction.channel.permissionOverwrites.create(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.reply({
                content: `Đã thêm ${user} vào ticket.`,
                ephemeral: true
            });
        }
    },
}; 