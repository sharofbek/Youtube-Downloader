const { Telegraf, Markup } = require('telegraf');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');


const bot = new Telegraf('6756911285:AAHVp09_cWvJxVYwi2j32cvz7xA35jJL_p0');

bot.start((ctx) => {
  ctx.reply("Salom! YouTube-dan video yuklab olish uchun video URLini jo'nating.");
});

const userData = new Map();




bot.on('text', async (ctx) => {
  const url = ctx.message.text;

  if (!ytdl.validateURL(url)) {
    ctx.reply("Noto'g'ri yoki qo'llab-quvvatlanmaydigan YouTube URLi. Iltimos, to'g'ri YouTube video URLini yuboring.");
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const formats = info.formats.filter((format) => format.container === 'mp4' && format.audioCodec && format.videoCodec);

    if (formats.length === 0) {
      ctx.reply("Video uchun yuklab olish formati topilmadi. Iltimos, boshqa YouTube video URLini yuboring.");
      return;
    }

    const formatButtons = formats.map((format, index) => {
      return [
        Markup.button.callback(
          `${index + 1}. ${format.qualityLabel || format.quality} - ${format.container}`,
          `format_${index}`,
        ),
      ];
    });


    

    const keyboard = Markup.inlineKeyboard(formatButtons);

    ctx.reply('Qaysi formatda yuklashni xohlaysiz?', keyboard);

    const chatID = ctx.chat.id;
    userData.set(chatID, {
      hearing: true,
      url: url,
      title: title,
      formats: formats,
    });
  } catch (error) {
    console.error(error);
    ctx.reply("Hatolik yuz berdi. Iltimos, boshqa YouTube video URLini yuboring.");
  }
});

bot.action(/format_/i, async (ctx) => {
  const chatID = ctx.chat.id;
  const userSpecificData = userData.get(chatID);

  if (!userSpecificData || !userSpecificData.hearing) {
    return;
  }

  const formatIndex = parseInt(ctx.callbackQuery.data.split('_')[1]);
  const { url, title, formats } = userSpecificData;

  ctx.answerCbQuery();

  if (isNaN(formatIndex) || formatIndex < 0 || formatIndex >= formats.length) {
    ctx.reply("Noto'g'ri format tanlangan. Iltimos, qayta urinib ko'ring.");
    return;
  }

  const videoFormat = formats[formatIndex];

  // Loader belgisini yuborish
  const loaderMsg = await ctx.reply("⏳ Video yuklanmoqda, iltimos kuting...");

  try {
    const downloadOptions = { format: videoFormat };
    await ctx.replyWithVideo(
      {
        source: ytdl(url, downloadOptions),
        caption: title,
      },
      {
        reply_to_message_id: ctx.callbackQuery.message.message_id,
      },
    );


    ctx.telegram.deleteMessage(loaderMsg.chat.id, loaderMsg.message_id);
  } catch (error) {
    console.error(error);

    // Hatolik yuz berishi mumkin bo'lganida loader belgisini o'chirish
    ctx.telegram.deleteMessage(loaderMsg.chat.id, loaderMsg.message_id);

    ctx.reply("Hatolik yuz berdi. Iltimos, boshqa YouTube video URLini yuboring.");
  } finally {
    userData.set(chatID, { ...userSpecificData, hearing: false });
  }

  
});



bot.launch();

console.log("Bot ishga tushdi.");
