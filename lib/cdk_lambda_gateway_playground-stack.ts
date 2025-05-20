import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class CdkLambdaGatewayPlaygroundStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloFunction = new NodejsFunction(this, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "hello.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
    });

    const api = new apigateway.RestApi(this, "aws_api_playground", {
      restApiName: "aws_api_playground",
      description: "An AWS API built with apigateway and Lambda",
    });

    api.root.addMethod("GET", new apigateway.LambdaIntegration(helloFunction));
  }
}
