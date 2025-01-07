import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';

export class EfsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Reference to the existing VPC
        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', {
            vpcName: 'OdooVPC',
        });

        // Security Group for EFS
        const efsSecurityGroup = new ec2.SecurityGroup(this, 'EfsSecurityGroup', {
            vpc,
            description: 'Allow NFS traffic for EFS',
            allowAllOutbound: true, // Allow outbound traffic
        });

        // Allow inbound NFS traffic (port 2049) from the VPC
        efsSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(2049),
            'Allow NFS traffic from within the VPC'
        );

        // Create the EFS file system
        const fileSystem = new efs.FileSystem(this, 'OdooEFS', {
            vpc,
            securityGroup: efsSecurityGroup,
            lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS, // Move to IA after 30 days
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            throughputMode: efs.ThroughputMode.BURSTING,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For testing purposes
        });

        // Create an Access Point for the EFS
        const accessPoint = fileSystem.addAccessPoint('DefaultAccessPoint', {
            path: '/mnt/efs',
            createAcl: {
                ownerGid: '1000',
                ownerUid: '1000',
                permissions: '755',
            },
            posixUser: {
                uid: '1000',
                gid: '1000',
            },
        });

        // Output the file system ID
        new cdk.CfnOutput(this, 'FileSystemId', {
            value: fileSystem.fileSystemId,
            description: 'The ID of the EFS file system',
        });

        // Output the security group ID for EFS
        new cdk.CfnOutput(this, 'EfsSecurityGroupId', {
            value: efsSecurityGroup.securityGroupId,
            description: 'The ID of the Security Group for EFS',
        });

        // Output the Access Point ID
        new cdk.CfnOutput(this, 'AccessPointId', {
            value: accessPoint.accessPointId,
            description: 'The ID of the Access Point for EFS',
        });
    }
}
