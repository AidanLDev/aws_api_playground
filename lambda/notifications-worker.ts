import { DynamoDB } from "aws-sdk";
import { SES } from "aws-sdk";
import { SNS } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const ses = new SES();
const dynamo = new DynamoDB.DocumentClient();
const sns = new SNS();

const notificationsTableName = process.env.NOTIFICATIONS_TABLE_NAME!;
const updateNotificationsTable = async (userId: string, type: string) => {
  const newNotification = {
    id: uuidv4(),
    userId: userId,
    type: type,
    createdAt: new Date().toISOString(),
  };

  try {
    await dynamo
      .put({
        TableName: notificationsTableName,
        Item: newNotification,
      })
      .promise();
  } catch (err) {
    console.error("Faield to update notifications table: ", err);
    throw new Error("Failed to update notifications table");
  }
};

export const handler = async (event: any) => {
  const messages = event?.Records ?? [];
  for (const message of messages) {
    console.log("Processing message: ", message);
    const body = JSON.parse(message?.body ?? "{}");
    if (!body.type || !body.userId || !body.message) {
      console.error("Invalid message format: ", body);
    } else {
      console.log(
        `Processing notification for user ${body.userId} of type ${body.type} with message: ${body.message}`
      );
      await updateNotificationsTable(body.userId, body.type);

      if (body.type === "email") {
        console.log(
          `Sending email to ${body.email} with message: ${body.message}`
        );
        try {
          await ses
            .sendEmail({
              Source: "dev@aidanlowson.com",
              Destination: { ToAddresses: [body.email] },
              Message: {
                Subject: { Data: "New Notification" },
                Body: {
                  Text: { Data: body.message },
                },
              },
            })
            .promise();
        } catch (err) {
          console.error("Failed to send email: ", err);
          throw new Error("Failed to send email");
        }
      } else if (body.type === "sms") {
        console.log("Sending SMS to ", body.number);
        try {
          await sns
            .publish({
              PhoneNumber: body.number,
              Message: body.message,
            })
            .promise();
        } catch (err) {
          console.error("Failed to send SMS: ", err);
          throw new Error("Failed to send SMS");
        }
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Notifications sent successfully",
      path: event.path,
    }),
  };
};
