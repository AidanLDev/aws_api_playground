import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";

export class CdkLambdaGatewayPlaygroundStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloFunction = new NodejsFunction(this, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "hello.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
    });

    const api = new apigateway.RestApi(this, "aws_api_playground", {
      restApiName: "aws_api_playground",
      description: "An AWS API built with apigateway and Lambda",
    });

    const users = api.root.addResource("users");

    const usersTable = new dynamo.Table(this, "Users_Playground", {
      partitionKey: { name: "id", type: dynamo.AttributeType.STRING },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      tableName: "MyAwesomeTable",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const getUsersLambda = new NodejsFunction(this, "GetUsersFunction", {
      entry: "lambda/get-users.ts",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
      },
      bundling: {
        format: OutputFormat.CJS,
      },
    });

    const postUserLambda = new NodejsFunction(this, "PostUserFunction", {
      entry: "lambda/post-user.ts",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
      },
      bundling: {
        format: OutputFormat.CJS,
      },
    });

    usersTable.grantWriteData(postUserLambda);
    usersTable.grantReadData(getUsersLambda);

    api.root.addMethod("GET", new apigateway.LambdaIntegration(helloFunction));
    users.addMethod("GET", new apigateway.LambdaIntegration(getUsersLambda));
    users.addMethod(
      "POST",
      new apigateway.LambdaIntegration(postUserLambda, {
        proxy: true,
      })
    );
  }
}
