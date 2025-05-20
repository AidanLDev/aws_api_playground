import { DynamoDB } from "aws-sdk";

const dynamo = new DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME!;

export const handler = async () => {
  try {
    const result = await dynamo.scan({ TableName: tableName }).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch users", error }),
    };
  }
};
