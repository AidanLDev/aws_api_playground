import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const dynamo = new DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { email, number } = body;
    if (!email && !number) {
      console.log("No email or number provided...");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: JSON.stringify("") }),
      };
    }

    const newUser = {
      id: uuidv4(),
      email: email ?? "",
      number: number ?? 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await dynamo
        .put({
          TableName: tableName,
          Item: newUser,
        })
        .promise();
    } catch (err) {
      console.error("error creating user in dynamo: ", err);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Error creating user in dynamo",
          error: err,
        }),
      };
    }
    console.log("User created in dynamo, going to return 200 now");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Created a new user", newUser }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch users", error }),
    };
  }
};
