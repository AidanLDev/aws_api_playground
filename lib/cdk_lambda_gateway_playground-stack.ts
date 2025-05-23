import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ses from "aws-cdk-lib/aws-ses";

const VERIFIED_EMAIL = "dev@aidanlowson.com";

export class CdkLambdaGatewayPlaygroundStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, "aws_api_playground", {
      restApiName: "aws_api_playground",
      description: "An AWS API built with apigateway and Lambda",
    });

    const usersTable = new dynamo.Table(this, "Users_Playground", {
      partitionKey: { name: "id", type: dynamo.AttributeType.STRING },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      tableName: "Users",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const notificationsTable = new dynamo.Table(
      this,
      "Notifications_Playground",
      {
        partitionKey: { name: "id", type: dynamo.AttributeType.STRING },
        billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
        tableName: "Notifications",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const notificationQueue = new sqs.Queue(this, "NotificationQueue", {
      queueName: "NotificationQueue",
    });

    const notificationSnsTopic = new sns.Topic(this, "NotificationSnsTopic", {
      displayName: "Notification SNS Topic",
    });

    const notificationEmailIdentityArn = `arn:aws:ses:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:identity/${VERIFIED_EMAIL}`;

    /** Define Lambda's */
    const helloFunction = new NodejsFunction(this, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "hello.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
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

    const postNotificationLambda = new NodejsFunction(
      this,
      "PostNotificationFunction",
      {
        entry: "lambda/post-notifications.ts",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        environment: {
          NOTIFICATIONS_QUEUE_URL: notificationQueue.queueUrl,
        },
        bundling: {
          format: OutputFormat.CJS,
        },
      }
    );

    const notificationWorkerLambda = new NodejsFunction(
      this,
      "NotificationWorkerFunction",
      {
        entry: "lambda/notifications-worker.ts",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        bundling: {
          format: OutputFormat.CJS,
        },
        environment: {
          NOTIFICATIONS_TABLE_NAME: notificationsTable.tableName,
          SES_EMAIL_IDENTITY: VERIFIED_EMAIL,
          SNS_TOPIC_ARN: notificationSnsTopic.topicArn,
        },
      }
    );

    // Grant publish to SNS topic
    notificationSnsTopic.grantPublish(notificationWorkerLambda);


    const users = api.root.addResource("users");
    const notifications = api.root.addResource("notifications");

    // IAM Permissions
    usersTable.grantWriteData(postUserLambda);
    usersTable.grantReadData(getUsersLambda);
    notificationWorkerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [notificationEmailIdentityArn],
      })
    );

    notificationWorkerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: [notificationSnsTopic.topicArn],
      })
    );

    notificationWorkerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(notificationQueue)
    );
    notificationQueue.grantSendMessages(postNotificationLambda);
    notificationQueue.grantConsumeMessages(notificationWorkerLambda);
    notificationsTable.grantWriteData(notificationWorkerLambda);

    // API Gateway
    api.root.addMethod("GET", new apigateway.LambdaIntegration(helloFunction));
    users.addMethod("GET", new apigateway.LambdaIntegration(getUsersLambda));
    users.addMethod(
      "POST",
      new apigateway.LambdaIntegration(postUserLambda, {
        proxy: true,
      })
    );
    notifications.addMethod(
      "POST",
      new apigateway.LambdaIntegration(postNotificationLambda, {
        proxy: true,
      })
    );
  }
}
