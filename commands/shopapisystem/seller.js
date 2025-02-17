import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resellerPath = path.join(__dirname, '../../data/roblox/reseller.txt');

export default {
    data: new SlashCommandBuilder()
        .setName('selleradd')
        .setDescription('Add or remove a reseller')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add/remove as reseller')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has permission (only specific IDs)
        const allowedUsers = ['822994305143668747', '727853330696634397'];
        if (!allowedUsers.includes(interaction.user.id)) {
            const noPermEmbed = new EmbedBuilder()
                .setTitle('❌ Permission Denied')
                .setDescription('You do not have permission to manage resellers.\nBạn không có quyền quản lý người bán lại.')
                .setColor(0xFF0000)
                .setTimestamp();
            return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const userId = targetUser.id;

        try {
            // Read existing resellers
            let resellers = [];
            if (fs.existsSync(resellerPath)) {
                resellers = fs.readFileSync(resellerPath, 'utf8').split('\n').filter(id => id.trim());
            }

            // Check if user is already a reseller
            if (resellers.includes(userId)) {
                // Remove the reseller
                resellers = resellers.filter(id => id !== userId);
                fs.writeFileSync(resellerPath, resellers.join('\n'));

                const removeResellerEmbed = new EmbedBuilder()
                    .setTitle('✅ Reseller Removed')
                    .setDescription(`Successfully removed ${targetUser.tag} from resellers.\nĐã xóa ${targetUser.tag} khỏi danh sách người bán lại thành công.`)
                    .setColor(0xFF6B6B)
                    .setTimestamp();
                return await interaction.reply({ embeds: [removeResellerEmbed], ephemeral: true });
            }

            // Add new reseller
            resellers.push(userId);
            fs.writeFileSync(resellerPath, resellers.join('\n'));

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Reseller Added')
                .setDescription(`Successfully added ${targetUser.tag} as a reseller.\nĐã thêm ${targetUser.tag} làm người bán lại thành công.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error managing reseller:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while managing the reseller.\nĐã xảy ra lỗi khi quản lý người bán lại.')
                .setColor(0xFF0000)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
