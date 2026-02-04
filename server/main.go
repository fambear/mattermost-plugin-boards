// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	_ "net/http/pprof"

	"github.com/mattermost/mattermost/server/public/plugin"
)

func main() {
	plugin.ClientMain(&Plugin{})
}
