import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ComputeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const sshIp = process.env.SSH_IP || '0.0.0.0/0';

        // Reference to the existing VPC
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
            vpcName: 'OdooVPC',
        });

        // Security Group for public resources (EC2, Load Balancer, etc.)
        const publicSecurityGroup = new ec2.SecurityGroup(this, 'PublicSecurityGroup', {
            vpc,
            description: 'Allow HTTP, HTTPS, and SSH traffic',
            allowAllOutbound: true, // Allow outbound traffic
        });

        publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        publicSecurityGroup.addIngressRule(ec2.Peer.ipv4(sshIp), ec2.Port.tcp(22), 'Allow SSH traffic');

        // IAM Role for EC2
        const ec2Role = new iam.Role(this, 'Ec2InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        // Attach policies to the role
        ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')); // Access S3
        ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSFullAccess')); // Access RDS
        ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticFileSystemFullAccess')); // Access EFS
        ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        const instance = new ec2.Instance(this, 'OdooInstance', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.latestAmazonLinux2(), // Use Amazon Linux AMI
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            securityGroup: publicSecurityGroup,
            role: ec2Role,
            keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'odoo-key-pair'),
        });

        // Output the public IP of the instance
        new cdk.CfnOutput(this, 'InstancePublicIp', {
            value: instance.instancePublicIp,
            description: 'Public IP of the EC2 instance',
        });
    }
}
