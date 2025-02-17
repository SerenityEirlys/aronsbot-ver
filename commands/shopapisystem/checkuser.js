import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('checkuser')
        .setDescription('Kiểm tra người dùng')
        .setDMPermission(true)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check (Admin only)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const successPath = path.join(__dirname, '../../data/roblox/success.txt');
            
            // Check if checking another user
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // If checking another user, verify admin permissions
            if (targetUser.id !== interaction.user.id) {
                // Check if user has admin role/permissions
                if (!interaction.member.permissions.has('Administrator')) {
                    const noPermEmbed = new EmbedBuilder()
                        .setTitle('❌ Permission Denied')
                        .setDescription('You do not have permission to check other users\' licenses.\nBạn không có quyền kiểm tra key của người khác.')
                        .setColor(0xFF0000)
                        .setTimestamp();
                    return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
                }
            }

            // Check if success.txt exists
            if (!fs.existsSync(successPath)) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle('❌ No License Found')
                    .setDescription(`No license keys found for ${targetUser.tag}.\nKhông tìm thấy key cho người dùng ${targetUser.tag}.`)
                    .setColor(0xFF0000)
                    .setTimestamp();
                return await interaction.reply({ embeds: [noKeyEmbed], ephemeral: true });
            }

            // Read and parse success.txt
            const successData = fs.readFileSync(successPath, 'utf8');
            const userEntries = successData.split('\n')
                .filter(line => line.startsWith(targetUser.id) && line.trim().length > 0);

            if (userEntries.length === 0) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle('❌ No License Found')
                    .setDescription(`No license keys found for ${targetUser.tag}.\nKhông tìm thấy key cho người dùng ${targetUser.tag}.`)
                    .setColor(0xFF0000)
                    .setTimestamp();
                return await interaction.reply({ embeds: [noKeyEmbed], ephemeral: true });
            }

            const now = new Date();
            const statusEmbed = new EmbedBuilder()
                .setTitle(`🔑 License History for ${targetUser.tag}`)
                .setColor(0x0099FF)
                .setTimestamp();

            let description = '';
            
            userEntries.forEach((entry, index) => {
                const [, key, expiryStr, hwid, duration] = entry.split('|');
                const expiryDate = new Date(expiryStr);
                const remainingTime = expiryDate - now;
                const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
                const isExpired = remainingTime <= 0;

                const productMatch = key.match(/\d+DARON([A-Za-z]+)-/i);
                const productName = productMatch ? productMatch[1] : 'Unknown';

                description += `\n📌 Key ${index + 1}:\n`;
                description += `Product/Sản phẩm: ${productName}\n`;
                description += `Key: ${key}\n`;
                description += `HWID: ${hwid}\n`;
                description += `Duration/Thời hạn: ${duration}\n`;
                description += `Expiry/Hết hạn: ${expiryDate.toLocaleString()}\n`;
                description += isExpired ? 
                    '**Status/Trạng thái: ❌ EXPIRED/HẾT HẠN**\n' : 
                    `**Status/Trạng thái: ✅ ACTIVE (${remainingDays} days remaining/còn lại)**\n`;
                description += '─────────────────\n';
            });

            statusEmbed.setDescription(description);
            await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error in checkuser command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while checking the license status.\nĐã xảy ra lỗi khi kiểm tra trạng thái key.')
                .setColor(0xFF0000)
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
