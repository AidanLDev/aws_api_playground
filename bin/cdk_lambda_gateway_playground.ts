#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CdkLambdaGatewayPlaygroundStack } from "../lib/cdk_lambda_gateway_playground-stack";

const app = new cdk.App();
new CdkLambdaGatewayPlaygroundStack(app, "CdkLambdaGatewayPlaygroundStack", {});
