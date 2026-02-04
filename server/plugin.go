// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"net/http"
	"sync"

	"github.com/gorilla/mux"

	"github.com/mattermost/mattermost-plugin-aws-explorer/server/api"
	"github.com/mattermost/mattermost-plugin-aws-explorer/server/aws"

	"github.com/mattermost/mattermost/server/public/plugin"
)

type Plugin struct {
	plugin.MattermostPlugin

	configurationLock sync.RWMutex
	configuration     *configuration

	server *plugin.API
	logger *plugin.Logger

	awsClient *aws.Client
	api       *api.API
}

func (p *Plugin) OnActivate() error {
	p.server = p.API
	p.logger = &p.Logger

	if err := p.OnConfigurationChange(); err != nil {
		return err
	}

	p.api = api.NewAPI(p)

	return nil
}

func (p *Plugin) OnDeactivate() error {
	p.awsClient = nil
	return nil
}

func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	router := mux.NewRouter()
	p.api.RegisterRoutes(router)
	router.ServeHTTP(w, r)
}

func (p *Plugin) GetAWSResources() ([]interface{}, error) {
	config := p.getConfiguration()

	client, err := aws.NewClient(config.AWSRegion, config.AWSAccessKeyID, config.AWSSecretAccessKey)
	if err != nil {
		return nil, err
	}

	if err := client.VerifyCredentials(); err != nil {
		return nil, err
	}

	resources, err := client.GetAllResources()
	if err != nil {
		return nil, err
	}

	var result []interface{}
	for _, r := range resources {
		result = append(result, r)
	}

	return result, nil
}

func (p *Plugin) GetAWSCosts() ([]interface{}, error) {
	config := p.getConfiguration()

	client, err := aws.NewClient(config.AWSRegion, config.AWSAccessKeyID, config.AWSSecretAccessKey)
	if err != nil {
		return nil, err
	}

	if err := client.VerifyCredentials(); err != nil {
		return nil, err
	}

	costs, err := client.GetCosts()
	if err != nil {
		return nil, err
	}

	var result []interface{}
	for _, c := range costs {
		result = append(result, c)
	}

	return result, nil
}
