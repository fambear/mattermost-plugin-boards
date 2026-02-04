// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"context"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer/types"

	"github.com/mattermost/mattermost-plugin-aws-explorer/server/model"
)

type CostResult struct {
	Service   string
	Amount    float64
	Delta     float64
	DeltaType string
}

func (c *Client) GetCosts() ([]model.CostData, error) {
	client := c.GetCostExplorerClient()

	now := time.Now().UTC()

	lastMonthStart := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.UTC)
	lastMonthEnd := lastMonthStart.AddDate(0, 1, -1)

	prevMonthStart := lastMonthStart.AddDate(0, -1, 0)
	prevMonthEnd := lastMonthEnd.AddDate(0, -1, 0)

	lastMonthCosts, err := c.getCostsForPeriod(client, lastMonthStart, lastMonthEnd)
	if err != nil {
		return nil, err
	}

	prevMonthCosts, err := c.getCostsForPeriod(client, prevMonthStart, prevMonthEnd)
	if err != nil {
		return nil, err
	}

	var results []model.CostData

	for service, currentAmount := range lastMonthCosts {
		prevAmount := prevMonthCosts[service]
		delta, deltaType := calculateDelta(currentAmount, prevAmount)

		results = append(results, model.CostData{
			Service:   service,
			Amount:    currentAmount,
			Delta:     delta,
			DeltaType: deltaType,
		})
	}

	return results, nil
}

func (c *Client) getCostsForPeriod(client *costexplorer.Client, start, end time.Time) (map[string]float64, error) {
	endPlusOne := end.AddDate(0, 0, 1)

	resp, err := client.GetCostAndUsage(context.TODO(), &costexplorer.GetCostAndUsageInput{
		TimePeriod: &types.DateInterval{
			Start: aws.String(start.Format("2006-01-02")),
			End:   aws.String(endPlusOne.Format("2006-01-02")),
		},
		Granularity: types.GranularityMonthly,
		Metrics:     []string{"BlendedCost"},
		GroupBy: []types.GroupDefinition{
			{
				Key:  aws.String("SERVICE"),
				Type: types.GroupDefinitionTypeDimension,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	costs := make(map[string]float64)

	for _, result := range resp.ResultsByTime {
		for _, group := range result.Groups {
			if len(group.Keys) == 0 {
				continue
			}

			service := aws.ToString(group.Keys[0])
			metric := group.Metrics["BlendedCost"]

			amount, _ := strconv.ParseFloat(aws.ToString(metric.Amount), 64)

			costs[service] = amount
		}
	}

	return costs, nil
}

func calculateDelta(current, previous float64) (float64, string) {
	if previous == 0 {
		if current == 0 {
			return 0, "neutral"
		}
		return 100, "increase"
	}

	delta := ((current - previous) / previous) * 100

	if delta > 0 {
		return delta, "increase"
	} else if delta < 0 {
		return -delta, "decrease"
	}
	return 0, "neutral"
}
