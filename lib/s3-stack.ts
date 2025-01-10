import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class S3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const uniqueBucketName = `odoo-bucket-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`;

        // Create the S3 bucket
        const s3Bucket = new s3.Bucket(this, 'OdooBucket', {
            bucketName: uniqueBucketName,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            lifecycleRules: [
                {
                    id: 'MoveOldVersionsToGlacier',
                    noncurrentVersionTransitions: [
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(30),
                        },
                    ],
                },
            ],
        });

        new cdk.CfnOutput(this, 'BucketName', {
            value: s3Bucket.bucketName,
            description: 'The name of the S3 bucket',
            exportName: 'BucketName'
        });
    }
}
