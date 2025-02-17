import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { setupAutomod } from './commands/admin/automod.js';
import { testConnection, initDatabase, pool } from './db/mysql.js';
import replies from './data/shop/replies.js';
import { createTranscript } from './utils/transcript.js';
import { translator } from './utils/translator.js';

process.removeAllListeners('warning');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ] 
});

// Bank API configuration
const BANK_API_URL = ''; // api link bank
const SIGNATURE = ''; // token bank
const BANK_CHANNEL_ID = '1335940104446935153';

// Store the latest transaction reference
let lastTransactionRef = '';

// Function to fetch bank transactions
async function fetchBankTransactions() {
    try {
        const response = await fetch(BANK_API_URL, {
            headers: { 'signature': SIGNATURE }
        });
        const data = await response.json();
        
        if (data.code === '00' && data.transactions?.length > 0) {
            const channel = client.channels.cache.get(BANK_CHANNEL_ID);
            if (!channel) return;

            const latestTransaction = data.transactions[0];
            if (latestTransaction.Reference === lastTransactionRef) return;
            
            lastTransactionRef = latestTransaction.Reference;
            const embed = new EmbedBuilder()
                .setTitle('New Bank Transaction')
                .setColor(latestTransaction.CD === '+' ? 0x00FF00 : 0xFF0000)
                .addFields(
                    { name: 'Date', value: latestTransaction.TransactionDate },
                    { name: 'Amount', value: `${latestTransaction.CD}${latestTransaction.Amount} VND` },
                    { name: 'Description', value: latestTransaction.Description },
                    { name: 'Reference', value: latestTransaction.Reference }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
    }
}

// Check bank transactions every minute
setInterval(fetchBankTransactions, 60000);

// Create collection for commands
client.commands = new Collection();

// Function to load commands from directories and subdirectories
const loadCommands = async (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            await loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            try {
                const command = (await import(`file://${filePath}`)).default;
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`Loaded command: ${command.data.name}`);
                } else {
                    console.log(`Command at ${filePath} is missing required "data" or "execute" properties`);
                    console.log('Command structure:', Object.keys(command));
                }
            } catch (error) {
                console.error(`Error loading command ${filePath}:`, error);
            }
        }
    }
};

// Initialize database and start bot
async function startBot() {
    try {
        // Create transcripts directory if it doesn't exist
        const transcriptsDir = path.join(__dirname, 'transcripts');
        try {
            await fs.promises.access(transcriptsDir);
        } catch {
            await fs.promises.mkdir(transcriptsDir, { recursive: true });
        }

        await testConnection();
        await initDatabase();
        console.log('Database connection established');
        await loadCommands(path.join(__dirname, 'commands'));
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Function to reload ticket buttons
async function reloadTicketButtons(client) {
    try {
        // Get all guild configs
        const [configs] = await pool.query('SELECT * FROM ticket_configs');
        
        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guild_id);
            if (!guild) continue;

            // Find the last ticket panel message in guild
            const channels = guild.channels.cache;
            for (const [_, channel] of channels) {
                try {
                    // Check if it's a text channel and bot has read permissions
                    if (
                        channel.type !== 0 || // 0 is ChannelType.GuildText
                        !channel.viewable ||
                        !channel.permissionsFor(client.user).has('ViewChannel') ||
                        !channel.permissionsFor(client.user).has('ReadMessageHistory')
                    ) {
                        continue;
                    }

                    const messages = await channel.messages.fetch({ limit: 100 });
                    const ticketMessage = messages.find(msg => 
                        msg.author.id === client.user.id && 
                        msg.embeds[0]?.title === '🎫 Support Ticket System'
                    );

                    if (ticketMessage) {
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

                        await ticketMessage.edit({
                            embeds: [embed],
                            components: [button]
                        });
                        
                        console.log(`Reloaded ticket button in channel ${channel.name} (${channel.id})`);
                    }
                } catch (error) {
                    // Only log serious errors
                    if (error.code !== 50001 && error.code !== 50013) {
                        console.error(`Error reloading ticket buttons in channel ${channel.name} (${channel.id}):`, error);
                    }
                }
            }
        }
        console.log('Ticket buttons reload process completed');
    } catch (error) {
        console.error('Error in reloadTicketButtons:', error);
    }
}

// Ready event handler
client.once('ready', async () => {
    console.log('Bot is ready!');
    fetchBankTransactions();
    
    const allowedDomains = setupAutomod(client);
    if (allowedDomains) {
        console.log('AutoMod system activated');
    }

    // Reload ticket buttons
    await reloadTicketButtons(client);

    client.user.setPresence({
        activities: [{
            name: 'arons.dev',
            type: 1
        }],
        status: 'dnd'
    });
});

// Message handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    try {
        // Dịch tin nhắn sang tiếng Việt
        const translatedContent = await translator(message.content);
        
        // Nếu nội dung đã được dịch khác với nội dung gốc
        if (translatedContent !== message.content) {
            // Gửi tin nhắn đã dịch dưới dạng reply
            await message.reply({
                content: `🔄 Bản dịch: ${translatedContent}`,
                allowedMentions: { repliedUser: false }
            });
        }
    } catch (error) {
        console.error('Lỗi khi xử lý tin nhắn:', error);
    }
});

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Command execution error:', error);
        
        // Kiểm tra xem interaction đã được reply chưa
        if (interaction.deferred || interaction.replied) {
            try {
                await interaction.followUp({ 
                    content: 'Có lỗi xảy ra khi thực hiện lệnh này!', 
                    ephemeral: true 
                });
            } catch (err) {
                console.error('Error sending followUp:', err);
            }
        } else {
            try {
                await interaction.reply({ 
                    content: 'Có lỗi xảy ra khi thực hiện lệnh này!', 
                    ephemeral: true 
                });
            } catch (err) {
                console.error('Error sending reply:', err);
            }
        }
    }
});

// Server join handler
client.on('guildCreate', (guild) => {
    const shopDir = path.join(__dirname, 'data', 'shop');
    if (!fs.existsSync(shopDir)) {
        fs.mkdirSync(shopDir, { recursive: true });
    }
    
    const serverInfo = `Server ID: ${guild.id} | Server Name: ${guild.name}\n`;
    fs.appendFileSync(path.join(shopDir, 'serverid.txt'), serverInfo, 'utf8');
    console.log(`Joined server: ${guild.name}`);
});

// Handle ticket creation and closing buttons
client.on('interactionCreate', async (interaction) => {
    // Handle ticket creation button
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        try {
            // Check existing tickets
            const [existingTickets] = await pool.query(
                'SELECT * FROM tickets WHERE user_id = ? AND guild_id = ? AND status = "open"',
                [interaction.user.id, interaction.guild.id]
            );

            if (existingTickets.length > 0) {
                return interaction.reply({
                    content: 'You already have an open ticket!',
                    ephemeral: true
                });
            }

            // Create and show modal
            const modal = new ModalBuilder()
                .setCustomId('ticket_modal')
                .setTitle('Create a Support Ticket');

            const invoiceInput = new TextInputBuilder()
                .setCustomId('ticket_invoice')
                .setLabel('Invoice Number')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your invoice number')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50);

            const emailInput = new TextInputBuilder()
                .setCustomId('ticket_email')
                .setLabel('Email Address')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your email address')
                .setRequired(true)
                .setMinLength(5)
                .setMaxLength(100);

            const contentInput = new TextInputBuilder()
                .setCustomId('ticket_content')
                .setLabel('Content')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Please describe your issue in detail...')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(invoiceInput),
                new ActionRowBuilder().addComponents(emailInput),
                new ActionRowBuilder().addComponents(contentInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing ticket modal:', error);
            await interaction.reply({
                content: 'An error occurred while creating the ticket!',
                ephemeral: true
            });
        }
    }

    // Handle modal submit
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
        try {
            const invoice = interaction.fields.getTextInputValue('ticket_invoice');
            const email = interaction.fields.getTextInputValue('ticket_email');
            const content = interaction.fields.getTextInputValue('ticket_content');

            // Get config
            const [configs] = await pool.query(
                'SELECT * FROM ticket_configs WHERE guild_id = ?',
                [interaction.guild.id]
            );

            if (!configs.length) {
                return interaction.reply({
                    content: 'Ticket system has not been set up!',
                    ephemeral: true
                });
            }

            const ticketId = Math.random().toString(36).substring(2, 9);
            const userName = interaction.user.username.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            
            // Create ticket channel
            const channel = await interaction.guild.channels.create({
                name: `ticket-${userName}`,
                parent: configs[0].category_id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    },
                    {
                        id: configs[0].support_role_id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    }
                ]
            });

            // Save ticket to database
            await pool.query(
                'INSERT INTO tickets (ticket_id, user_id, channel_id, guild_id) VALUES (?, ?, ?, ?)',
                [ticketId, interaction.user.id, channel.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle(`Ticket #${ticketId}`)
                .setDescription(`Support ticket for ${interaction.user}`)
                .addFields(
                    { name: 'Invoice Number', value: invoice },
                    { name: 'Email', value: email },
                    { name: 'Content', value: content }
                )
                .setColor('#0099ff')
                .setTimestamp();

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await channel.send({
                content: `<@&${configs[0].support_role_id}> - New ticket from ${interaction.user}`,
                embeds: [embed],
                components: [closeButton]
            });

            await interaction.reply({
                content: `Your ticket has been created: ${channel}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating ticket:', error);
            await interaction.reply({
                content: 'An error occurred while creating the ticket!',
                ephemeral: true
            });
        }
    }

    // Handle close ticket button
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        try {
            const channel = interaction.channel;
            
            const [rows] = await pool.query(
                'SELECT * FROM tickets WHERE channel_id = ? AND status = "open"',
                [channel.id]
            );

            if (!rows.length) {
                return interaction.reply({
                    content: 'This channel is not a ticket!',
                    ephemeral: true
                });
            }

            const transcript = await createTranscript(channel);
            
            const [configs] = await pool.query(
                'SELECT * FROM ticket_configs WHERE guild_id = ?',
                [interaction.guild.id]
            );

            if (configs.length > 0) {
                const logChannel = interaction.guild.channels.cache.get(configs[0].log_channel_id);
                if (logChannel) {
                    await logChannel.send({
                        content: `Ticket #${rows[0].ticket_id} was closed by ${interaction.user.tag}`,
                        files: [transcript]
                    });
                }
            }

            await pool.query(
                'UPDATE tickets SET status = "closed", closed_at = NOW() WHERE channel_id = ?',
                [channel.id]
            );

            await interaction.reply({
                content: 'Ticket will be closed in 5 seconds...',
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error('Error deleting channel:', error);
                }
            }, 5000);

        } catch (error) {
            console.error('Error closing ticket:', error);
            await interaction.reply({
                content: 'An error occurred while closing the ticket!',
                ephemeral: true
            });
        }
    }
});

// Start the bot
startBot();
