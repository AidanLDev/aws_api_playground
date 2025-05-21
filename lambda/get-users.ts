import { DynamoDB } from "aws-sdk";

const dynamo = new DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME!;

export const handler = async () => {
  try {
    let result: DynamoDB.DocumentClient.ScanOutput;
    try {
      result = await dynamo.scan({ TableName: tableName }).promise();
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

    if (!result.Items || result.Items.length === 0) {
      console.log("No users found in the database.");
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No users found" }),
      };
    }
    console.log("Users found in the database, going to return 200 now");
    console.log("Users found in the database: ", result.Items);

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
