import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DatabaseStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Retrieve the RDS password from environment variables
        const rdsPassword = process.env.AWS_RDS_PASSWORD;
        if (!rdsPassword) {
            throw new Error('Environment variable AWS_RDS_PASSWORD is not set.');
        }

        // Reference to the existing VPC
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
            vpcName: 'OdooVPC',
        });

        // Security Group for RDS
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc,
            description: 'Allow traffic to RDS from within the VPC',
            allowAllOutbound: true, // Allow outbound traffic
        });

        dbSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(5432),
            'Allow PostgreSQL access from within the VPC',
        );

        // Create S3 bucket for backups
        const backupBucket = new s3.Bucket(this, 'BackupBucket', {
            bucketName: `odoo-rds-backups-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Retain backups even if the stack is deleted
        });

        // IAM Role for RDS to write to S3
        const rdsS3Role = new iam.Role(this, 'RdsS3BackupRole', {
            assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
            description: 'Role for RDS to access S3 bucket for backups',
        });

        // Grant the role write access to the bucket
        backupBucket.grantWrite(rdsS3Role);

        // RDS Instance
        const dbInstance = new rds.DatabaseInstance(this, 'OdooDatabase', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14, // Choose the PostgreSQL version
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MICRO,
            ), // Choose instance size
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Private subnets
            },
            securityGroups: [dbSecurityGroup],
            multiAz: false, // Set to true for high availability
            allocatedStorage: 20, // Storage in GB
            storageType: rds.StorageType.GP2,
            backupRetention: cdk.Duration.days(7), // Retain backups for 7 days
            deletionProtection: false, // Set to true in production to prevent accidental deletion
            databaseName: 'odoodb', // Initial database name
            credentials: rds.Credentials.fromPassword('odoo_admin', cdk.SecretValue.plainText(rdsPassword)), // Use the password from the environment variable
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the DB when the stack is destroyed

            // Associate the IAM role with the RDS instance
            iamAuthentication: true,
        });

        // Outputs
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: dbInstance.dbInstanceEndpointAddress,
            description: 'The endpoint of the RDS database',
        });

        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: dbInstance.secret?.secretArn ?? 'No secret created',
            description: 'The ARN of the database secret in Secrets Manager',
        });

        new cdk.CfnOutput(this, 'BackupBucketName', {
            value: backupBucket.bucketName,
            description: 'The name of the S3 bucket for RDS backups',
        });
    }
}
