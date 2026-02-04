# AWS Resources and Costs Explorer Plugin - Test Suite

## Overview

This document describes the test suite for the AWS Resources and Costs Explorer plugin.

## Test Structure

### Backend Tests (Go)

#### Server AWS Package Tests (`server/aws/`)

- **client_test.go**: Tests for AWS client initialization and configuration
  - `TestNewClient`: Validates client creation with various credential configurations
  - `TestClientGetters`: Verifies all AWS service client getters return non-nil clients

- **costs_test.go**: Tests for cost calculation logic
  - `TestCalculateDelta`: Comprehensive tests for delta percentage calculations
  - `TestCalculateDeltaEdgeCases`: Edge cases for delta calculations
  - Tests cover: increase, decrease, neutral, zero values, and percentage calculations

- **resources_test.go**: Tests for resource type definitions
  - `TestEC2Instance`: EC2 instance structure validation
  - `TestS3Bucket`: S3 bucket structure validation
  - `TestLambdaFunction`: Lambda function structure validation
  - `TestRDSInstance`: RDS instance structure validation
  - `TestECSCluster`: ECS cluster structure validation

#### Server API Package Tests (`server/api/`)

- **api_test.go**: Unit tests for API handlers
  - `TestErrorResponse`: Validates error response formatting for different error types
  - `TestSetResponseHeader`: Tests header setting functionality
  - `TestJSONBytesResponse`: Tests JSON response formatting
  - `TestRegisterRoutes`: Verifies route registration

- **api_integration_test.go**: Integration tests for API endpoints
  - `TestHandleGetAWSResourcesIntegration`: End-to-end tests for `/aws/resources` endpoint
  - `TestHandleGetAWSCostsIntegration`: End-to-end tests for `/aws/costs` endpoint
  - `TestAPIRouting`: Tests route registration and HTTP method validation

#### Server Model Tests (`server/model/`)

- **types_test.go**: Tests for data model types
  - `TestResourceGroup`: Resource group structure and serialization
  - `TestResource`: Individual resource structure and serialization
  - `TestCostData`: Cost data structure, serialization, and edge cases
  - `TestCostDataEdgeCases`: Edge cases for cost data (zero costs, large deltas)

#### Server Configuration Tests (`server/`)

- **configuration_test.go**: Tests for plugin configuration
  - `TestConfigurationClone`: Verifies configuration cloning creates independent copies
  - `TestConfiguration`: Various configuration states (full, empty, partial)

### Frontend Tests (TypeScript/React)

#### AWS Components Tests (`webapp/src/components/awsRHS/`)

- **costCard.test.tsx**: Tests for CostCard component
  - Rendering with different delta types (increase, decrease, neutral)
  - Currency formatting for various amounts
  - CSS class application based on delta type
  - Decimal precision handling

- **costSection.test.tsx**: Tests for CostSection component
  - Rendering with multiple cost entries
  - Empty state handling
  - Proper rendering of child CostCard components

- **resourceSection.test.tsx**: Tests for ResourceSection component
  - Rendering resource groups with multiple resources
  - Empty state handling
  - Service count display
  - Resource details (ID, type, state) rendering
  - Service icon display

- **awsResourcesRHS.test.tsx**: Tests for main AWS Resources RHS component
  - Loading state display
  - Data fetching and display
  - Error state and retry functionality
  - Handling of partial API failures
  - Empty data handling

#### Type Definition Tests (`webapp/src/blocks/`)

- **aws.test.ts**: Tests for TypeScript type definitions
  - `Resource` interface: All fields, optional fields, complex details
  - `ResourceGroup` interface: Groups with multiple resources, empty groups
  - `CostData` interface: All delta types, zero costs, large values, floating point precision

## Running Tests

### Backend Tests

From the project root:

```bash
# Run all Go tests
go test ./server/...

# Run tests with coverage
go test -cover ./server/...

# Run tests with verbose output
go test -v ./server/...

# Run specific package tests
go test ./server/aws/
go test ./server/api/
go test ./server/model/
```

### Frontend Tests

From the webapp directory:

```bash
# Install test dependencies (if not already installed)
cd webapp
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest identity-obj-proxy

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- costCard.test.tsx
```

## Test Coverage

### Backend Coverage Goals

- **AWS Client Package**: ~80% coverage
  - Client initialization: 100%
  - Service getters: 100%
  - Note: Actual AWS API calls are not tested (require mocked AWS services)

- **Costs Package**: ~90% coverage
  - Delta calculation logic: 100%
  - Edge cases: 100%

- **Resources Package**: ~100% coverage
  - All type definitions tested

- **API Package**: ~70% coverage
  - Error handling: 100%
  - Response formatting: 100%
  - Route registration: 100%

- **Model Package**: ~95% coverage
  - Type definitions: 100%
  - Serialization/deserialization: 100%

### Frontend Coverage Goals

- **Components**: ~75% coverage
  - CostCard: 90%
  - CostSection: 80%
  - ResourceSection: 75%
  - AWSResourcesRHS: 70%

- **Type Definitions**: ~100% coverage
  - All interfaces and type definitions tested

## Testing Best Practices

### Backend Tests

1. **Table-Driven Tests**: Used for testing multiple scenarios (e.g., `calculateDelta`)
2. **Mock Objects**: Used for AWS client and plugin interface mocking
3. **HTTP Testing**: Uses `httptest` for HTTP handler testing
4. **Assertion Library**: Uses `testify/assert` for clear assertions

### Frontend Tests

1. **Component Testing**: Tests components in isolation with mocked dependencies
2. **User Interaction Testing**: Uses `@testing-library/user-event` for interaction testing
3. **Mocking**: Mocks external dependencies (API clients, intl)
4. **Semantic Testing**: Tests what users see, not implementation details

## Adding New Tests

When adding new features:

1. **Backend**: Add tests in the same package as the implementation (`*_test.go`)
2. **Frontend**: Add test files next to components (`*.test.tsx`)
3. **Follow Existing Patterns**: Use table-driven tests for multiple scenarios
4. **Test Error Cases**: Always test error handling and edge cases
5. **Update Documentation**: Add test descriptions to this README

## Continuous Integration

Tests should be configured to run in CI:

```yaml
# Example GitHub Actions workflow
- name: Run Go tests
  run: go test ./server/... -cover

- name: Run frontend tests
  run: cd webapp && npm test -- --coverage
```

## Known Limitations

1. **AWS SDK Integration**: Actual AWS API calls are not tested in unit tests
2. **Integration Tests**: Limited integration testing with real Mattermost instance
3. **E2E Tests**: No end-to-end browser tests currently implemented

## Future Improvements

1. Add AWS SDK mock implementations for testing resource retrieval
2. Add integration tests with a test Mattermost server
3. Add visual regression tests for UI components
4. Add performance tests for large resource sets
5. Increase overall test coverage to 90%+
