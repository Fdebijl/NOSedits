(() => {
  'use strict';

  require('dotenv').config();

  const moment = require('moment');
  const express = require('express');
  const fs = require('fs');
  const request = require('request');
  const Twit = require('twit');
  const app = express();
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

  const ERR = {
    ALREADY_TWEETED: "ERR_ALREADY_TWEETED",
    NOT_ENOUGH_TITLES: "ERR_NOT_ENOUGH_TITLES",
    NO_DIFFERENCE: "ERR_NO_DIFFERENCE_BETWEEN_TITLES",
    TWEET_NOT_SENT: "ERR_COULD_NOT_SEND_TWEET"
  }

  app.use(express.json());
  let seenArticles = {};

  // Load config
  let CONFIG;
  CONFIG = JSON.parse(fs.readFileSync('config.json'));
  moment.locale(CONFIG.LOCALE);

  /**
   * Main method that validates an incoming article from OpenTitles and sends out a tweet if all the data is congruent.
   *
   * @param {*} article An article for the NOS as generated by the OpenTitles API.
   * @param {*} [twitterClient=T] Twitter API client to pass to sendTweet(). Use Twit for production and test/mocktwit for testing.
   * @returns {Promise} Resolves with the text of the sent tweet if everything went smoothly, rejects with an instance of ERR if an error occurred or the data was invalid.
   */
  async function notifyTitleChanged(article, twitterClient = T) {
    return new Promise((resolve, reject) => {
      if (article.titles.length < 2) {
        console.log(`[${moment().format('DD/MM/Y - HH:mm:ss')}] NOSEdits webhook was called without enough titles.`);
        reject(ERR.NOT_ENOUGH_TITLES);
        return;
      }
  
      if (article.titles[article.titles.length - 2].title === article.titles[article.titles.length - 1].title) {
        console.log(`[${moment().format('DD/MM/Y - HH:mm:ss')}] Old title and new title are the same`);
        reject(ERR.NO_DIFFERENCE);
        return;
      }
  
      if (!seenArticles[article.articleID]) {
        seenArticles[article.articleID] = {
          titles: [],
          lastTweet: null
        }
      }
  
      if (seenArticles[article.articleID].titles.includes(article.titles[article.titles.length - 1].title)) {
        console.log(`[${moment().format('DD/MM/Y - HH:mm:ss')}] Already tweeted this title for this article.`);
        reject(ERR.ALREADY_TWEETED);
        return;
      }
  
      let statusText = makeStatusTextFor(article);
  
      let params = { 
        status: statusText
      }
  
      if (seenArticles[article.articleID].lastTweet) {
        params.status = '@nosedits ' + statusText;
        params.in_reply_to_status_id = seenArticles[article.articleID].lastTweet;
      }
  
      sendTweet(params, article, twitterClient)
          .then((result) => {
            resolve(params.status);
          })
          .catch((error) => {
            reject(ERR.TWEET_NOT_SENT);
          });
    });
  }

  async function sendTweet(params, article, twitterClient = T) {
    return new Promise((resolve, reject) => {
      twitterClient.post('statuses/update', params, function (err, data, response) {
        seenArticles[article.articleID].titles.push(article.titles[article.titles.length - 1].title);

        if (err) {
          console.log(`[${moment().format('DD/MM/Y - HH:mm:ss')}] Error!`, err.message);
          reject(err);
          return;
        } 

        console.log(`[${moment().format('DD/MM/Y - HH:mm:ss')}] Sent out a tweet: ${params.status}`);
        seenArticles[article.articleID].lastTweet = data.id_str;  
        resolve();
      })
    });
  }

  function makeStatusTextFor(article) {
    const oldtitle = article.titles[article.titles.length - 2];
    const newtitle = article.titles[article.titles.length - 1];

    const timeDiff = moment(oldtitle.timestamp).from(newtitle.timestamp, true);
    const delay = timeDiff === 'Invalid date' ? '' : `na ${timeDiff} `

    return `De kop «${oldtitle.title}» is ${delay}gewijzigd naar «${newtitle.title}» ${article.guid || article.link}`;
  }

  module.exports = {
    notifyTitleChanged: notifyTitleChanged,
    makeStatusTextFor: makeStatusTextFor,
    sendTweet: sendTweet,
    errors: ERR
  }

  app.post('/notify', (req, res) => {
    if (typeof(req.body) != 'object') {
      req.body = JSON.parse(req.body);
    }

    res.status(200).send(notifyTitleChanged(req.body));
  })

  app.listen(7676);
})();