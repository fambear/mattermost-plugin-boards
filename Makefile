.PHONY: prebuild clean cleanall ci server server-linux server-mac server-win server-linux-package generate watch-server webapp dist bundle

PACKAGE_FOLDER = aws-explorer

# Build Flags
BUILD_NUMBER ?= $(BUILD_NUMBER:)
BUILD_DATE = $(shell date -u)
BUILD_HASH = $(shell git rev-parse HEAD)
ifeq ($(BUILD_NUMBER),)
	BUILD_NUMBER := dev
	BUILD_DATE := n/a
endif

MM_SERVER_PATH ?= $(MM_SERVER_PATH:)
ifeq ($(MM_SERVER_PATH),)
	MM_SERVER_PATH := ../mattermost
endif

BUILD_TAGS += json1 sqlite3

LDFLAGS += -X "github.com/mattermost/mattermost-plugin-aws-explorer/server/model.BuildNumber=$(BUILD_NUMBER)"
LDFLAGS += -X "github.com/mattermost/mattermost-plugin-aws-explorer/server/model.BuildDate=$(BUILD_DATE)"
LDFLAGS += -X "github.com/mattermost/mattermost-plugin-aws-explorer/server/model.BuildHash=$(BUILD_HASH)"

GO ?= $(shell command -v go 2> /dev/null)
NPM ?= $(shell command -v npm 2> /dev/null)
MM_DEBUG ?=
MANIFEST_FILE ?= plugin.json
GOPATH ?= $(shell go env GOPATH)
GO_TEST_FLAGS ?= -race
GO_BUILD_FLAGS ?= -ldflags '$(LDFLAGS)'
MM_UTILITIES_DIR ?= ../mattermost-utilities
DLV_DEBUG_PORT := 2346
MATTERMOST_PLUGINS_PATH=$(MM_SERVER_PATH)/plugins
AWS_PLUGIN_PATH=$(MATTERMOST_PLUGINS_PATH)/aws-explorer
PLUGIN_NAME=aws-explorer

export GO111MODULE=on

ASSETS_DIR ?= assets

RACE = -race

.PHONY: default
default: all

# Verify environment, and define PLUGIN_ID, PLUGIN_VERSION, HAS_SERVER and HAS_WEBAPP as needed.
include build/setup.mk

BUNDLE_NAME ?= $(PLUGIN_NAME)-$(PLUGIN_VERSION).tar.gz

# Include custom makefile, if present
ifneq ($(wildcard build/custom.mk),)
	include build/custom.mk
endif

.PHONY: all
all: check-style test dist

.PHONY: apply
apply:
	./build/bin/manifest apply

.PHONY: check-style
check-style: webapp/node_modules
	@echo Checking for style guide compliance

ifneq ($(HAS_WEBAPP),)
	cd webapp && npm run check
	cd webapp && npm run check-types
endif

ifneq ($(HAS_SERVER),)
	@if ! [ -x "$$(command -v golangci-lint)" ]; then \
		echo "golangci-lint is not installed. Please see https://github.com/golangci/golangci-lint#install-golang-ci-lint for installation instructions."; \
		exit 1; \
	fi; \
	cd server && golangci-lint run ./...
endif

.PHONY: server
server:
ifneq ($(HAS_SERVER),)
	mkdir -p server/dist;
ifeq ($(MM_DEBUG),)
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-linux-amd64;
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=arm64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-linux-arm64;
	cd server && env CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-darwin-amd64;
	cd server && env CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-darwin-arm64;
	cd server && env CGO_ENABLED=0 GOOS=windows GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-windows-amd64.exe;
else
	$(info DEBUG mode is on; to disable, unset MM_DEBUG)
	cd server && env CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-darwin-amd64;
	cd server && env CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-darwin-arm64;
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-linux-amd64;
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=arm64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-linux-arm64;
	cd server && env CGO_ENABLED=0 GOOS=windows GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-windows-amd64.exe;
endif
endif

.PHONY: server-linux
server-linux:
ifneq ($(HAS_SERVER),)
	mkdir -p server/dist;
ifeq ($(MM_DEBUG),)
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -trimpath -o dist/plugin-linux-amd64;
else
	$(info DEBUG mode is on; to disable, unset MM_DEBUG)
	cd server && env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build $(GO_BUILD_FLAGS) -gcflags "all=-N -l" -trimpath -o dist/plugin-linux-amd64;
endif
endif

webapp/node_modules: $(wildcard webapp/package.json)
ifneq ($(HAS_WEBAPP),)
	cd webapp && $(NPM) install
	touch $@
endif

.PHONY: webapp
webapp: webapp/node_modules
ifneq ($(HAS_WEBAPP),)
ifeq ($(MM_DEBUG),)
	cd webapp && $(NPM) run build;
else
	cd webapp && $(NPM) run debug;
endif
endif
	cd webapp; npm run pack

.PHONY: bundle
bundle:
	rm -rf dist/
	mkdir -p dist/$(PLUGIN_NAME)
	cp $(MANIFEST_FILE) dist/$(PLUGIN_NAME)/
	cp -r webapp/pack dist/$(PLUGIN_NAME)/
ifneq ($(wildcard LICENSE.txt),)
	cp -r LICENSE.txt dist/$(PLUGIN_NAME)/
endif
ifneq ($(wildcard NOTICE.txt),)
	cp -r NOTICE.txt dist/$(PLUGIN_NAME)/
endif
ifneq ($(wildcard $(ASSETS_DIR)/.),)
	cp -r $(ASSETS_DIR) dist/$(PLUGIN_NAME)/
endif
ifneq ($(HAS_PUBLIC),)
	cp -r public dist/$(PLUGIN_NAME)/public/
endif
ifneq ($(HAS_SERVER),)
	mkdir -p dist/$(PLUGIN_NAME)/server
	cp -r server/dist dist/$(PLUGIN_NAME)/server/
endif
ifneq ($(HAS_WEBAPP),)
	mkdir -p dist/$(PLUGIN_NAME)/webapp
	cp -r webapp/dist dist/$(PLUGIN_NAME)/webapp/
endif
	cd dist && tar -cvzf $(BUNDLE_NAME) $(PLUGIN_NAME)

	@echo plugin built at: dist/$(BUNDLE_NAME)

.PHONY: dist
dist:	apply server webapp bundle

.PHONY: dist-linux
dist-linux:	apply server-linux webapp bundle

.PHONY: deploy
deploy: dist
	./build/bin/pluginctl deploy $(PLUGIN_ID) dist/$(BUNDLE_NAME)

.PHONY: watch
watch: apply server bundle
ifeq ($(MM_DEBUG),)
	cd webapp && $(NPM) run build:watch
else
	cd webapp && $(NPM) run debug:watch
endif

.PHONY: deploy-from-watch
deploy-from-watch: bundle
	./build/bin/pluginctl deploy $(PLUGIN_ID) dist/$(BUNDLE_NAME)

.PHONY: setup-attach
setup-attach:
	$(eval PLUGIN_PID := $(shell ps aux | grep "plugins/${PLUGIN_ID}" | grep -v "grep" | awk -F " " '{print $$2}'))
	$(eval NUM_PID := $(shell echo -n ${PLUGIN_PID} | wc -w))

	@if [ ${NUM_PID} -gt 2 ]; then \
		echo "** There is more than 1 plugin process running. Run 'make kill reset' to restart just one."; \
		exit 1; \
	fi

.PHONY: check-attach
check-attach:
	@if [ -z ${PLUGIN_PID} ]; then \
		echo "Could not find plugin PID; the plugin is not running. Exiting."; \
		exit 1; \
	else \
		echo "Located Plugin running with PID: ${PLUGIN_PID}"; \
	fi

.PHONY: attach
attach: setup-attach check-attach
	dlv attach ${PLUGIN_PID}

.PHONY: attach-headless
attach-headless: setup-attach check-attach
	dlv attach ${PLUGIN_PID} --listen :$(DLV_DEBUG_PORT) --headless=true --api-version=2 --accept-multiclient

.PHONY: detach
detach: setup-attach
	@DELVE_PID=$(shell ps aux | grep "dlv attach ${PLUGIN_PID}" | grep -v "grep" | awk -F " " '{print $$2}') && \
	if [ "$$DELVE_PID" -gt 0 ] > /dev/null 2>&1 ; then \
		echo "Located existing delve process running with PID: $$DELVE_PID. Killing." ; \
		kill -9 $$DELVE_PID ; \
	fi

.PHONY: test
test: webapp/node_modules
ifneq ($(HAS_SERVER),)
	$(GO) test -v $(GO_TEST_FLAGS) ./server/...
endif
ifneq ($(HAS_WEBAPP),)
	cd webapp && $(NPM) run test;
endif

.PHONY: coverage
coverage: webapp/node_modules
ifneq ($(HAS_SERVER),)
	$(GO) test $(GO_TEST_FLAGS) -coverprofile=server/coverage.txt ./server/...
	$(GO) tool cover -html=server/coverage.txt
endif

.PHONY: i18n-extract
i18n-extract:
ifneq ($(HAS_WEBAPP),)
ifeq ($(HAS_MM_UTILITIES),)
	@echo "You must clone github.com/mattermost/mattermost-utilities repo in .. to use this command"
else
	cd $(MM_UTILITIES_DIR) && npm install && npm run babel && node mmjstool/build/index.js i18n extract-webapp --webapp-dir $(PWD)/webapp
endif
endif

.PHONY: disable
disable: detach
	./build/bin/pluginctl disable $(PLUGIN_ID)

.PHONY: enable
enable:
	./build/bin/pluginctl enable $(PLUGIN_ID)

.PHONY: reset
reset: detach
	./build/bin/pluginctl reset $(PLUGIN_ID)

.PHONY: kill
kill: detach
	$(eval PLUGIN_PID := $(shell ps aux | grep "plugins/${PLUGIN_ID}" | grep -v "grep" | awk -F " " '{print $$2}'))

	@for PID in ${PLUGIN_PID}; do \
		echo "Killing plugin pid $$PID"; \
		kill -9 $$PID; \
	done;

.PHONY: clean
clean:
	rm -rf bin
	rm -rf dist
	rm -rf webapp/pack
ifneq ($(HAS_SERVER),)
	rm -fr server/coverage.txt
	rm -fr server/dist
endif
ifneq ($(HAS_WEBAPP),)
	rm -fr webapp/junit.xml
	rm -fr webapp/dist
	rm -fr webapp/node_modules
endif
	rm -fr build/bin/

.PHONY: live-watch
live-watch:
	make -j2 live-watch-server live-watch-webapp

.PHONY: live-watch-server
live-watch-server: apply
	cd ../ && modd -f mattermost-plugin/modd.conf

.PHONY: live-watch-webapp
live-watch-webapp: apply
	cd webapp && $(NPM) run live-watch

.PHONY: deploy-to-mattermost-directory
deploy-to-mattermost-directory:
	./build/bin/pluginctl disable $(PLUGIN_ID)
	mkdir -p $(AWS_PLUGIN_PATH)
	cp $(MANIFEST_FILE) $(AWS_PLUGIN_PATH)/
	cp -r webapp/pack $(AWS_PLUGIN_PATH)/
	cp -r $(ASSETS_DIR) $(AWS_PLUGIN_PATH)/
	cp -r public $(AWS_PLUGIN_PATH)/
	mkdir -p $(AWS_PLUGIN_PATH)/server
	cp -r server/dist $(AWS_PLUGIN_PATH)/server/
	mkdir -p $(AWS_PLUGIN_PATH)/webapp
	cp -r webapp/dist $(AWS_PLUGIN_PATH)/webapp/
	./build/bin/pluginctl enable $(PLUGIN_ID)
	@echo plugin built at: $(AWS_PLUGIN_PATH)

.PHONY: help
help:
	@cat Makefile build/*.mk | grep -v '\.PHONY' |  grep -v '\help:' | grep -B1 -E '^[a-zA-Z0-9_.-]+:.*' | sed -e "s/:.*//" | sed -e "s/^## //" |  grep -v '\-\-' | sed '1!G;h;$$!d' | awk 'NR%2{printf "\033[36m%-30s\033[0m",$$0;next;}1' | sort

ifeq ($(OS),Windows_NT)
	RACE := ''
endif

all: webapp server

prebuild:
	cd webapp; npm install

ci: webapp-ci

generate:
	cd server; go install github.com/golang/mock/mockgen@v1.6.0
	cd server; go generate ./...

server-ci: server-lint

server-lint:
	@if ! [ -x "$$(command -v golangci-lint)" ]; then \
		echo "golangci-lint is not installed. Please see https://github.com/golangci/golangci-lint#install-golang-ci-lint for installation instructions."; \
		exit 1; \
	fi;
	cd server; golangci-lint run ./...

webapp-ci:
	cd webapp; npm run check
	cd webapp; npm run test
	cd webapp; npm run check-types

webapp-test:
	cd webapp; npm run test
