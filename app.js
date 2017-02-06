'use strict';

const fs = require('fs' );
const _ = require('lodash');
const JSONbig = require('json-bigint');
const Bacon = require('baconjs');
const Kafka = require('no-kafka');
const algorithmia = require('algorithmia');

const consumerTopicBase = process.env.KAFKA_CONSUMER_TOPIC;

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const TEN_MINUTE = ONE_MINUTE * 10;
const ONE_HOUR   = TEN_MINUTE * 6;

// Check that required Kafka environment variables are defined
const cert = process.env.KAFKA_CLIENT_CERT
const key  = process.env.KAFKA_CLIENT_CERT_KEY
const url  = process.env.KAFKA_URL
if (!cert) throw new Error('KAFKA_CLIENT_CERT environment variable must be defined.');
if (!key) throw new Error('KAFKA_CLIENT_CERT_KEY environment variable must be defined.');
if (!url) throw new Error('KAFKA_URL environment variable must be defined.');

// Check that Algorithmia API key exists
const algoApiKey = process.env.ALGORITHMIA_API_KEY;
if (!algoApiKey) throw new Error('ALGORITHMIA_API_KEY environment variable must be defined.');
let algoClient = algorithmia(algoApiKey);

// Write certs to disk because that's how no-kafka library needs them
fs.writeFileSync('./client.crt', process.env.KAFKA_CLIENT_CERT)
fs.writeFileSync('./client.key', process.env.KAFKA_CLIENT_CERT_KEY)

// Configure consumer client
const consumer = new Kafka.SimpleConsumer({
    idleTimeout: 100,
    clientId: 'twitter-sentiment-consumer',
    connectionString: url.replace(/\+ssl/g,''),
    ssl: {
      certFile: './client.crt',
      keyFile: './client.key'
    }
});

// Configure producer client
const producer = new Kafka.Producer({
    clientId: 'tweet-sentiment-producer',
    connectionString: url.replace(/\+ssl/g,''),
    ssl: {
      certFile: './client.crt',
      keyFile: './client.key'
    }
});

/*
 * Startup producer followed by consumer
 *
 */
return producer.init().then(function() {
    console.log('Producer connected.');
    return consumer.init().then(function () {
        console.log('Consumer connected.');

        const consumerTopic = `${consumerTopicBase}-keyword`;

        console.log('Consuming from topic:', consumerTopic)

        // Create Bacon stream from incoming Kafka messages
        const stream = Bacon.fromBinder(function(sink) {
            function dataHandler(messageSet, topic, partition) {
                messageSet.forEach(function (m) {
                    sink(JSONbig.parse(m.message.value.toString('utf8')).text);
                });
            }

            consumer.subscribe(consumerTopic, dataHandler);

            return function() {
                consumer.unsubscribe(consumerTopic);
            }
        });

        // Accumulate tweets in order to send them as a batch
        function accTweets(accumulator, body) {

            // remove twitter-specific words
            var cleanBody = body.replace(/RT /g, '') // retweets
            cleanBody = cleanBody.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // urls
            cleanBody = cleanBody.replace(/@(\w){1,15}: /g, '') // @name's (replies)
            cleanBody = cleanBody.replace(/@(\w){1,15}/g, '') // @name's (mentions)

            // merge it with previous chain
            var total = _.union(accumulator, [cleanBody])

            // limit that chain length to 20
            if (total.length > 20)
                total = _.takeRight(total, 20)

            return total;
        }

        let allTweets = stream.scan({}, accTweets);

        // Sample and calc sentiment for tweets every N seconds
        let sampleTweets = allTweets.sample(ONE_SECOND);

        sampleTweets.onValue(function(tweets) {

            algoClient.algo("algo://nlp/SocialSentimentAnalysis/0.1.5")
                .pipe(tweets)
                .then(function(response) {
                    
                    var result = response.get();
                    var avgSentiment = _.sumBy(result, (i) => i.compound) / result.length;

                    let msg = {
                        time: Date.now(),
                        avgSentiment: avgSentiment,
                    }
                    
                    producer.send({
                        topic: `${consumerTopicBase}-sentiment`,
                        partition: 0,
                        message: {
                            value: JSONbig.stringify(msg)
                        }
                    })

                });
        });
    });
});
