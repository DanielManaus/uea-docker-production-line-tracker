FROM alpine:3.20

RUN apk add --no-cache curl \
  && addgroup -S app \
  && adduser -S app -G app

WORKDIR /app
COPY send-events.sh .
RUN chmod +x send-events.sh \
  && chown -R app:app /app

USER app

CMD ["./send-events.sh"]
