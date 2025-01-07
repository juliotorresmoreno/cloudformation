#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { S3Stack } from '../lib/s3-stack';
import { EfsStack } from '../lib/efs-stack';
import { ComputeStack } from '../lib/compute-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App({
    analyticsReporting: true,
});
let _: unknown;
_ = new NetworkStack(app, 'NetworkStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    }
});

_ = new S3Stack(app, 'S3Stack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

_ = new DatabaseStack(app, 'DatabaseStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

_ = new EfsStack(app, 'EfsStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

_ = new ComputeStack(app, 'ComputeStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});