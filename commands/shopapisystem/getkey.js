import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from '../../db/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('getkey')
        .setDescription('Get your product key')
        .setDMPermission(true) // Allow DM usage
        .addStringOption(option =>
            option.setName('hwid')
                .setDescription('Enter your HWID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('serverid') 
                .setDescription('Enter your server ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('videocomment')
                .setDescription('Enter your comment from the video')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const inputHWID = interaction.options.getString('hwid');
            const inputServerId = interaction.options.getString('serverid');
            const videoComment = interaction.options.getString('videocomment');

            // Verify HWID
            const [hwidRows] = await pool.execute(
                'SELECT * FROM hwids WHERE hwid = ?',
                [inputHWID]
            );
            
            if (hwidRows.length === 0) {
                const hwidErrorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid HWID')
                    .setDescription('The provided HWID is not valid. Please check and try again.')
                    .setColor(0xFF0000);
                return await interaction.reply({ embeds: [hwidErrorEmbed], ephemeral: true });
            }

            if (hwidRows[0].is_used) {
                const hwidErrorEmbed = new EmbedBuilder()
                    .setTitle('❌ HWID Already Used')
                    .setDescription('This HWID has already been used to get a key. Each HWID can only be used once.')
                    .setColor(0xFF0000);
                return await interaction.reply({ embeds: [hwidErrorEmbed], ephemeral: true });
            }

            // Create select menu for products
            const productMenu = new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('Select your product')
                .addOptions([
                    {
                        label: 'Unicore Genshin',
                        value: 'genshin',
                        emoji: '⚔️'
                    },
                    {
                        label: 'Unicore HSR',
                        value: 'hsr', 
                        emoji: '🚀'
                    },
                    {
                        label: 'Unicore WW',
                        value: 'ww',
                        emoji: '🐺'
                    },
                    {
                        label: 'Unicore FiveM',
                        value: 'fivem',
                        emoji: '🎲'
                    },
                    {
                        label: 'Unicore Marvel Rivals',
                        value: 'mvr',
                        emoji: '🦸'
                    },
                    {
                        label: 'Unicore Rage',
                        value: 'rapemp',
                        emoji: '🎯'
                    },
                    {
                        label: 'Meoww',
                        value: 'meoww',
                        emoji: '🐱'
                    },
                    {
                        label: 'Unicore Zenless Zone Zero',
                        value: 'zzz',
                        emoji: '🌟'
                    },
                ]);

            const row = new ActionRowBuilder()
                .addComponents(productMenu);

            const initialEmbed = new EmbedBuilder()
                .setTitle('🎮 Product Selection')
                .setDescription('Please select your product from the menu below')
                .setColor('#FF69B4');

            const response = await interaction.reply({
                embeds: [initialEmbed],
                components: [row],
                ephemeral: true
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 15000
            });

            collector.on('collect', async (selectInteraction) => {
                try {
                    if (selectInteraction.customId === 'select_product') {
                        const selectedProduct = selectInteraction.values[0];

                        // Lấy key từ database
                        const [keyRows] = await pool.execute(
                            `SELECT * FROM license_keys 
                            WHERE product = ? 
                            AND is_used = FALSE 
                            AND expiry_date > NOW() 
                            LIMIT 1`,
                            [selectedProduct]
                        );

                        if (keyRows.length === 0) {
                            const noKeysEmbed = new EmbedBuilder()
                                .setTitle('📭 No Keys Available')
                                .setDescription(`Sorry, there are currently no keys available for ${selectedProduct}. Please try again later.`)
                                .setColor(0xFF0000);
                            
                            if (selectInteraction.replied) {
                                await selectInteraction.editReply({ embeds: [noKeysEmbed], components: [] });
                            } else {
                                await selectInteraction.update({ embeds: [noKeysEmbed], components: [] });
                            }
                            return;
                        }

                        // Đánh dấu HWID đã sử dụng
                        await pool.execute(
                            'UPDATE hwids SET is_used = TRUE, used_at = NOW() WHERE hwid = ?',
                            [inputHWID]
                        );

                        // Cập nhật key
                        await pool.execute(
                            `UPDATE license_keys SET 
                            is_used = TRUE,
                            used_by = ?,
                            used_at = NOW(),
                            hwid = ?
                            WHERE key_value = ?`,
                            [userId, inputHWID, keyRows[0].key_value]
                        );

                        // Create success embed
                        const successEmbed = new EmbedBuilder()
                            .setTitle('🎉 Key Retrieved Successfully')
                            .setDescription(`Here is your key: ||${keyRows[0].key_value}||`)
                            .addFields(
                                { name: '🎮 Product', value: selectedProduct.toUpperCase() },
                                { name: '🔑 HWID', value: inputHWID },
                                { name: '⏳ Expires', value: keyRows[0].expiry_date.toLocaleString() }
                            )
                            .setColor(0x00FF00)
                            .setTimestamp();

                        try {
                            // Try to send DM first
                            await interaction.user.send({ embeds: [successEmbed] });
                            
                            // If DM succeeds, update interaction
                            const publicEmbed = new EmbedBuilder()
                                .setTitle('📨 Key Sent')
                                .setDescription('Your key has been sent to your DMs!')
                                .setColor(0x00FF00);
                            
                            if (selectInteraction.replied) {
                                await selectInteraction.editReply({ embeds: [publicEmbed], components: [] });
                            } else {
                                await selectInteraction.update({ embeds: [publicEmbed], components: [] });
                            }
                        } catch (error) {
                            // If DM fails, send key in channel with ephemeral message
                            if (selectInteraction.replied) {
                                await selectInteraction.editReply({ 
                                    embeds: [successEmbed], 
                                    components: [],
                                    ephemeral: true 
                                });
                            } else {
                                await selectInteraction.update({ 
                                    embeds: [successEmbed], 
                                    components: [],
                                    ephemeral: true 
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in select interaction:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Error')
                        .setDescription('An error occurred while processing your selection. Please try again.')
                        .setColor(0xFF0000);
                    
                    try {
                        if (selectInteraction.replied) {
                            await selectInteraction.editReply({ embeds: [errorEmbed], components: [] });
                        } else {
                            await selectInteraction.update({ embeds: [errorEmbed], components: [] });
                        }
                    } catch (e) {
                        console.error('Failed to send error message:', e);
                    }
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Time Expired')
                        .setDescription('The product selection has timed out. Please run the command again.')
                        .setColor(0xFF0000);
                    try {
                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                    } catch (error) {
                        console.error('Failed to send timeout message:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error in getkey command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('⚠️ Error')
                .setDescription('An error occurred while processing your request. Please try again or contact an administrator.')
                .setColor(0xFF0000);
            await interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    },
};
