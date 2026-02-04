module github.com/mattermost/mattermost-plugin-aws-explorer

go 1.23

require (
	github.com/aws/aws-sdk-go-v2 v1.32.5
	github.com/aws/aws-sdk-go-v2/config v1.29.0
	github.com/aws/aws-sdk-go-v2/service/costexplorer v1.33.0
	github.com/aws/aws-sdk-go-v2/service/ec2 v1.162.0
	github.com/aws/aws-sdk-go-v2/service/ecs v1.56.1
	github.com/aws/aws-sdk-go-v2/service/elasticfilesystem v1.47.1
	github.com/aws/aws-sdk-go-v2/service/elasticloadbalancing v1.42.2
	github.com/aws/aws-sdk-go-v2/service/lambda v1.60.0
	github.com/aws/aws-sdk-go-v2/service/rds v1.89.0
	github.com/aws/aws-sdk-go-v2/service/s3 v1.64.0
	github.com/aws/aws-sdk-go-v2/service/sts v1.31.1
	github.com/gorilla/mux v1.8.1
	github.com/mattermost/mattermost/server/v8 v8.0.0
	github.com/pkg/errors v0.9.1
)

require (
	github.com/aws/aws-sdk-go-v2/credentials v1.17.46
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.16.19
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.3.24
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.6.24
	github.com/aws/aws-sdk-go-v2/internal/ini v1.8.1
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.12.1
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.12.7
	github.com/aws/smithy-go v1.22.1
	github.com/golang/mock v1.6.0
	github.com/hashicorp/errwrap v1.1.0
	github.com/hashicorp/go-multierror v1.1.1
	github.com/jmespath/go-jmespath v0.4.0
)
