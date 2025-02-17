import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Nhận phần thưởng'),
    
    async execute(interaction) {
        try {
            // Check if command is used in DMs
            if (interaction.guild) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Please use this command in DMs with the bot.\nVui lòng sử dụng lệnh này trong tin nhắn riêng với bot.')
                    .setColor(0xFF0000)
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Get DM channel if not already available
            const channel = interaction.channel || await interaction.user.createDM();
            if (!channel) {
                return await interaction.reply({ 
                    content: 'Unable to create DM channel. Please ensure your DMs are open.', 
                    ephemeral: true 
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔑 License Key Verification')
                .setDescription('Please enter your license key in the chat.\nVui lòng nhập license key của bạn vào chat.')
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const filter = m => m.author.id === interaction.user.id;
            const collector = channel.createMessageCollector({
                filter,
                time: 30000,
                max: 1
            });

            collector.on('collect', async message => {
                // Delete the initial embed message when key is received
                await interaction.deleteReply();

                const inputKey = message.content.trim();
                const keysPath = path.join(__dirname, '../../data/roblox/key.txt');
                const successPath = path.join(__dirname, '../../data/roblox/success.txt');

                try {
                    // Create directories if they don't exist
                    const dir = path.join(__dirname, '../../data/roblox');
                    if (!fs.existsSync(dir)){
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    // Read keys file
                    let keys = [];
                    if (fs.existsSync(keysPath)) {
                        keys = fs.readFileSync(keysPath, 'utf8')
                            .split('\n')
                            .map(key => key.trim())
                            .filter(key => key);
                    }

                    // Check if key exists
                    if (keys.includes(inputKey)) {
                        // Extract duration and product name from key (e.g. "30DARONROBLOXEX-...")
                        const keyMatch = inputKey.match(/(\d+)DARON([A-Za-z]+)-/i);
                        if (!keyMatch) {
                            const responseEmbed = new EmbedBuilder()
                                .setTitle('❌ License Key Error')
                                .setDescription('Invalid key format.\nĐịnh dạng key không hợp lệ.')
                                .setColor(0xFF0000)
                                .setTimestamp();
                            await interaction.followUp({ embeds: [responseEmbed] });
                            return;
                        }

                        const durationDays = parseInt(keyMatch[1]);
                        const productName = keyMatch[2];
                        const durationMs = durationDays * 24 * 60 * 60 * 1000;
                        
                        // Generate unique HWID for this user
                        const hwid = crypto.createHash('sha256')
                            .update(interaction.user.id + Date.now().toString())
                            .digest('hex')
                            .substring(0, 32); // Take first 32 chars for shorter HWID

                        // Check existing user data
                        let existingExpiry = null;
                        if (fs.existsSync(successPath)) {
                            const successData = fs.readFileSync(successPath, 'utf8');
                            const userEntries = successData.split('\n').filter(line => line.startsWith(interaction.user.id));
                            if (userEntries.length > 0) {
                                const lastEntry = userEntries[userEntries.length - 1];
                                const [, , expiryStr] = lastEntry.split('|');
                                existingExpiry = new Date(expiryStr);
                            }
                        }

                        // Calculate new expiry
                        let newExpiry;
                        if (existingExpiry && existingExpiry > new Date()) {
                            // Add duration to existing expiry
                            newExpiry = new Date(existingExpiry.getTime() + durationMs);
                        } else {
                            // Set new expiry from now
                            newExpiry = new Date(Date.now() + durationMs);
                        }

                        // Save to success.txt with HWID and duration days
                        const successData = `${interaction.user.id}|${inputKey}|${newExpiry.toISOString()}|${hwid}|${durationDays}days\n`;
                        fs.appendFileSync(successPath, successData);

                        const responseEmbed = new EmbedBuilder()
                            .setTitle('✅ License Key Verified')
                            .setDescription(`Your license key has been successfully activated.\nKey của bạn đã được kích hoạt thành công.\n\nProduct/Sản phẩm: ${productName}\nExpires/Hết hạn: ${newExpiry.toLocaleString()}\nHWID: ${hwid}\nDuration/Thời hạn: ${durationDays} days`)
                            .setColor(0x00FF00)
                            .setTimestamp();
                        await interaction.followUp({ embeds: [responseEmbed] });
                    } else {
                        const responseEmbed = new EmbedBuilder()
                            .setTitle('❌ License Key Error')
                            .setDescription('Invalid license key. Please try again.\nKey không hợp lệ. Vui lòng thử lại.')
                            .setColor(0xFF0000)
                            .setTimestamp();
                        await interaction.followUp({ embeds: [responseEmbed] });
                    }
                } catch (error) {
                    console.error('Error processing key:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription('An error occurred while processing your license key. Please try again later.\nĐã xảy ra lỗi khi xử lý key. Vui lòng thử lại sau.')
                        .setColor(0xFF0000)
                        .setTimestamp();
                    await interaction.followUp({ embeds: [errorEmbed] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Time Out')
                        .setDescription('You took too long to enter your license key. Please try again.\nBạn đã mất quá nhiều thời gian để nhập key. Vui lòng thử lại.')
                        .setColor(0xFF0000)
                        .setTimestamp();
                    interaction.followUp({ embeds: [timeoutEmbed] });
                }
            });
        } catch (error) {
            console.error('Error in claim command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while processing your command. Please ensure your DMs are open.',
                    ephemeral: true 
                });
            }
        }
    },
};
