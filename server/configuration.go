// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const PluginName = "aws-explorer"

type configuration struct {
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSRegion          string
}

func (c *configuration) Clone() *configuration {
	var clone = *c
	return &clone
}

func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{}
	}

	return p.configuration
}

func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

func (p *Plugin) OnConfigurationChange() error {
	if p.server == nil {
		return nil
	}

	mmconfig := p.server.GetConfig()

	accessKeyID := ""
	if key, ok := mmconfig.PluginSettings.Plugins[PluginName]["awsaccesskeyid"].(string); ok {
		accessKeyID = key
	}

	secretKey := ""
	if secret, ok := mmconfig.PluginSettings.Plugins[PluginName]["awssecretaccesskey"].(string); ok {
		secretKey = secret
		p.logger.Debug("AWS secret key loaded from config", mlog.Int("keyLength", len(secretKey)))
	}

	region := "us-east-1"
	if r, ok := mmconfig.PluginSettings.Plugins[PluginName]["awsregion"].(string); ok && r != "" {
		region = r
	}

	configuration := &configuration{
		AWSAccessKeyID:     accessKeyID,
		AWSSecretAccessKey: secretKey,
		AWSRegion:          region,
	}

	p.setConfiguration(configuration)

	return nil
}
