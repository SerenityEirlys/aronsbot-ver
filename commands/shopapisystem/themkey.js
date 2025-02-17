import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from '../../db/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('themkey')
        .setDescription('Add product keys with expiration time')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('product')
                .setDescription('Select the product')
                .setRequired(true)
                .addChoices(
                    { name: 'Unicore Genshin', value: 'genshin' },
                    { name: 'Unicore HSR', value: 'hsr' },
                    { name: 'Unicore WW', value: 'ww' },
                    { name: 'Unicore FiveM', value: 'fivem' },
                    { name: 'Unicore Marvel Rivals', value: 'mvr' },
                    { name: 'Unicore ZZZ', value: 'zzz' },
                    { name: 'Unicore Ragemp', value: 'ragemp' },
                    { name: 'Aurora WW ', value: 'aurora' }
                ))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Key duration (e.g., 1h, 7d, 1y)')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('keyfile')
                .setDescription('Text file containing keys')
                .setRequired(true)),

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

            await interaction.deferReply({ ephemeral: true });

            const selectedProduct = interaction.options.getString('product');
            const duration = interaction.options.getString('duration');
            const keyFile = interaction.options.getAttachment('keyfile');

            // Validate duration format
            const durationRegex = /^(\d+)(h|d|y)$/;
            if (!durationRegex.test(duration)) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Duration Format')
                    .setDescription('Please use format: number + h/d/y (e.g., 1h, 7d, 1y)')
                    .setColor(0xFF0000);
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Validate file type
            if (!keyFile.name.endsWith('.txt')) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid File Type')
                    .setDescription('Please upload a .txt file')
                    .setColor(0xFF0000);
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Fetch and process uploaded file
            const response = await fetch(keyFile.url);
            const text = await response.text();
            const newKeys = text.split('\n').filter(key => key.trim());

            if (newKeys.length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ No Valid Keys')
                    .setDescription('The uploaded file contains no valid keys.')
                    .setColor(0xFF0000);
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Process keys and save to MySQL
            const [, amount, unit] = duration.match(durationRegex);
            const processedKeys = newKeys.map(key => {
                const expiryDate = new Date();
                const amountNum = parseInt(amount);
                switch(unit) {
                    case 'h': expiryDate.setHours(expiryDate.getHours() + amountNum); break;
                    case 'd': expiryDate.setDate(expiryDate.getDate() + amountNum); break;
                    case 'y': expiryDate.setFullYear(expiryDate.getFullYear() + amountNum); break;
                }
                
                return {
                    key: key.trim(),
                    product: selectedProduct,
                    expiryDate: expiryDate,
                    isUsed: false
                };
            });

            // Save keys to MySQL
            const insertQuery = `INSERT INTO license_keys 
                (key_value, product, expiry_date) 
                VALUES ?`;
            
            const values = processedKeys.map(key => [
                key.key,
                key.product,
                key.expiryDate
            ]);

            await pool.query(insertQuery, [values]);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Keys Added Successfully')
                .setDescription(`Added ${processedKeys.length} keys to ${selectedProduct.toUpperCase()}`)
                .addFields(
                    { name: 'Duration', value: duration },
                    { name: 'Total Keys Added', value: processedKeys.length.toString() }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in themkey command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing the keys. Please try again.')
                .setColor(0xFF0000);
            if (!interaction.deferred) {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    }
};
