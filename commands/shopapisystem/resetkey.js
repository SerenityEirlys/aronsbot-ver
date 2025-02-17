import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('resetkey')
        .setDescription('Reset key cooldown for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset cooldown for')
                .setRequired(true))
        .setDefaultMemberPermissions(0), // Restrict to administrators only

    async execute(interaction) {
        try {
            // Check if user is a reseller
            const resellerId = interaction.user.id;
            const resellerPath = path.join(__dirname, '../../data/roblox/reseller.txt');
            
            if (!fs.existsSync(resellerPath)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ System Error')
                    .setDescription('Reseller file not found. Please contact an administrator.')
                    .setColor(0xFF0000);
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const resellerContent = fs.readFileSync(resellerPath, 'utf8');
            const resellerIds = resellerContent.split('\n').map(line => line.trim());

            if (!resellerIds.includes(resellerId)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Permission Denied')
                    .setDescription('This command is only available for resellers.')
                    .setColor(0xFF0000);
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const targetUserId = targetUser.id;

            // Path to key_success.txt
            const successLogPath = path.join(__dirname, '../../data/shop/key_success.txt');
            
            if (!fs.existsSync(successLogPath)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Key success log file not found.')
                    .setColor(0xFF0000);
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Read the file content
            let successLog = fs.readFileSync(successLogPath, 'utf8');
            const lines = successLog.split('\n');

            // Filter out entries for the target user
            const newLines = lines.filter(line => !line.includes(`User ID: ${targetUserId}`));

            // Write back the filtered content
            fs.writeFileSync(successLogPath, newLines.join('\n'));

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Cooldown Reset Successfully')
                .setDescription(`Key cooldown has been reset for ${targetUser.tag}. They can now use /getkey again.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error in resetkey command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting the key cooldown. Please try again.')
                .setColor(0xFF0000);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
