# Heroku + KAFKA + Algorithmia

This app is one component of the Algorithmia/Kafka demo. Intended to populate the average sentiment for a topic.

## Running
Make sure you define the environment variables (through attachment to your Kafka addon):

- `KAFKA_URL`: Comma-separated list of Kafka broker URLs
- `KAFKA_CLIENT_CERT`: Contents of the Kafka client certificate. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `KAFKA_CLIENT_CERT_KEY`: Contents of the Kafka client certificate key. This is set on a Heroku app when the Apache Kafka on Heroku add-on is attached.
- `KAFKA_CONSUMER_TOPIC`: Kafka topic name from which to consume messages.

Make sure you also have Algorithmia-specific environment variables:

- `ALGORITHMIA_API_KEY`: your API key, ideally one that you created only for this project

If you're using a private/on-prem version of Algorithmia (CODEX), you'll want to define another environment 
variable `ALGORITHMIA_API_KEY` to point to your private cluster. For most users you will not need 
to bother about this.

Continue with steps detailed for other components here: https://heroku.github.io/kafka-demo/

