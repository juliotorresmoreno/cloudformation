import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';

export class HelloWorldBeanstalkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const appName = 'HelloWorldApp';
        const envName = 'HelloWorldEnv';
        const bucketName = 'odoo-bucket-905418239247-us-east-2'; // Tu bucket personalizado
        const s3Key = 'Dockerrun.aws.json'; // Ruta del archivo subido a S3

        // IAM Role for Elastic Beanstalk
        const ebRole = new iam.Role(this, 'ElasticBeanstalkRole', {
            assumedBy: new iam.ServicePrincipal('elasticbeanstalk.amazonaws.com'),
        });

        ebRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));

        // Elastic Beanstalk application
        const app = new elasticbeanstalk.CfnApplication(this, 'ElasticBeanstalkApp', {
            applicationName: appName,
        });

        // Elastic Beanstalk application version
        const appVersion = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
            applicationName: app.applicationName!,
            sourceBundle: {
                s3Bucket: bucketName,
                s3Key: s3Key,
            },
        });

        appVersion.addDependency(app); // Asegurar que la aplicación se crea antes de la versión

        // Elastic Beanstalk environment
        const env = new elasticbeanstalk.CfnEnvironment(this, 'ElasticBeanstalkEnv', {
            environmentName: envName,
            applicationName: app.applicationName!,
            solutionStackName: '64bit Amazon Linux 2 v4.0.6 running Docker',
            versionLabel: appVersion.ref, // Referencia a la versión de la aplicación
        });

        env.addDependency(appVersion); // Asegurar que el entorno se crea después de la versión
    }
}
