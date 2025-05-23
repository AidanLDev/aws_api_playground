import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({});

async function enqueueEmail(userId: string, message: string, email: string) {
  const params = {
    QueueUrl: process.env.NOTIFICATIONS_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: "email",
      userId,
      message,
      email,
    }),
  };
  await sqsClient.send(new SendMessageCommand(params));
}

async function enqueueSms(userId: string, message: string, number: string) {
  const params = {
    QueueUrl: process.env.NOTIFICATIONS_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: "sms",
      userId,
      message,
      number,
    }),
  };
  await sqsClient.send(new SendMessageCommand(params));
}

async function enqueuePush(userId: string, message: string, number: string) {
  const params = {
    QueueUrl: process.env.NOTIFICATIONS_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: "push",
      userId,
      message,
      number,
    }),
  };
  await sqsClient.send(new SendMessageCommand(params));
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  console.log(
    "Going to add a notification message to this queue: ",
    process.env.NOTIFICATIONS_QUEUE_URL
  );
  const body = JSON.parse(event.body ?? "{}");
  const { type, userId, message } = body;

  try {
    if (type === "email") {
      console.log("Sending email message to the queue for: ", body.email);
      await enqueueEmail(userId, message, body.email);
    } else if (type === "sms") {
      console.log("Sending SMS message to the queue for: ", body.number);
      await enqueueSms(userId, message, body.number);
    } else if (type === "push") {
      console.log("Sending push message to the queue for: ", body.number);
      await enqueuePush(userId, message, body.number);
    }
  } catch (err) {
    console.error("Failed to enqueue message: ", err);
    return { statusCode: 500, body: "Failed to enqueue message" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Lambda!",
      path: event.path,
    }),
  };
};
