import Twit from 'twit';
import { Collection } from 'mongodb';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { CONFIG } from '../config';
import { Article, MockTwit, TwitterError, TwitterParams } from '../types';
import { makeStatusText } from '../util/makeStatusText';
import { validateArticle } from '../util/validateArticle';
import { sendTweet } from '../twitter/sendTweet';

/**
 * Validates an incoming article from OpenTitles and sends out a tweet if all the data is congruent.
 *
 * @param {Article} article An article for the NOS as generated by the OpenTitles API.
 * @param {Twit} [twitterClient=T] Twitter API client to pass to sendTweet(). Use Twit for production and test/mocktwit for testing.
 * @returns {Promise} Resolves with the text of the sent tweet if everything went smoothly, rejects with an instance of ERR if an error occurred or the data was invalid.
 */
export async function notifyTitleChanged(article: Article, twitterClient: Twit | MockTwit, collection: Collection): Promise<TwitterError | string> {
  const clog = new Clog(CONFIG.MIN_LOGLEVEL);

  return new Promise((resolve, reject) => {
    validateArticle(collection, article)
      .then(async (seenArticle) => {
        const statusText = await makeStatusText(article);

        const params: TwitterParams = {
          status: statusText
        }

        // Reply to previous Tweet about this article, if it exists
        if (seenArticle) {
          clog.log('Found seen article for article ' + article.articleID, LOGLEVEL.DEBUG);
          params.in_reply_to_status_id = seenArticle.tweets[seenArticle.tweets.length - 1].status.id_str;
          params.auto_populate_reply_metadata = true;
        } else {
          clog.log('Did not find seen article for article ' + article.articleID, LOGLEVEL.DEBUG);
        }

        sendTweet(collection, params, twitterClient, article, seenArticle || undefined)
          .then(() => {
            resolve(params.status);
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((error) => {
        reject(error);
      })
  });
}