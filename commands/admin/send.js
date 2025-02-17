import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send an announcement to everyone')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement content')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Image for the announcement')
        .setRequired(false)),

  async execute(interaction) {
    // Defer the reply immediately
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      const noPermEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⛔ Insufficient Permissions')
        .setDescription('You need ADMINISTRATOR permission to use this command.')
        .setTimestamp();
      return interaction.editReply({ embeds: [noPermEmbed] });
    }

    const message = interaction.options.getString('message').replace(/\\n/g, '\n');
    const attachment = interaction.options.getAttachment('image');

    // Validate attachment is an image if provided
    if (attachment) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validImageTypes.includes(attachment.contentType)) {
        return interaction.editReply({
          content: '❌ The attached file must be an image (JPEG, PNG, or GIF).'
        });
      }
    }

    // Generate random color
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);

    const embed = new EmbedBuilder()
      .setColor(randomColor)
      .setTitle('📢 Announcement')
      .setDescription(message)
      .setThumbnail('https://cdn.discordapp.com/attachments/1318252966515576943/1330188986160775240/bucac.gif?ex=678d1288&is=678bc108&hm=989a27d626a6b363b3d581f32bd735acad6d1a9e28792e26f0a4b5468114605c&')
      .setFooter({ text: 'Developer: Hitori, Desgin: Arons' })
      .setTimestamp();

    if (attachment) {
      embed.setImage(attachment.url);
    } else {
      embed.setImage('https://i.pinimg.com/originals/f5/26/77/f526775e428eece2b1b9101cf5c3382a.gif');
    }

    try {
      await interaction.channel.send({ content: '@everyone', embeds: [embed] });
      await interaction.editReply({
        content: '✅ Announcement sent successfully!'
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Failed to send announcement. Please try again.'
      });
    }
  },
};
