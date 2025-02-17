import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export function setupAutomod(client, muteTime = 300000, spamThreshold = 4) {
    // Read domains from file
    const domainFilePath = path.join(process.cwd(), 'data', 'shop', 'domain.txt');
    let allowedDomains = [];
    try {
        if (fs.existsSync(domainFilePath)) {
            allowedDomains = fs.readFileSync(domainFilePath, 'utf8').split(',').filter(Boolean);
        } else {
            // Create directory if it doesn't exist
            fs.mkdirSync(path.join(process.cwd(), 'data', 'shop'), { recursive: true });
            // Create file with default domains
            const defaultDomains = [
                'facebook.com',
                'drive.google.com',
                'youtube.com',
                'roblox.com',
                'arons.dev',
                'arons.store',
                'discord.com',
                'fandom.com',
                'instagram.com',
                'twitter.com',
                'tiktok.com',
                'fisch.fandom.com',
                'fischipedia.org',
                'giphy.com',
                'github.com',
                'store.steampowered.com'
            ];
            fs.writeFileSync(domainFilePath, defaultDomains.join(','));
            allowedDomains = defaultDomains;
        }
    } catch (error) {
        console.error('Error reading domain file:', error);
        return null;
    }

    const messageCache = new Map();

    // Add the messageCreate event listener
    client.on('messageCreate', async (message) => {
        // Skip if message is from a bot or not in a guild
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const messageContent = message.content.trim();
        const member = message.guild.members.cache.get(message.author.id);
        const bypassRoleIds = process.env.WHITELIST_ROLE_ID?.split(',') || [];
        const adminIds = process.env.ADMIN_ID?.split(',') || [];

        // Check if user is admin or has bypass role
        if (member && (adminIds.includes(userId) || member.roles.cache.some(role => bypassRoleIds.includes(role.id)))) {
            return;
        }

        if (!messageCache.has(userId)) {
            messageCache.set(userId, []);
        }

        const userMessages = messageCache.get(userId);
        userMessages.push({ content: messageContent, timestamp: Date.now() });

        const recentMessages = userMessages.filter(msg => Date.now() - msg.timestamp <= 30000);
        messageCache.set(userId, recentMessages);

        const messageCount = recentMessages.filter(msg => msg.content === messageContent).length;

        if (messageCount >= spamThreshold) {
            if (member && member.moderatable) {
                const spamEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Spam Detected')
                    .setDescription(`<@${userId}> has been muted for ${muteTime / 1000} seconds`)
                    .addFields(
                        { name: '📝 Reason', value: 'Sending the same message too many times' },
                        { name: '⚠️ Warning', value: 'Avoid spamming to prevent future mutes!' }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();

                try {
                    await member.timeout(muteTime, 'Anti-Spam System');
                    await message.channel.send({ embeds: [spamEmbed] });
                    messageCache.set(userId, []);
                } catch (error) {
                    console.error('Error applying timeout:', error);
                }
            }
        }

        // Check if message contains a URL
        if (message.content.includes('http') || message.content.includes('www')) {
            try {
                // Read current allowed domains
                const currentAllowedDomains = fs.readFileSync(domainFilePath, 'utf8').split(',').filter(Boolean);
                
                // Extract URLs from message
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urls = message.content.match(urlRegex);

                if (urls) {
                    for (const url of urls) {
                        const urlObj = new URL(url);
                        const domain = urlObj.hostname.replace('www.', '');
                        
                        // List of major trusted domains that don't need checking
                        const trustedDomains = [
                            'facebook.com',
                            'instagram.com',
                            'tiktok.com',
                            'twitter.com',
                            'youtube.com',
                            'google.com',
                            'github.com',
                            'discord.com',
                            'reddit.com'
                        ];

                        // Skip checking for trusted domains
                        if (trustedDomains.some(trusted => domain.endsWith(trusted))) {
                            continue;
                        }

                        // Special handling for Discord invites
                        if (domain === 'discord.gg' || domain === 'discord.com') {
                            const inviteCode = url.split('/').pop();
                            try {
                                const invite = await client.fetchInvite(inviteCode);
                                
                                // Check if server is NSFW
                                if (invite.guild.nsfw) {
                                    const nsfwEmbed = new EmbedBuilder()
                                        .setColor('#FF0000')
                                        .setTitle('🔞 NSFW Server Invite Detected')
                                        .setDescription(`<@${userId}> has been kicked for sharing NSFW server invite`)
                                        .setTimestamp();

                                    const dmEmbed = new EmbedBuilder()
                                        .setColor('#FF0000')
                                        .setTitle('🔞 You have been kicked')
                                        .setDescription(`You were kicked from ${message.guild.name} for sharing an NSFW server invite`)
                                        .addFields(
                                            { name: '📝 Reason', value: 'Sharing NSFW server invite is not allowed' },
                                            { name: '⚠️ Warning', value: 'Please do not share NSFW content in this server' }
                                        )
                                        .setTimestamp();

                                    await message.author.send({ embeds: [dmEmbed] });
                                    await message.delete();
                                    await member.kick('Sharing NSFW server invite');
                                    await message.channel.send({ embeds: [nsfwEmbed] });
                                    continue;
                                }

                                // Check for known malicious invites
                                const isMalicious = await checkIfInviteIsMalicious(inviteCode);
                                if (isMalicious) {
                                    const maliciousEmbed = new EmbedBuilder()
                                        .setColor('#FF0000')
                                        .setTitle('⚠️ Malicious Discord Invite Detected')
                                        .setDescription(`<@${userId}> has been muted for 5 minutes`)
                                        .addFields(
                                            { name: '📝 Reason', value: 'Sharing potentially harmful Discord invite' }
                                        )
                                        .setTimestamp();

                                    await message.delete();
                                    await member.timeout(300000, 'Sharing malicious Discord invite');
                                    await message.channel.send({ embeds: [maliciousEmbed] });
                                    continue;
                                }
                            } catch (error) {
                                console.error('Error checking Discord invite:', error);
                            }
                        }
                        
                        // Check if domain is not in allowed list (only for non-trusted domains)
                        if (!currentAllowedDomains.some(allowed => domain.endsWith(allowed))) {
                            if (member && member.kickable) {
                                const scamEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('🚨 Suspicious Link Detected')
                                    .setDescription(`<@${userId}> has been kicked from the server`)
                                    .addFields(
                                        { name: '📝 Reason', value: 'Sending unauthorized or potentially harmful links' },
                                        { name: '🛡️ Protection', value: 'Only trusted domains are allowed in this server!' }
                                    )
                                    .setThumbnail(message.author.displayAvatarURL())
                                    .setTimestamp();

                                const dmEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('🚨 You have been kicked')
                                    .setDescription(`You were kicked from ${message.guild.name} for sharing unauthorized links`)
                                    .addFields(
                                        { name: '📝 Reason', value: 'Sending unauthorized or potentially harmful links' },
                                        { name: '🔗 Domain', value: domain },
                                        { name: '⚠️ Warning', value: 'Only trusted domains are allowed in this server' }
                                    )
                                    .setTimestamp();

                                try {
                                    await message.author.send({ embeds: [dmEmbed] });
                                    await message.delete();
                                    await member.kick('Unauthorized Link');
                                    await message.channel.send({ embeds: [scamEmbed] });
                                } catch (error) {
                                    console.error('Error handling unauthorized link:', error);
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing URL:', error);
            }
        }
    });

    return allowedDomains;
}

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('🛡️ Protect server from spam and scam links and NSFW server invite')
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('⏰ Mute duration for spammers (seconds)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('domain')
                .setDescription('🌐 Add allowed domain (e.g. example.com)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('remove')
                .setDescription('❌ Remove domain instead of adding')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user has permission (server admin or bot owner)
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isBotOwner = process.env.ADMIN_ID?.split(',').includes(interaction.user.id);

        if (!isAdmin && !isBotOwner) {
            const noPermEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ Insufficient Permissions')
                .setDescription('You need to be a server administrator or bot owner to use this command.')
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        // Check bot permissions
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles) || !botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permission Error')
                .setDescription('Bot needs "Manage Roles" and "Timeout Members" permissions to execute this command.')
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const muteTime = interaction.options.getInteger('time') ? interaction.options.getInteger('time') * 1000 : 300000;
        const spamThreshold = 4;

        // Use the setupAutomod function instead of defining everything here
        const allowedDomains = setupAutomod(interaction.client, muteTime, spamThreshold);
        if (!allowedDomains) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('Failed to setup automod')
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Handle domain management
        const newDomain = interaction.options.getString('domain');
        const removeDomain = interaction.options.getBoolean('remove') || false;

        // Handle domain modification if provided
        if (newDomain) {
            const domainPattern = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
            if (!domainPattern.test(newDomain)) {
                const invalidDomainEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Invalid Domain')
                    .setDescription('Please provide a valid domain name (e.g. example.com)')
                    .setTimestamp();
                return interaction.reply({ embeds: [invalidDomainEmbed], ephemeral: true });
            }

            try {
                if (removeDomain) {
                    const index = allowedDomains.indexOf(newDomain);
                    if (index > -1) {
                        allowedDomains.splice(index, 1);
                        fs.writeFileSync(domainFilePath, allowedDomains.join(','));
                        const removedEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Domain Removed')
                            .setDescription(`Successfully removed ${newDomain} from allowed domains`)
                            .setTimestamp();
                        await interaction.reply({ embeds: [removedEmbed] });
                        return;
                    } else {
                        const notFoundEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Domain Not Found')
                            .setDescription(`${newDomain} is not in the allowed domains list`)
                            .setTimestamp();
                        return interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
                    }
                } else {
                    if (allowedDomains.includes(newDomain)) {
                        const existsEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Domain Exists')
                            .setDescription(`${newDomain} is already in the allowed domains list`)
                            .setTimestamp();
                        return interaction.reply({ embeds: [existsEmbed], ephemeral: true });
                    }
                    allowedDomains.push(newDomain);
                    fs.writeFileSync(domainFilePath, allowedDomains.join(','));
                    const addedEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ Domain Added')
                        .setDescription(`Successfully added ${newDomain} to allowed domains`)
                        .setTimestamp();
                    await interaction.reply({ embeds: [addedEmbed] });
                    return;
                }
            } catch (error) {
                console.error('Error updating domain file:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Error')
                    .setDescription('Failed to update allowed domains file')
                    .setTimestamp();
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛡️ AutoMod Activated')
            .setDescription('Server protection system is now enabled')
            .addFields(
                { name: '🤖 Features', value: '• Anti-Spam\n• Unauthorized Links Protection\n• NSFW Server Protection\n• Malicious Invite Protection' },
                { name: '⚙️ Settings', value: `• Mute duration: ${muteTime / 1000} seconds\n• Spam threshold: ${spamThreshold} messages` },
                { name: '🌐 Allowed Domains', value: allowedDomains.join('\n') }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp();

        return interaction.reply({ embeds: [successEmbed] });
    },
};
