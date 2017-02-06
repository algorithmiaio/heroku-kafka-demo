# algo-kafka-sentiment

This app is one component of the Algorithmia/Kafka demo. Intended to populate the average sentiment for a topic.

## Running
Make sure you define the environment variables (through attachment to your Kafka addon):

- `KAFKA_URL`: Comma-separated list of Kafka broker URLs
- `KAFKA_CLIENT_CERT`: Contents of the Kafka client certificate. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `KAFKA_CLIENT_CERT_KEY`: Contents of the Kafka client certificate key. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `KAFKA_CONSUMER_TOPIC`: Kafka topic name from which to consume messages.

And you'll need to update `Procfile` to include one process per keyword being tracked.
