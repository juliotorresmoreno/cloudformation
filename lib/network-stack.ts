import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Retrieve SSH_IP from environment variables
        const sshIp = process.env.SSH_IP || '0.0.0.0/0'; // Default to allow all if not specified

        // Create the VPC
        const vpc = new ec2.Vpc(this, 'OdooVPC', {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    name: 'PublicSubnet',
                    cidrMask: 24,
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    name: 'PrivateSubnet',
                    cidrMask: 24,
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        // Add tags to identify the VPC
        cdk.Tags.of(vpc).add('Name', 'OdooVPC');

        // Security Groups
        // Security Group for public resources (EC2, Load Balancer, etc.)
        const publicSecurityGroup = new ec2.SecurityGroup(this, 'PublicSecurityGroup', {
            vpc,
            description: 'Allow HTTP, HTTPS, and SSH traffic',
            allowAllOutbound: true, // Allow outbound traffic
        });

        // Allow SSH from the specified IP
        publicSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(sshIp),
            ec2.Port.tcp(22),
            'Allow SSH traffic from the specified IP'
        );

        publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');

        // Security Group for private resources (Database, etc.)
        const privateSecurityGroup = new ec2.SecurityGroup(this, 'PrivateSecurityGroup', {
            vpc,
            description: 'Allow traffic from the VPC',
            allowAllOutbound: true, // Allow outbound traffic
        });

        privateSecurityGroup.addIngressRule(
            publicSecurityGroup,
            ec2.Port.tcp(5432),
            'Allow traffic from public resources to PostgreSQL'
        ); // Port 5432 for PostgreSQL

        // Outputs
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'ID of the VPC created for Odoo',
        });

        new cdk.CfnOutput(this, 'PublicSecurityGroupId', {
            value: publicSecurityGroup.securityGroupId,
            description: 'ID of the Public Security Group',
        });

        new cdk.CfnOutput(this, 'PrivateSecurityGroupId', {
            value: privateSecurityGroup.securityGroupId,
            description: 'ID of the Private Security Group',
        });
    }
}
